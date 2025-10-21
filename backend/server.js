import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, getUserState, createOrUpdateUserState, getAllUserStates, deleteUserState } from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize database
initDatabase();

// ==================== API Routes ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
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
    const { isMuted, deviceId, deviceLabel, roomId } = req.body;
    
    // Validation
    if (typeof isMuted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isMuted must be a boolean'
      });
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
    console.error('Error updating device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update device'
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
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('🚀 Zoom Demo Backend Server');
  console.log('==========================================');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ API available at http://localhost:${PORT}/api`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log('==========================================');
});

