# Testing Documentation

## 📋 Overview

This application has comprehensive test coverage for both frontend and backend components.

### **Test Frameworks**
- **Frontend**: Vitest + React Testing Library + jsdom
- **Backend**: Jest + Supertest

---

## 🧪 Frontend Tests

### **Test Structure**
```
src/
├── services/
│   └── __tests__/
│       ├── audioService.test.ts
│       └── backendService.test.ts
├── components/
│   └── __tests__/
│       ├── JoinMeetingModal.test.tsx
│       └── MeetingView.test.tsx
└── test/
    └── setup.ts (test configuration)
```

### **Running Frontend Tests**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:ui

# Run with coverage report
npm run test:coverage
```

---

## 🔧 Test Categories

### **1. Service Tests (`audioService.test.ts`)**

**Purpose:** Test real microphone control and Web Audio API integration

**Test Coverage:**
- ✅ Microphone initialization (default & specific device)
- ✅ Mute/unmute functionality
- ✅ Audio level monitoring (0-100%)
- ✅ Device enumeration
- ✅ Device switching
- ✅ Mute state verification
- ✅ Resource cleanup
- ✅ Error handling

**Example Test:**
```typescript
it('should initialize with specific device ID', async () => {
  const deviceId = 'specific-device-id';
  const result = await audioService.initialize(deviceId);
  
  expect(result).toBe(true);
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
    audio: { deviceId: { exact: deviceId } },
  });
});
```

**Run:**
```bash
npm test -- audioService
```

---

### **2. Service Tests (`backendService.test.ts`)**

**Purpose:** Test API client and backend communication

**Test Coverage:**
- ✅ `updateUserState()` - Create/update full state
- ✅ `updateMuteStatus()` - PATCH mute only
- ✅ `updateDevice()` - PATCH device only
- ✅ `getUserState()` - GET user by ID
- ✅ `getRoomUsers()` - GET users in room
- ✅ `deleteUserState()` - DELETE user
- ✅ `checkBackendHealth()` - Health check
- ✅ Error handling
- ✅ Network failures

**Example Test:**
```typescript
it('should send POST request with user state', async () => {
  const mockResponse = {
    success: true,
    data: { userId: 'test-user', username: 'Test User', isMuted: false },
  };

  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse,
  } as Response);

  const result = await updateUserState('test-user', 'Test User', false, null, null);

  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/users/test-user/state'),
    expect.objectContaining({ method: 'POST' })
  );
  expect(result).toEqual(mockResponse.data);
});
```

**Run:**
```bash
npm test -- backendService
```

---

### **3. Component Tests (`JoinMeetingModal.test.tsx`)**

**Purpose:** Test username input and join flow

**Test Coverage:**
- ✅ Render modal with username input
- ✅ Username validation (2-30 chars)
- ✅ Real-time preview updates
- ✅ Error messages (empty, too short, too long)
- ✅ Disabled/enabled join button
- ✅ Whitespace trimming
- ✅ Mic/camera toggle buttons
- ✅ Error clearing on input
- ✅ Default username pre-filling

**Example Test:**
```typescript
it('should call onJoin with username when submitted', async () => {
  const user = userEvent.setup();
  render(<JoinMeetingModal {...defaultProps} />);
  
  const input = screen.getByPlaceholderText('Enter your name');
  await user.type(input, 'Alice');
  
  const joinButton = screen.getByRole('button', { name: /join meeting/i });
  await user.click(joinButton);
  
  expect(mockOnJoin).toHaveBeenCalledWith('Alice');
});
```

**Run:**
```bash
npm test -- JoinMeetingModal
```

---

### **4. Component Tests (`MeetingView.test.tsx`)**

**Purpose:** Test meeting view and username display

**Test Coverage:**
- ✅ Render meeting view
- ✅ Display username (center & participant label)
- ✅ Show/hide banner
- ✅ Microphone toggle
- ✅ Default username fallback
- ✅ Toolbar rendering
- ✅ Status indicator

**Example Test:**
```typescript
it('should display username in center', () => {
  render(<MeetingView {...defaultProps} username="Alice" />);
  
  const usernameElements = screen.getAllByText('Alice');
  expect(usernameElements.length).toBeGreaterThan(0);
});
```

**Run:**
```bash
npm test -- MeetingView
```

---

## 🔙 Backend Tests

### **Test Structure**
```
backend/
├── __tests__/
│   └── api.test.js
└── jest.config.js
```

### **Running Backend Tests**

```bash
cd backend

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

---

### **5. API Tests (`api.test.js`)**

**Purpose:** Test REST API endpoints

**Test Coverage:**

#### **Health Check**
- ✅ `GET /api/health` - Returns status OK

