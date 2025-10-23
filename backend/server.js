import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase, getUserState, createOrUpdateUserState, getAllUserStates, deleteUserState } from './database.js';
import { metricsMiddleware, getMetricsHandler } from './metrics.js';
import { initializePacketVerifier } from './packet-verifier.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const db = new Database(join(__dirname, 'audio-states.db'));

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== Middleware ====================

// CORS - Allow frontend to communicate with backend
app.use(cors());
app.use(express.json());

// ==================== SRE: Structured Request Logging ====================
// Purpose: Track API performance, error rates, and usage patterns
// Output: JSON format for easy parsing by log aggregation tools (CloudWatch, ELK, etc.)
// Metrics tracked: Response time, status codes, user activity, endpoint usage
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9); // Unique request ID for tracing
  
  // Attach request ID to request object for use in other middleware
  req.requestId = requestId;
  
  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Structured JSON log entry
    const logEntry = {
      // Timestamp in ISO format for consistency
      timestamp: new Date().toISOString(),
      
      // Request identification
      requestId: requestId,
      method: req.method,
      path: req.path,
      url: req.url,
      
      // Response information
      statusCode: res.statusCode,
      statusText: res.statusCode >= 200 && res.statusCode < 300 ? 'success' :
                  res.statusCode >= 400 && res.statusCode < 500 ? 'client_error' :
                  res.statusCode >= 500 ? 'server_error' : 'unknown',
      
      // Performance metrics
      duration: duration, // milliseconds
      durationSeconds: (duration / 1000).toFixed(3), // seconds with 3 decimal places
      
      // User tracking (if available)
      userId: req.params.userId || req.body?.userId || null,
      roomId: req.params.roomId || req.body?.roomId || null,
      
      // Client information
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      
      // Request size (useful for monitoring large payloads)
      contentLength: req.get('content-length') || 0,
      
      // SRE Alert Flags
      // These help quickly identify issues in log aggregation systems
      isError: res.statusCode >= 400,
      isSlowRequest: duration > 1000, // Flag requests slower than 1 second
      isCriticalEndpoint: req.path.includes('/mute') || req.path.includes('/device') // User Story endpoints
    };
    
    // Log to console in JSON format
    // In production, this would be sent to CloudWatch Logs or similar
    console.log(JSON.stringify(logEntry));
    
    // Additional error logging for failed requests
    if (res.statusCode >= 400) {
      console.error(JSON.stringify({
        level: 'ERROR',
        requestId: requestId,
        message: 'Request failed',
        statusCode: res.statusCode,
        path: req.path,
        method: req.method
      }));
    }
  });
  
  next();
});

// ==================== SRE: Metrics Collection ====================
// Track API performance, error rates, and user activity
app.use(metricsMiddleware);

// Initialize database
initDatabase();

// ==================== API Routes ====================

// SRE: Metrics endpoint - View system performance metrics
// Returns: API response times, error rates, concurrent users, system resources
app.get('/api/metrics', getMetricsHandler);

