/**
 * Backend API Service
 * Handles communication with the RESTful API server
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface UserState {
  userId: string;
  username: string;
  isMuted: boolean;
  verifiedMuted: boolean | null;  // User Story 1: Hardware verification result
  deviceId: string | null;
  deviceLabel: string | null;
  roomId: string | null;
  lastUpdated?: string;
  createdAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Update user's complete state
 */
export async function updateUserState(
  userId: string,
  username: string,
  isMuted: boolean,
  deviceId: string | null,
  deviceLabel: string | null,
  roomId: string | null = 'default-room'
): Promise<UserState | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        isMuted,
        deviceId,
        deviceLabel,
        roomId,
      }),
    });

    const result: ApiResponse<UserState> = await response.json();

    if (!response.ok || !result.success) {
      console.error('Failed to update user state:', result.error);
      return null;
    }

    console.log('✅ User state updated:', result.data);
    return result.data || null;
  } catch (error) {
    console.error('Error updating user state:', error);
    return null;
  }
}

/**
 * Update only mute status
 */
export async function updateMuteStatus(
  userId: string,
  isMuted: boolean
): Promise<UserState | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/mute`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isMuted }),
    });

    const result: ApiResponse<UserState> = await response.json();

    if (!response.ok || !result.success) {
      console.error('Failed to update mute status:', result.error);
      return null;
    }

    console.log(`✅ Mute status updated: ${isMuted ? 'Muted' : 'Unmuted'}`);
    return result.data || null;
  } catch (error) {
    console.error('Error updating mute status:', error);
    return null;
  }
}

/**
 * Update only device information
 */
export async function updateDevice(
  userId: string,
  deviceId: string,
  deviceLabel: string | null
): Promise<UserState | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/device`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        deviceLabel,
      }),
    });

    const result: ApiResponse<UserState> = await response.json();

    if (!response.ok || !result.success) {
      console.error('Failed to update device:', result.error);
      return null;
    }

    console.log('✅ Device updated:', deviceLabel || deviceId);
    return result.data || null;
  } catch (error) {
    console.error('Error updating device:', error);
    return null;
  }
}

/**
 * Update mute verification status (User Story 1: Hardware verification)
 */
export async function updateMuteVerification(
  userId: string,
  verifiedMuted: boolean
): Promise<UserState | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ verifiedMuted }),
    });

    const result: ApiResponse<UserState> = await response.json();

    if (!response.ok || !result.success) {
      console.error('Failed to update verification status:', result.error);
      return null;
    }

    console.log(`✅ Mute verification: ${verifiedMuted ? 'Verified ✓' : 'Failed ✗'}`);
    return result.data || null;
  } catch (error) {
    console.error('Error updating verification status:', error);
    return null;
  }
}

/**
 * Get user state from backend
 */
export async function getUserState(userId: string): Promise<UserState | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    const result: ApiResponse<UserState> = await response.json();

    if (!response.ok || !result.success) {
      return null;
    }

    return result.data || null;
  } catch (error) {
    console.error('Error fetching user state:', error);
    return null;
  }
}

/**
 * Get all users in a room
 */
export async function getRoomUsers(roomId: string): Promise<UserState[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/users`);
    const result: ApiResponse<UserState[]> = await response.json();

    if (!response.ok || !result.success) {
      return [];
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching room users:', error);
    return [];
  }
}

/**
 * Delete user state
 */
export async function deleteUserState(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
    });

    const result: ApiResponse<void> = await response.json();
    return response.ok && result.success;
  } catch (error) {
    console.error('Error deleting user state:', error);
    return false;
  }
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

