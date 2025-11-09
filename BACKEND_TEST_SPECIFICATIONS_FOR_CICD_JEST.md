# Backend Test Specifications

This document contains test specifications for two simpler backend files that manage meeting state and audio stream forwarding for User Story 11 (Establishing Initial Audio Connection).

---

## Test Specification 1: backend/src/MeetingRegistry.ts

### Purpose
MeetingRegistry manages meeting state and active user sessions. It provides methods to register/remove users, list participants, and update quality tiers. This is a core data management class with no external dependencies (pure business logic).

### List of Functions
1. `registerUser(meetingId, session)`
2. `removeUser(meetingId, userId)`
3. `listRecipients(meetingId, excludeUserId?)`
4. `getMeeting(meetingId)`
5. `updateQualityTier(meetingId, tier)`
6. `getUserSession(meetingId, userId)`
7. `getAllMeetings()`

### Test Cases

| # | Function | Purpose of Test | Test Inputs | Expected Output |
|---|----------|----------------|-------------|-----------------|
| 1 | `registerUser` | Creates new meeting when registering first user | `meetingId='meeting1'`, `session={userId:'user1', pcId:'pc1', qualityTier:'HIGH', lastCrc32:'', connectionState:'Connected', timestamp:1234567890}` | New Meeting created with `meetingId='meeting1'`, `currentTier='HIGH'`, `sessions` array containing the user session; console logs "User user1 registered in meeting meeting1" |
| 2 | `registerUser` | Adds second user to existing meeting | `meetingId='meeting1'` (already exists), `session={userId:'user2', ...}` | Meeting 'meeting1' now has 2 sessions; both user1 and user2 in sessions array |
| 3 | `registerUser` | Updates existing user session | `meetingId='meeting1'`, `session={userId:'user1', pcId:'pc1-new', qualityTier:'LOW', ...}` (user1 already in meeting) | Session for user1 is updated with new values; sessions array length remains same; no duplicate entries |
| 4 | `registerUser` | Sets default tier to HIGH for new meeting | `meetingId='meeting2'`, `session={userId:'user3', ...}` | New Meeting created with `currentTier='HIGH'` (default from dev_specs) |
| 5 | `registerUser` | Records creation timestamp | `meetingId='meeting3'`, `session={userId:'user4', ...}` | Meeting has `createdAt` field with valid timestamp (number, approximately Date.now()) |
| 6 | `removeUser` | Removes user from meeting | `meetingId='meeting1'` (with users ['user1', 'user2']), `userId='user1'` | Meeting 'meeting1' sessions array now contains only 'user2'; console logs "User user1 removed from meeting meeting1" |
| 7 | `removeUser` | Deletes meeting when last user leaves | `meetingId='meeting1'` (with only 'user1'), `userId='user1'` | Meeting 'meeting1' is deleted from internal map; `getMeeting('meeting1')` returns null; console logs "Meeting meeting1 deleted (no users remaining)" |
| 8 | `removeUser` | Handles removing non-existent user gracefully | `meetingId='meeting1'`, `userId='nonexistent'` | No error thrown; sessions array unchanged; no console errors |
| 9 | `removeUser` | Handles removing from non-existent meeting | `meetingId='nonexistent'`, `userId='user1'` | No error thrown; console warns "Meeting nonexistent not found" |
| 10 | `listRecipients` | Returns all users in meeting | `meetingId='meeting1'` (with users ['user1', 'user2', 'user3']) | Returns array of 3 UserSession objects for user1, user2, user3 |
| 11 | `listRecipients` | Excludes specified user from list | `meetingId='meeting1'` (with users ['user1', 'user2', 'user3']), `excludeUserId='user1'` | Returns array of 2 UserSession objects for user2 and user3 only |
| 12 | `listRecipients` | Returns empty array for non-existent meeting | `meetingId='nonexistent'` | Returns `[]` (empty array) |
| 13 | `listRecipients` | Returns empty array when only excluded user in meeting | `meetingId='meeting1'` (with only 'user1'), `excludeUserId='user1'` | Returns `[]` (empty array) |
| 14 | `getMeeting` | Returns meeting object for existing meeting | `meetingId='meeting1'` (exists with 2 users) | Returns Meeting object with properties: `meetingId='meeting1'`, `currentTier`, `createdAt`, `sessions` array |
| 15 | `getMeeting` | Returns null for non-existent meeting | `meetingId='nonexistent'` | Returns `null` |
| 16 | `updateQualityTier` | Updates tier for existing meeting | `meetingId='meeting1'` (currentTier='HIGH'), `tier='LOW'` | Meeting 'meeting1' now has `currentTier='LOW'`; console logs "Meeting meeting1 tier updated to LOW" |
| 17 | `updateQualityTier` | Changes tier from LOW to MEDIUM | `meetingId='meeting1'` (currentTier='LOW'), `tier='MEDIUM'` | Meeting 'meeting1' now has `currentTier='MEDIUM'` |
| 18 | `updateQualityTier` | Changes tier from MEDIUM to HIGH | `meetingId='meeting1'` (currentTier='MEDIUM'), `tier='HIGH'` | Meeting 'meeting1' now has `currentTier='HIGH'` |
| 19 | `updateQualityTier` | Handles update for non-existent meeting | `meetingId='nonexistent'`, `tier='LOW'` | No error thrown; console warns "Cannot update tier: Meeting nonexistent not found" |
| 20 | `getUserSession` | Returns session for existing user in meeting | `meetingId='meeting1'` (with 'user1'), `userId='user1'` | Returns UserSession object for user1 with all properties (userId, pcId, qualityTier, etc.) |
| 21 | `getUserSession` | Returns null for non-existent user | `meetingId='meeting1'`, `userId='nonexistent'` | Returns `null` |
| 22 | `getUserSession` | Returns null for non-existent meeting | `meetingId='nonexistent'`, `userId='user1'` | Returns `null` |
| 23 | `getAllMeetings` | Returns all active meetings | After creating 3 meetings ('meeting1', 'meeting2', 'meeting3') | Returns array of 3 Meeting objects with correct meetingIds |
| 24 | `getAllMeetings` | Returns empty array when no meetings | Before any meetings created | Returns `[]` (empty array) |
| 25 | `getAllMeetings` | Returns updated list after meeting deletion | After creating 3 meetings, then deleting 1 | Returns array of 2 Meeting objects (the remaining ones) |