// Enhanced health check endpoint
// Purpose: Monitors server, database, and resource health
// Used by: AWS health checks, monitoring systems, deployment verification
app.get('/api/health', (req, res) => {
  try {
    // Check database connectivity by running a simple query
    const dbCheck = db.prepare('SELECT 1 as health').get();
    
    // Gather system metrics
    const uptime = process.uptime(); // Seconds since server started
    const memory = process.memoryUsage();
    
    res.json({ 
      status: 'ok', 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      database: {
        status: dbCheck ? 'connected' : 'error',
        type: 'SQLite',
        mode: 'WAL' // Write-Ahead Logging for better concurrency
      },
      memory: {
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`, // Resident Set Size
        external: `${Math.round(memory.external / 1024 / 1024)} MB`
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    // If health check fails, return 503 Service Unavailable
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Service unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all users states
app.get('/api/users', (req, res) => {
  try {
    const users = getAllUserStates();
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get specific user state
app.get('/api/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userState = getUserState(userId);
    
    if (!userState) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: userState
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user state'
    });
  }
});

// Create or update user state
app.post('/api/users/:userId/state', (req, res) => {
  try {
    const { userId } = req.params;
    const { username, isMuted, deviceId, deviceLabel, roomId } = req.body;
    
    // Validation
    if (typeof isMuted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isMuted must be a boolean'
      });
    }
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'username is required and must be a string'
      });
    }
    
    const userState = createOrUpdateUserState({
      userId,
      username,
      isMuted,
      deviceId: deviceId || null,
      deviceLabel: deviceLabel || null,
      roomId: roomId || null
    });
    
    res.json({
      success: true,
      message: 'User state updated',
      data: userState
    });
  } catch (error) {
    console.error('Error updating user state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user state'
    });
  }
});

// Update mute status only
app.patch('/api/users/:userId/mute', (req, res) => {
  try {
    const { userId } = req.params;
    const { isMuted } = req.body;
    
    if (typeof isMuted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isMuted must be a boolean'
      });
    }
    
    const currentState = getUserState(userId);
    if (!currentState) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Create user state first with POST /api/users/:userId/state'
      });
    }
    
    const userState = createOrUpdateUserState({
      userId,
      username: currentState.username,
      isMuted,
      deviceId: currentState.deviceId || null,
      deviceLabel: currentState.deviceLabel || null,
      roomId: currentState.roomId || null
    });
    
    res.json({
      success: true,
      message: 'Mute status updated',
      data: userState
    });
  } catch (error) {
    console.error('Error updating mute status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update mute status'
    });
  }
});

// Update device only
app.patch('/api/users/:userId/device', (req, res) => {
  try {
    const { userId } = req.params;
    const { deviceId, deviceLabel } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId is required'
      });
    }
    
    const currentState = getUserState(userId);
    if (!currentState) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Create user state first with POST /api/users/:userId/state'
      });
    }
    
    const userState = createOrUpdateUserState({
      userId,
      username: currentState.username,
      isMuted: currentState?.isMuted || false,
      deviceId,
      deviceLabel: deviceLabel || null,
      roomId: currentState?.roomId || null
    });
    
    res.json({
      success: true,
      message: 'Device updated',
      data: userState
    });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update device'
    });
  }
});

// Update mute verification status (User Story 1: Hardware verification)
app.patch('/api/users/:userId/verify', (req, res) => {
  try {
    const { userId } = req.params;
    const { verifiedMuted } = req.body;
    
    // Validate verifiedMuted is boolean
    if (typeof verifiedMuted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'verifiedMuted must be a boolean'
      });
    }
    
    const currentState = getUserState(userId);
    if (!currentState) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Create user state first with POST /api/users/:userId/state'
      });
    }
    
    const userState = createOrUpdateUserState({
      userId,
      username: currentState.username,
      isMuted: currentState.isMuted,
      verifiedMuted,  // Update only verification status
      deviceId: currentState.deviceId,
      deviceLabel: currentState.deviceLabel,
      roomId: currentState.roomId
    });
    
    res.json({
      success: true,
      message: 'Mute verification status updated',
      data: userState
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update verification status'
    });
  }
});

// Get packet verification status (backend-side audio inspection)
// This endpoint retrieves the verification result from packet analysis
// Note: Requires active WebSocket audio streaming to have recent data
app.get('/api/users/:userId/packet-verification', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Note: packetVerifier will be initialized after server.listen()
    // For now, return placeholder response
    // This will be updated once WebSocket is streaming
    
    res.json({
      success: true,
      message: 'Packet verification status',
      data: {
        userId,
        hasActiveStream: false,  // Updated by WebSocket handler
        packetVerifiedMuted: null,  // null = no data yet
        lastVerified: null,
        note: 'Start WebSocket audio streaming to enable packet verification'
      }
    });
  } catch (error) {
    console.error('Error getting packet verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get packet verification status'
    });
  }
});

// Delete user state
app.delete('/api/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const deleted = deleteUserState(userId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User state deleted'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user state'
    });
  }
});

// Get users by room
app.get('/api/rooms/:roomId/users', (req, res) => {
  try {
    const { roomId } = req.params;
    const allUsers = getAllUserStates();
    const roomUsers = allUsers.filter(user => user.roomId === roomId);
    
    res.json({
      success: true,
      roomId,
      count: roomUsers.length,
      data: roomUsers
    });
  } catch (error) {
    console.error('Error fetching room users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room users'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('==========================================');
  console.log('🚀 Zoom Demo Backend Server');
  console.log('==========================================');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ API available at http://localhost:${PORT}/api`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ WebSocket audio stream: ws://localhost:${PORT}/audio-stream`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('==========================================');
});

// ==================== Packet Verification System ====================
// Purpose: Backend-side audio verification via packet inspection
// Provides second independent verification method (in addition to Web Audio API)
//
// How it works:
// 1. Frontend streams raw audio samples via WebSocket
// 2. Backend analyzes samples for silence/audio presence
// 3. Verification result stored in database (verifiedMuted field)
//
// This satisfies User Story 1 requirement for "hardware level verification"
// by inspecting actual audio data packets, not just trusting frontend
const packetVerifier = initializePacketVerifier(server);

// ==================== SRE: Graceful Shutdown ====================
// Purpose: Handle server shutdown gracefully to prevent data loss and connection errors
// Triggered by: SIGTERM (AWS ECS/Fargate), SIGINT (Ctrl+C), process crashes
// 
// What happens during graceful shutdown:
// 1. Stop accepting new connections
// 2. Finish processing existing requests (with timeout)
// 3. Close database connections cleanly
// 4. Exit with proper status code

let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log('Already shutting down, forcing exit...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'shutdown_initiated',
    signal: signal,
    message: 'Graceful shutdown initiated'
  }));
  
  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        event: 'shutdown_error',
        message: 'Error during server shutdown',
        error: err.message
      }));
      process.exit(1);
    }
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'server_closed',
      message: 'HTTP server closed, no longer accepting connections'
    }));
    
    // Close database connection
    try {
      db.close();
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'database_closed',
        message: 'Database connection closed cleanly'
      }));
    } catch (err) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        event: 'database_close_error',
        error: err.message
      }));
    }
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'shutdown_complete',
      message: 'Graceful shutdown complete'
    }));
    
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      event: 'shutdown_timeout',
      message: 'Graceful shutdown timeout - forcing exit'
    }));
    process.exit(1);
  }, 10000);
}

// Listen for shutdown signals
// SIGTERM: Standard termination signal (AWS ECS, Kubernetes, etc.)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// SIGINT: Interrupt signal (Ctrl+C in terminal)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exceptions - log and exit
process.on('uncaughtException', (error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'FATAL',
    event: 'uncaught_exception',
    message: error.message,
    stack: error.stack
  }));
  gracefulShutdown('uncaughtException');
});

// Unhandled promise rejections - log and exit
process.on('unhandledRejection', (reason, promise) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'FATAL',
    event: 'unhandled_rejection',
    reason: reason,
    promise: promise
  }));
  gracefulShutdown('unhandledRejection');
});