#### **User State Management**
- ✅ `POST /api/users/:userId/state` - Create user
- ✅ Validation (isMuted, username required)
- ✅ Handle null deviceId/deviceLabel
- ✅ `GET /api/users/:userId` - Get user state
- ✅ Return 404 for nonexistent users

#### **Mute Status**
- ✅ `PATCH /api/users/:userId/mute` - Update mute
- ✅ Return 404 when user not found
- ✅ Validate boolean type

#### **Device Management**
- ✅ `PATCH /api/users/:userId/device` - Update device
- ✅ Require deviceId
- ✅ Preserve existing state

#### **User Listing**
- ✅ `GET /api/users` - Get all users
- ✅ Return empty array when no users

#### **User Deletion**
- ✅ `DELETE /api/users/:userId` - Delete user
- ✅ Return 404 when not found

**Example Test:**
```javascript
it('should create a new user state', async () => {
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
  expect(response.body.data.username).toBe('Test User');
});
```

---

## 📊 Coverage

### **Frontend Coverage Target**
```bash
npm run test:coverage
```

**Expected Coverage:**
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

**Coverage Report Location:** `coverage/index.html`

### **Backend Coverage Target**
```bash
cd backend && npm run test:coverage
```

**Expected Coverage:**
- Statements: >75%
- Branches: >70%
- Functions: >75%
- Lines: >75%

**Coverage Report Location:** `backend/coverage/index.html`

---

## 🔍 Test Configuration

### **Frontend (`vitest.config.ts`)**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### **Backend (`backend/jest.config.js`)**
```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
};
```

---

## 🧩 Mocking

### **Frontend Mocks (`src/test/setup.ts`)**

**Mocked APIs:**
- ✅ `AudioContext` (Web Audio API)
- ✅ `navigator.mediaDevices.getUserMedia()`
- ✅ `navigator.mediaDevices.enumerateDevices()`
- ✅ `localStorage`
- ✅ `console` methods

**Example:**
```typescript
global.AudioContext = vi.fn().mockImplementation(() => ({
  createAnalyser: vi.fn().mockReturnValue({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
  }),
  // ...
}));
```

### **Backend Mocks**

**Mocked Modules:**
- ✅ Database operations (in-memory SQLite for tests)
- ✅ File system operations

---

## 🚀 Running Tests in CI/CD

### **GitHub Actions Example**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test

  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd backend && npm install
      - run: cd backend && npm test
```

---

## 🐛 Debugging Tests

### **Frontend**
```bash
# Run specific test file
npm test -- audioService

# Run tests matching pattern
npm test -- --grep="should mute"

# UI mode for interactive debugging
npm run test:ui
```

### **Backend**
```bash
cd backend

# Run specific test file
npm test -- api.test

# Verbose output
npm test -- --verbose

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 📝 Writing New Tests

### **Frontend Test Template**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### **Backend Test Template**
```javascript
import request from 'supertest';
import app from '../server.js';

describe('GET /api/endpoint', () => {
  it('should return data', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });
});
```

---

## ✅ Test Checklist

When adding new features:

- [ ] Write unit tests for new services
- [ ] Write component tests for new UI
- [ ] Write API tests for new endpoints
- [ ] Update mocks if needed
- [ ] Ensure coverage >80%
- [ ] Test error cases
- [ ] Test edge cases
- [ ] Run full test suite before commit

---

## 📚 Additional Resources

### **Vitest Documentation**
- https://vitest.dev/

### **React Testing Library**
- https://testing-library.com/react

### **Jest Documentation**
- https://jestjs.io/

### **Supertest Documentation**
- https://github.com/visionmedia/supertest

---

## 🎯 Test Summary

| Category | Files | Tests | Coverage |
|----------|-------|-------|----------|
| **Frontend Services** | 2 | 40+ | 85%+ |
| **Frontend Components** | 2 | 30+ | 80%+ |
| **Backend API** | 1 | 25+ | 75%+ |
| **Total** | 5 | 95+ | 80%+ |

---

## 🔄 Continuous Testing

**Recommended Workflow:**
1. Write test first (TDD)
2. Implement feature
3. Run tests locally
4. Ensure all pass
5. Push to GitHub
6. CI runs tests automatically
7. Review coverage report

---

## 💡 Tips

1. **Mock External Dependencies**: Always mock APIs, databases, and browser APIs
2. **Test Behavior, Not Implementation**: Focus on what the code does, not how
3. **Use Descriptive Test Names**: `it('should create user when valid data provided')`
4. **Clean Up After Tests**: Use `beforeEach`/`afterEach` for cleanup
5. **Test Edge Cases**: Empty strings, null values, errors, etc.
6. **Keep Tests Fast**: Mock expensive operations
7. **One Assert Per Test**: Easier to debug failures

---

Happy Testing! 🎉