---

## Test Specification 2: backend/src/StreamForwarder.ts

### Purpose
StreamForwarder routes audio streams and manages quality tier selection for meetings. It coordinates with MeetingRegistry to determine recipients and tracks tier settings. This class has dependencies on MeetingRegistry and MediasoupManager but focuses on tier management logic.

### List of Functions
1. `constructor(meetingRegistry, mediasoupManager)`
2. `forward(meetingId, tier, frames)`
3. `selectTierFor(userId)`
4. `setTier(meetingId, tier)` - **CRITICAL: Used by QualityController (User Story 8)**
5. `findMeetingForUser(userId)` (private, but testable via other methods)
6. `cleanupMeeting(meetingId)` - **Should be called when meeting ends (per flow_charts.md line 228)**

### Test Cases

| # | Function | Purpose of Test | Test Inputs | Expected Output |
|---|----------|----------------|-------------|-----------------|
| 1 | `constructor` | Initializes with dependencies | `meetingRegistry` (MeetingRegistry instance), `mediasoupManager` (MediasoupManager instance) | Instance created; console logs "StreamForwarder Initialized with mediasoup integration"; internal maps initialized empty |
| 2 | `forward` | Logs forwarding to recipients | `meetingId='meeting1'` (with 2 users), `tier='HIGH'`, `frames=[{tier:'HIGH', data:Uint8Array, timestamp:123}]` | Console logs "Forwarding tier HIGH (layer 2) to 2 recipients in meeting meeting1"; calls `meetingRegistry.listRecipients('meeting1')` |
| 3 | `forward` | Handles meeting with no recipients | `meetingId='meeting1'` (no users), `tier='HIGH'`, `frames=[...]` | Returns immediately without error; no forwarding logged |
| 4 | `forward` | Uses current meeting tier when forwarding | `meetingId='meeting1'` (tier set to 'LOW'), `tier='HIGH'`, `frames=[...]` | Forwards using 'LOW' tier (the meeting's current tier), not the 'HIGH' tier passed in; logs "Forwarding tier LOW (layer 0)" |
| 5 | `forward` | Logs per-user tier selection | `meetingId='meeting1'` (with 'user1'), `tier='HIGH'`, `frames=[...]` | Console logs "User user1 receiving tier HIGH (layer 2)" for each recipient |
| 6 | `selectTierFor` | Returns user-specific tier when set | `userId='user1'` (with user tier set to 'LOW') | Returns `'LOW'` |
| 7 | `selectTierFor` | Returns meeting tier when no user tier set | `userId='user1'` (in 'meeting1' with meeting tier 'MEDIUM'), no user-specific tier | Returns `'MEDIUM'` (the meeting's tier) |
| 8 | `selectTierFor` | Returns HIGH as default fallback | `userId='nonexistent'` (not in any meeting, no user tier) | Returns `'HIGH'` (default fallback) |
| 9 | `setTier` | Sets tier for meeting (HIGH to LOW) | `meetingId='meeting1'`, `tier='LOW'` | Meeting tier set to 'LOW'; `meetingRegistry.updateQualityTier('meeting1', 'LOW')` called; console logs "Set tier for meeting meeting1: none → LOW (layer 0)" |
| 10 | `setTier` | Updates tier from LOW to MEDIUM | `meetingId='meeting1'` (currentTier='LOW'), `tier='MEDIUM'` | Meeting tier updated to 'MEDIUM'; console logs "Set tier for meeting meeting1: LOW → MEDIUM (layer 1)" |
| 11 | `setTier` | Updates tier from MEDIUM to HIGH | `meetingId='meeting1'` (currentTier='MEDIUM'), `tier='HIGH'` | Meeting tier updated to 'HIGH'; console logs "Set tier for meeting meeting1: MEDIUM → HIGH (layer 2)" |
| 12 | `setTier` | Skips update when tier unchanged | `meetingId='meeting1'` (currentTier='HIGH'), `tier='HIGH'` | No update performed; console logs "Tier for meeting meeting1 already set to HIGH"; `meetingRegistry.updateQualityTier` not called |
| 13 | `setTier` | Logs consumer update count | `meetingId='meeting1'` (with 3 users), `tier='LOW'` | Console logs "Updating 3 consumers to tier LOW (layer 0)" |
| 14 | `setTier` | **CRITICAL: Calls mediasoupManager.getConsumersForUser() and consumer.setPreferredLayers()** | `meetingId='meeting1'` (with 2 users, each with 1 consumer), `tier='MEDIUM'` | `mediasoupManager.getConsumersForUser()` called for each recipient; `consumer.setPreferredLayers({ spatialLayer: 1 })` called for each consumer; all promises resolve successfully |
| 15 | `findMeetingForUser` | Finds meeting for user (via selectTierFor) | `userId='user1'` (in 'meeting1') | `selectTierFor('user1')` returns the meeting's tier, confirming user was found |
| 16 | `findMeetingForUser` | Returns null for non-existent user | `userId='nonexistent'` | `selectTierFor('nonexistent')` returns 'HIGH' (default), indicating user not found in any meeting |
| 17 | `cleanupMeeting` | Removes meeting tier | `meetingId='meeting1'` (tier='LOW') | Meeting tier removed from internal map; console logs "Cleaned up meeting meeting1" |
| 18 | `cleanupMeeting` | Removes user tiers for meeting users | `meetingId='meeting1'` (with 'user1' and 'user2' having user tiers) | User tiers for user1 and user2 removed from internal map |
| 19 | `cleanupMeeting` | Handles cleanup for non-existent meeting | `meetingId='nonexistent'` | No error thrown; console logs "Cleaned up meeting nonexistent" |

---

## Testing Notes

### General Testing Approach

1. **Mocking Strategy:**
   - **MeetingRegistry:** No mocking needed - this is a pure data class with no external dependencies. Test directly.
   - **StreamForwarder:** Mock MeetingRegistry and MediasoupManager dependencies using jest.fn() or similar
   - Use spy functions to verify method calls (e.g., verify `meetingRegistry.updateQualityTier` is called)

2. **Assertion Types:**
   - **State assertions:** Verify internal state changes (meetings map, sessions array, tier values)
   - **Return value assertions:** Verify correct return values (arrays, objects, null checks)
   - **Behavioral assertions:** Verify method calls on dependencies (for StreamForwarder)
   - **Console log assertions:** Verify correct logging messages (optional but helpful for debugging)

3. **Test Organization:**
   - Group tests by function
   - Test success cases first, then edge cases
   - Test boundary conditions (empty arrays, null values, non-existent IDs)
   - Verify proper cleanup and state management

4. **Key Test Data:**
   ```typescript
   // Sample UserSession
   const sampleSession: UserSession = {
     userId: 'user1',
     pcId: 'pc1',
     qualityTier: 'HIGH',
     lastCrc32: '',
     connectionState: 'Connected',
     timestamp: Date.now()
   };

   // Sample EncodedFrame
   const sampleFrame: EncodedFrame = {
     tier: 'HIGH',
     data: new Uint8Array([1, 2, 3, 4]),
     timestamp: Date.now()
   };
   ```

### Dependencies for Testing

- **Test Framework:** Jest (already configured in project)
- **Mocking:** jest.fn(), jest.spyOn() for mocks and spies
- **No external mocking needed for MeetingRegistry** - it's a pure class
- **StreamForwarder needs:** Mock MeetingRegistry and MediasoupManager

### Test Setup Examples

```typescript
// MeetingRegistry - No setup needed, test directly
describe('MeetingRegistry', () => {
  let registry: MeetingRegistry;
  
  beforeEach(() => {
    registry = new MeetingRegistry();
  });
  
  // ... tests
});

// StreamForwarder - Mock dependencies
describe('StreamForwarder', () => {
  let forwarder: StreamForwarder;
  let mockRegistry: jest.Mocked<MeetingRegistry>;
  let mockMediasoup: jest.Mocked<MediasoupManager>;
  
  beforeEach(() => {
    mockRegistry = {
      listRecipients: jest.fn().mockReturnValue([]),
      updateQualityTier: jest.fn(),
      getAllMeetings: jest.fn().mockReturnValue([]),
      // ... other methods
    } as any;
    
    mockMediasoup = {} as any; // Minimal mock
    
    forwarder = new StreamForwarder(mockRegistry, mockMediasoup);
  });
  
  // ... tests
});
```

### Coverage Goals

- **MeetingRegistry:** 7 functions, 25 test cases = 100% function coverage
- **StreamForwarder:** 6 functions, 19 test cases = 100% function coverage (removed tests for unused methods: setTierForUser, getTier, getStats)
- **Total:** 44 test cases covering all 13 functions (only methods in dev_specs/APIs.md or actively used)
- Aim for >95% line coverage
- All edge cases and error paths covered

### Notes on Removed Tests

**Removed Tests (9 total):**
- Tests 14-16 (`setTierForUser`): Method not in dev_specs/APIs.md and not used in codebase (marked as "future" feature)
- Tests 17-18 (`getTier`): Method not in dev_specs/APIs.md and not used in codebase
- Tests 24-27 (`getStats`): Method not in dev_specs/APIs.md and not used in codebase

**Added Test:**
- Test 14 (`setTier`): **CRITICAL** - Verifies mediasoup Consumer layer switching (required for User Story 8)

### Implementation Note: cleanupMeeting() Integration

**Status:** ✅ **FIXED** - `cleanupMeeting()` is now called in `SignalingServer.handleLeave()` when the last user leaves a meeting, per `dev_specs/flow_charts.md` line 228.

**Implementation:**
- `SignalingServer.handleLeave()` checks if the leaving user is the last user in the meeting
- If yes, calls `streamForwarder.cleanupMeeting(meetingId)` after `meetingRegistry.removeUser()`
- This ensures StreamForwarder cleans up meeting-tier and user-tier mappings when meetings end

