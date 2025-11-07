/**
 * Test Server (No Database Dependencies)
 * Purpose: Test SRE improvements without needing better-sqlite3
 * Use this to verify health checks, metrics, logging, graceful shutdown
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== Mock Database ====================
// In-memory storage (replaces SQLite for testing)
const mockDatabase = new Map();

function initDatabase() {
  console.log('✅ Mock database initialized (in-memory)');
}

function getUserState(userId) {
  return mockDatabase.get(userId) || null;
}

function createOrUpdateUserState({ userId, isMuted, deviceId, deviceLabel, roomId }) {
  const now = new Date().toISOString();
  const existing = mockDatabase.get(userId);
  
  const userState = {
    userId,
    isMuted,
    deviceId,
    deviceLabel,
    roomId,
    lastUpdated: now,
    createdAt: existing?.createdAt || now
  };
  
  mockDatabase.set(userId, userState);
  return userState;
}

function getAllUserStates() {
  return Array.from(mockDatabase.values());
}

function deleteUserState(userId) {
  return mockDatabase.delete(userId);
}

// ==================== Middleware ====================

app.use(cors());
app.use(express.json());

// ==================== SRE: Structured Request Logging ====================
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  req.requestId = requestId;
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: requestId,
      method: req.method,
      path: req.path,
      url: req.url,
      statusCode: res.statusCode,
      statusText: res.statusCode >= 200 && res.statusCode < 300 ? 'success' :
                  res.statusCode >= 400 && res.statusCode < 500 ? 'client_error' :
                  res.statusCode >= 500 ? 'server_error' : 'unknown',
      duration: duration,
      durationSeconds: (duration / 1000).toFixed(3),
      userId: req.params.userId || req.body?.userId || null,
      roomId: req.params.roomId || req.body?.roomId || null,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      contentLength: req.get('content-length') || 0,
      isError: res.statusCode >= 400,
      isSlowRequest: duration > 1000,
      isCriticalEndpoint: req.path.includes('/mute') || req.path.includes('/device')
    };
    
    console.log(JSON.stringify(logEntry));
    
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

// ==================== SRE: Metrics Tracking ====================
class SimpleMetrics {
  constructor() {
    this.responseTimes = [];
    this.totalRequests = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }
  
  record(duration, statusCode) {
    this.responseTimes.push(duration);
    this.totalRequests++;
    if (statusCode >= 400) this.errorCount++;
    
    // Keep only last 100
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }
  
  getSummary() {
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    return {
      timestamp: new Date().toISOString(),
      api: {
        totalRequests: this.totalRequests,
        errorCount: this.errorCount,
        errorRate: this.totalRequests > 0 ? 
          ((this.errorCount / this.totalRequests) * 100).toFixed(2) + '%' : '0%',
        responseTime: {
          p95: (sorted[p95Index] || 0) + 'ms',
          count: sorted.length
        }
      },
      users: {
        current: mockDatabase.size,
        limit: 10
      },
      system: {
        uptime: uptime + 's',
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
        }
      }
    };
  }
}

const metrics = new SimpleMetrics();

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    metrics.record(Date.now() - start, res.statusCode);
  });
  next();
});

// ==================== Initialize ====================
initDatabase();

// ==================== API Routes ====================

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  res.json(metrics.getSummary());
});

// Enhanced health check
app.get('/api/health', (req, res) => {
  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    res.json({ 
      status: 'ok', 
      message: 'Test server is running',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      database: {
        status: 'connected',
        type: 'Mock (in-memory)',
        entries: mockDatabase.size
      },
      memory: {
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`
      },
      environment: process.env.NODE_ENV || 'test',
      nodeVersion: process.version
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Service unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all users
app.get('/api/users', (req, res) => {
  try {
    const users = getAllUserStates();
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Get specific user
app.get('/api/users/:userId', (req, res) => {
  try {
    const userState = getUserState(req.params.userId);
    if (!userState) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: userState });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// Create/update user state
app.post('/api/users/:userId/state', (req, res) => {
  try {
    const { userId } = req.params;
    const { isMuted, deviceId, deviceLabel, roomId } = req.body;
    
    if (typeof isMuted !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isMuted must be a boolean' });
    }
    
    const userState = createOrUpdateUserState({
      userId,
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
    res.status(500).json({ success: false, error: 'Failed to update user state' });
  }
});

// Update mute status
app.patch('/api/users/:userId/mute', (req, res) => {
  try {
    const { userId } = req.params;
    const { isMuted } = req.body;
    
    if (typeof isMuted !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isMuted must be a boolean' });
    }
    
    const currentState = getUserState(userId);
    const userState = createOrUpdateUserState({
      userId,
      isMuted,
      deviceId: currentState?.deviceId || null,
      deviceLabel: currentState?.deviceLabel || null,
      roomId: currentState?.roomId || null
    });
    
    res.json({
      success: true,
      message: 'Mute status updated',
      data: userState
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update mute status' });
  }
});

// Update device
app.patch('/api/users/:userId/device', (req, res) => {
  try {
    const { userId } = req.params;
    const { deviceId, deviceLabel } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }
    
    const currentState = getUserState(userId);
    const userState = createOrUpdateUserState({
      userId,
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
    res.status(500).json({ success: false, error: 'Failed to update device' });
  }
});

// Delete user
app.delete('/api/users/:userId', (req, res) => {
  try {
    const deleted = deleteUserState(req.params.userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, message: 'User state deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ==================== Start Server ====================
const server = app.listen(PORT, () => {
  console.log('==========================================');
  console.log('🧪 Test Server (Mock Database)');
  console.log('==========================================');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Metrics: http://localhost:${PORT}/api/metrics`);
  console.log('==========================================');
  console.log('⚠️  NOTE: Using in-memory mock database');
  console.log('⚠️  Install Node 18 LTS for full SQLite support');
  console.log('==========================================');
});

// ==================== SRE: Graceful Shutdown ====================
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
    signal: signal
  }));
  
  server.close((err) => {
    if (err) {
      console.error(JSON.stringify({
        level: 'ERROR',
        event: 'shutdown_error',
        error: err.message
      }));
      process.exit(1);
    }
    
    console.log(JSON.stringify({
      event: 'shutdown_complete',
      message: 'Test server shut down cleanly'
    }));
    
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('Shutdown timeout - forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error(JSON.stringify({
    level: 'FATAL',
    event: 'uncaught_exception',
    message: error.message
  }));
  gracefulShutdown('uncaughtException');
});

