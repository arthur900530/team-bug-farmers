import request from 'supertest';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase, getUserState, createOrUpdateUserState, deleteUserState, getAllUserStates } from '../database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create test database
const testDb = new Database(':memory:');

// Mock the database module
jest.mock('../database.js', () => {
  const actual = jest.requireActual('../database.js');
  return {
    ...actual,
    initDatabase: jest.fn(),
    getUserState: jest.fn(),
    createOrUpdateUserState: jest.fn(),
    getAllUserStates: jest.fn(),
    getUsersByRoom: jest.fn(),
    deleteUserState: jest.fn(),
  };
});

// Import server after mocking
let app;

beforeAll(async () => {
  // Dynamically import server
  const serverModule = await import('../server.js');
  app = serverModule.default || serverModule.app;
});

describe('Backend API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/users/:userId/state', () => {
    it('should create a new user state', async () => {
      const mockUserState = {
        userId: 'test-user',
        username: 'Test User',
        isMuted: false,
        deviceId: 'device-1',
        deviceLabel: 'Microphone',
        roomId: 'room-1',
      };

      createOrUpdateUserState.mockReturnValue(mockUserState);

      const response = await request(app)
        .post('/api/users/test-user/state')
        .send({
          username: 'Test User',
          isMuted: false,
          deviceId: 'device-1',
          deviceLabel: 'Microphone',
          roomId: 'room-1',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUserState);
      expect(createOrUpdateUserState).toHaveBeenCalledWith({
        userId: 'test-user',
        username: 'Test User',
        isMuted: false,
        deviceId: 'device-1',
        deviceLabel: 'Microphone',
        roomId: 'room-1',
      });
    });

    it('should return 400 when isMuted is not a boolean', async () => {
      const response = await request(app)
        .post('/api/users/test-user/state')
        .send({
          username: 'Test User',
          isMuted: 'not-a-boolean',
          deviceId: 'device-1',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('isMuted');
    });

    it('should return 400 when username is missing', async () => {
      const response = await request(app)
        .post('/api/users/test-user/state')
        .send({
          isMuted: false,
          deviceId: 'device-1',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('username');
    });

    it('should handle null deviceId and deviceLabel', async () => {
      const mockUserState = {
        userId: 'test-user',
        username: 'Test User',
        isMuted: false,
        deviceId: null,
        deviceLabel: null,
        roomId: 'room-1',
      };

      createOrUpdateUserState.mockReturnValue(mockUserState);

      const response = await request(app)
        .post('/api/users/test-user/state')
        .send({
          username: 'Test User',
          isMuted: false,
          roomId: 'room-1',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/users/:userId', () => {
    it('should return user state', async () => {
      const mockUser = {
        userId: 'test-user',
        username: 'Test User',
        isMuted: false,
        deviceId: 'device-1',
        deviceLabel: 'Microphone',
        roomId: 'room-1',
      };

      getUserState.mockReturnValue(mockUser);

      const response = await request(app)
        .get('/api/users/test-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });

    it('should return 404 when user not found', async () => {
      getUserState.mockReturnValue(null);

      const response = await request(app)
        .get('/api/users/nonexistent-user')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PATCH /api/users/:userId/mute', () => {
    it('should update mute status', async () => {
      const mockCurrentState = {
        userId: 'test-user',
        username: 'Test User',
        isMuted: false,
        deviceId: 'device-1',
        deviceLabel: 'Microphone',
        roomId: 'room-1',
      };

      const mockUpdatedState = {
        ...mockCurrentState,
        isMuted: true,
      };

      getUserState.mockReturnValue(mockCurrentState);
      createOrUpdateUserState.mockReturnValue(mockUpdatedState);

      const response = await request(app)
        .patch('/api/users/test-user/mute')
        .send({ isMuted: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isMuted).toBe(true);
    });

    it('should return 404 when user not found', async () => {
      getUserState.mockReturnValue(null);

      const response = await request(app)
        .patch('/api/users/nonexistent-user/mute')
        .send({ isMuted: true })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when isMuted is not a boolean', async () => {
      const response = await request(app)
        .patch('/api/users/test-user/mute')
        .send({ isMuted: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/users/:userId/device', () => {
    it('should update device information', async () => {
      const mockCurrentState = {
        userId: 'test-user',
        username: 'Test User',
        isMuted: false,
        deviceId: 'old-device',
        deviceLabel: 'Old Microphone',
        roomId: 'room-1',
      };

      const mockUpdatedState = {
        ...mockCurrentState,
        deviceId: 'new-device',
        deviceLabel: 'New Microphone',
      };

      getUserState.mockReturnValue(mockCurrentState);
      createOrUpdateUserState.mockReturnValue(mockUpdatedState);

      const response = await request(app)
        .patch('/api/users/test-user/device')
        .send({
          deviceId: 'new-device',
          deviceLabel: 'New Microphone',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceId).toBe('new-device');
    });

    it('should return 400 when deviceId is missing', async () => {
      const response = await request(app)
        .patch('/api/users/test-user/device')
        .send({ deviceLabel: 'Microphone' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { userId: 'user-1', username: 'User 1', isMuted: false },
        { userId: 'user-2', username: 'User 2', isMuted: true },
      ];

      getAllUserStates.mockReturnValue(mockUsers);

      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsers);
      expect(response.body.count).toBe(2);
    });

    it('should return empty array when no users', async () => {
      getAllUserStates.mockReturnValue([]);

      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('DELETE /api/users/:userId', () => {
    it('should delete user', async () => {
      deleteUserState.mockReturnValue(true);

      const response = await request(app)
        .delete('/api/users/test-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(deleteUserState).toHaveBeenCalledWith('test-user');
    });

    it('should return 404 when user not found', async () => {
      deleteUserState.mockReturnValue(false);

      const response = await request(app)
        .delete('/api/users/nonexistent-user')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

