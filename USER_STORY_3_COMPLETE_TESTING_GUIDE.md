# User Story 3: Real-Time Audio Feedback - Complete Testing Guide

**Purpose:** Comprehensive testing guide for User Story 3 (Real-Time Audio Feedback)  
**Target Audience:** Testing engineers and LLMs assisting with testing  
**Last Updated:** November 9, 2025  
**Status:** Test Files Created, Ready for Execution

---

## Executive Summary

### Testing Objectives

**Primary Objective:** Verify that real-time feedback is provided to confirm outbound audio is successfully received by other participants (per `dev_specs/user_stories.md` line 23)

**Secondary Objectives:**
1. Verify CRC32 fingerprint computation (sender and receiver)
2. Verify fingerprint verification flow (sender → server → receiver)
3. Verify ACK summary generation and delivery
4. Verify UI displays ACK feedback correctly
5. Verify approximation approaches work correctly (PCM frames, RTP timestamp matching)

### Current Test Status

| Category | Status | Tests Created | Tests Total | Completion |
|----------|--------|--------------|-------------|------------|
| Category 1: Component-Level Testing | ⬜ READY | 2 | 2 | 0% |
| Category 2: Integration Testing | ⬜ READY | 1 | 1 | 0% |
| Category 3: Approximation Behavior Testing | ⬜ READY | 2 | 2 | 0% |
| Category 4: Edge Cases & Error Scenarios | ⬜ READY | 1 | 1 | 0% |
| Category 5: ACK Summary Delivery Testing | ⬜ READY | 1 | 1 | 0% |
| Category 6: UI Component Testing | ⬜ READY | 1 | 1 | 0% |
| **TOTAL** | **⬜ READY** | **8** | **8** | **0%** |

**Note:** All test files have been created and are ready for execution. Tests follow a simplified structure (not full phased approach) since User Story 3 depends on User Story 11 (already tested).

### Quick Reference

**Test Files Location:** `backend/src/tests/user_story_3/`  
**Backend Server:** `cd backend && npm run dev` (port 8080, WebSocket: `ws://localhost:8080`)  
**Frontend Server:** `npm run dev` (port 5173, HTTP: `http://localhost:5173`)  

**Note:** 
- Development uses `ws://` (unencrypted WebSocket). Production uses `wss://` (TLS) per `dev_specs/public_interfaces.md`.
- JWT authentication is specified in `dev_specs/public_interfaces.md` but simplified for User Story 11 implementation (see `SignalingServer.ts` line 153).

---

## Testing Approach

### Scope Assessment

**User Story 3 Scope:** Medium (simplified approach, not full phased structure)

**Rationale:**
- Depends on User Story 11 (already tested)
- Focuses on fingerprint verification and ACK feedback
- Smaller scope than US11 (no mediasoup setup, no WebRTC negotiation)
- Can use existing infrastructure (SignalingServer, MeetingRegistry)

**Testing Structure:** Simplified categories focusing on:
1. Component-level tests (FingerprintVerifier, AckAggregator)
2. Integration tests (end-to-end fingerprint flow)
3. Approximation behavior tests
4. Edge cases and error scenarios
5. ACK summary delivery tests
6. UI component tests

---

## Category 1: Component-Level Testing

### Overview

**Goal:** Test individual backend components in isolation.

**Status:** ⬜ **READY** (2/2 test files created)

**Test Files Location:** `backend/src/tests/user_story_3/`

---

### Test C1.1: FingerprintVerifier Component

**Status:** ⬜ **READY FOR EXECUTION**

**Test File:** `backend/src/tests/user_story_3/test-fingerprint-verifier.ts`

**From `dev_specs/flow_charts.md` lines 172-176:** Fingerprint verification flow  
**From `dev_specs/APIs.md` lines 200-207:** FingerprintVerifier API

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_3/test-fingerprint-verifier.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-fingerprint-verifier.js
```

#### Test Cases

**C1.1.1: FingerprintVerifier.compare()**
- ✅ Exact Match: Sender CRC32 === Receiver CRC32 → Returns `true`
- ✅ Mismatch: Sender CRC32 !== Receiver CRC32 → Returns `false`
- ✅ Edge Case: Empty strings → Returns `false`

**C1.1.2: FingerprintVerifier.addSenderFingerprint() and addReceiverFingerprint()**
- ✅ Sender First → Receiver (Match): Match callback called correctly
- ✅ Sender First → Receiver (Mismatch): Mismatch callback called correctly
- ✅ Receiver First → Sender (Out of Order): Out-of-order fingerprints matched correctly
- ✅ Multiple Receivers: One sender, multiple receivers → All compared correctly

**C1.1.3: TTL Cleanup**
- ✅ Cleanup method exists and runs
- ✅ New fingerprints stored correctly

#### Expected Results

- ✅ All compare() tests passed
- ✅ All fingerprint storage tests passed
- ✅ TTL cleanup test passed

#### Success Criteria

- ✅ Exact match returns `true`
- ✅ Mismatch returns `false`
- ✅ Fingerprints stored correctly
- ✅ Comparison triggered when both sender and receiver fingerprints available
- ✅ Callbacks called correctly (onMatch, onMismatch)
- ✅ Multiple receivers handled correctly

---

### Test C1.2: AckAggregator Component

**Status:** ⬜ **READY FOR EXECUTION**

**Test File:** `backend/src/tests/user_story_3/test-ack-aggregator.ts`

**From `dev_specs/flow_charts.md` lines 181-192:** ACK aggregation flow  
**From `dev_specs/APIs.md` lines 212-219:** AckAggregator API  
**From `dev_specs/data_schemas.md` DS-05:** AckSummary structure

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_3/test-ack-aggregator.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-ack-aggregator.js
```

#### Test Cases

**C1.2.1: AckAggregator.onDecodeAck()**
- ✅ Record ACK: ACK recorded correctly → Receiver in `ackedUsers`
- ✅ Record NACK: NACK recorded correctly → Receiver in `missingUsers`
- ✅ Multiple Receivers (Mixed ACK/NACK): Both arrays populated correctly

**C1.2.2: AckAggregator.summaryForSpeaker()**
- ✅ All ACKed: All receivers ACKed → `ackedUsers` contains all, `missingUsers` empty
- ✅ All Missing: All receivers NACKed or timeout → `ackedUsers` empty, `missingUsers` contains all
- ✅ Mixed: Some ACKed, some missing → Both arrays populated correctly
- ✅ No Results: No ACK/NACK results yet → All users in `missingUsers`
- ✅ Verify AckSummary Structure: Structure matches `data_schemas.md` DS-05

#### Expected Results

- ✅ All onDecodeAck() tests passed
- ✅ All summaryForSpeaker() tests passed

#### Success Criteria

- ✅ ACK/NACK results stored per meeting/sender/receiver
- ✅ Summary generated after window (2 seconds)
- ✅ Correctly separates ACKed vs missing users
- ✅ Returns proper `AckSummary` structure per `data_schemas.md` DS-05
- ✅ Handles edge cases (no results, empty meeting)

---

## Category 2: Integration Testing

### Overview

**Goal:** Test component interactions and end-to-end data flow.

**Status:** ⬜ **READY** (1/1 test file created)

---

### Test C2.1: End-to-End Fingerprint Flow

**Status:** ⬜ **READY FOR EXECUTION**

**Test File:** `backend/src/tests/user_story_3/test-fingerprint-flow.ts`

**From `dev_specs/flow_charts.md` lines 163-198:** Complete fingerprint verification flow

#### Prerequisites

- Backend server must be running: `cd backend && npm run dev`

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_3/test-fingerprint-flow.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-fingerprint-flow.js
```

#### Test Cases

**C2.1.1: Successful Flow (CRC32 Match)**
- ✅ Two clients join meeting (sender + receiver)
- ✅ Sender sends fingerprint
- ✅ Receiver sends fingerprint (matching CRC32)
- ✅ Server compares fingerprints
- ✅ Server generates ACK summary
- ✅ Server sends ACK summary to sender
- ✅ Sender receives summary via WebSocket

**C2.1.2: Mismatch Flow (CRC32 Mismatch)**
- ✅ Two clients join meeting (sender + receiver)
- ✅ Sender sends fingerprint
- ✅ Receiver sends fingerprint (mismatching CRC32)
- ✅ Server compares fingerprints
- ✅ Server generates ACK summary with receiver in `missingUsers`
- ✅ Server sends ACK summary to sender

#### Expected Results

- ✅ Fingerprints flow correctly through system
- ✅ ACK summary generated and delivered
- ✅ Sender receives summary via WebSocket
- ✅ Summary contains correct `ackedUsers` and `missingUsers`

#### Success Criteria

- ✅ Fingerprints flow correctly through system
- ✅ ACK summary generated and delivered
- ✅ Sender receives summary via WebSocket
- ✅ Summary structure matches specification

**Note:** Some tests may show warnings if summary window (2 seconds) has not elapsed. This is expected behavior.

---

## Category 3: Approximation Behavior Testing

### Overview

**Goal:** Verify approximation approaches work correctly.

**Status:** ⬜ **READY** (2/2 test files created)

---

### Test C3.1: PCM Frame CRC32 Computation

**Status:** ⬜ **READY FOR EXECUTION**

**Test File:** `backend/src/tests/user_story_3/test-crc32-computation.ts`

**From `USER_STORY_3_TECHNICAL_DECISIONS.md` Decision 1:** CRC32 computed on PCM frames  
**From `dev_specs/data_schemas.md` line 102:** "crc32: string (hex, 8 chars)"

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_3/test-crc32-computation.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-crc32-computation.js
```

#### Test Cases

**C3.1.1: Sender Side - Compute CRC32 on PCM frame**
- ✅ CRC32 computed correctly on PCM frames
- ✅ Format matches specification (8 chars, hex, uppercase)

**C3.1.2: Consistency - Same PCM frame → Same CRC32**
- ✅ Same frame produces same CRC32

**C3.1.3: Different PCM frames → Different CRC32**
- ✅ Different frames produce different CRC32

**C3.1.4: Receiver Side - Compute CRC32 on decoded PCM frame**
- ✅ Decoded frame CRC32 computed correctly

**C3.1.5: Edge Case - Empty frame**
- ✅ Empty frame CRC32 computed correctly

#### Expected Results

- ✅ All CRC32 computation tests passed

#### Success Criteria

- ✅ CRC32 computed correctly on PCM frames
- ✅ Format matches specification (8 chars, hex, uppercase)
- ✅ Consistent results for same input
- ✅ Different inputs produce different CRC32

---

### Test C3.2: RTP Timestamp Matching

**Status:** ⬜ **READY FOR EXECUTION**

**Test File:** `backend/src/tests/user_story_3/test-rtp-timestamp-matching.ts`

**From `USER_STORY_3_TECHNICAL_DECISIONS.md` Decision 2:** RTP timestamp matching with ±50ms tolerance  
**From `dev_specs/public_interfaces.md` line 266:** "Jitter tolerance: up to 50ms"

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_3/test-rtp-timestamp-matching.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-rtp-timestamp-matching.js
```

#### Test Cases

**C3.2.1: Exact Match**
- ✅ Sender and receiver timestamps match exactly → Frame matched

**C3.2.2: Within Tolerance - Small Jitter (±10ms)**
- ✅ Timestamps differ by ±10ms → Frame matched

**C3.2.3: Within Tolerance - Medium Jitter (±40ms)**
- ✅ Timestamps differ by ±40ms → Frame matched

**C3.2.4: At Tolerance Boundary (±50ms)**
- ✅ Timestamps differ by exactly ±50ms → Frame matched

**C3.2.5: Outside Tolerance - Large Jitter (±60ms)**
- ✅ Timestamps differ by >50ms → No match (packet loss)

**C3.2.6: Multiple Frames - Correct Frame Matched**
- ✅ Multiple sender frames → Correct frame matched

**C3.2.7: No Matching Frame (Packet Loss)**
- ✅ No match found when no frames available (packet loss)

#### Expected Results

- ✅ All RTP timestamp matching tests passed

#### Success Criteria

- ✅ Frames matched correctly within tolerance window (±50ms)
- ✅ No match when outside tolerance (simulates packet loss)
- ✅ Correct frame selected when multiple candidates exist

---

## Category 4: Edge Cases and Error Scenarios

### Overview

**Goal:** Verify system handles edge cases and error scenarios gracefully.

**Status:** ⬜ **READY** (1/1 test file created)

---

### Test C4.1: Edge Cases and Error Scenarios

**Status:** ⬜ **READY FOR EXECUTION**

**Test File:** `backend/src/tests/user_story_3/test-edge-cases.ts`

**From `USER_STORY_3_TECHNICAL_DECISIONS.md`:** Approximation approaches account for packet loss and jitter  
**From `dev_specs/data_schemas.md` line 96:** TTL is 15 seconds

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_3/test-edge-cases.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-edge-cases.js
```

#### Test Cases

**C4.1.1: Packet Loss Simulation**
- ✅ Missing Receiver Fingerprint: Receiver fingerprint never arrives → Frame in `missingUsers`
- ✅ Missing Sender Fingerprint: Sender fingerprint never arrives → Receiver fingerprint stored, matched when sender arrives
- ✅ Out of Order: Receiver fingerprint arrives before sender → Should still match correctly

**C4.1.2: Network Jitter Simulation**
- ✅ Jitter handling verified in RTP timestamp matching tests (C3.2)

**C4.1.3: Timeout Scenarios**
- ✅ Fingerprint Expiry: Fingerprint older than 15 seconds → Cleaned up
- ✅ Receiver Timeout: Receiver fingerprint never arrives → Frame in `missingUsers` after timeout
- ✅ Cleanup Interval: Verify cleanup runs every 5 seconds

#### Expected Results

- ✅ All packet loss tests passed
- ✅ All timeout tests passed

#### Success Criteria

- ✅ Missing fingerprints handled gracefully
- ✅ Out-of-order fingerprints matched correctly
- ✅ Packet loss reflected in ACK summary
- ✅ Expired fingerprints cleaned up correctly
- ✅ Timeout scenarios handled gracefully

---

## Category 5: ACK Summary Delivery Testing

### Overview

**Goal:** Verify ACK summary messages are delivered correctly via WebSocket.

**Status:** ⬜ **READY** (1/1 test file created)

---

### Test C5.1: ACK Summary Message Delivery

**Status:** ⬜ **READY FOR EXECUTION**

**Test File:** `backend/src/tests/user_story_3/test-ack-delivery.ts`

**From `dev_specs/public_interfaces.md` line 124:** "ack-summary" message type  
**From `dev_specs/data_schemas.md` DS-05:** AckSummary structure

#### Prerequisites

- Backend server must be running: `cd backend && npm run dev`

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_3/test-ack-delivery.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-ack-delivery.js
```

#### Test Cases

**C5.1.1: Message Format**
- ✅ ACK summary message format matches specification
- ✅ Message contains: `type`, `meetingId`, `ackedUsers`, `missingUsers`, `timestamp`

**C5.1.2: Delivery to Correct Sender**
- ✅ Message delivered to sender via WebSocket
- ✅ Message contains correct `meetingId`

**C5.1.3: Content Correctness**
- ✅ Message contains correct `ackedUsers` and `missingUsers`
- ✅ Receiver in `ackedUsers` when CRC32 matched
- ✅ Receiver in `missingUsers` when CRC32 mismatched

**C5.1.4: Timing (Summary Generated After Window)**
- ✅ ACK summary generated after window (2 seconds)

#### Expected Results

- ✅ ACK delivery tests completed

#### Success Criteria

- ✅ Message format matches `public_interfaces.md` specification
- ✅ Message delivered successfully to sender
- ✅ Content is correct and complete
- ✅ Summary generated after window expires

**Note:** Some tests may show warnings if summary window (2 seconds) has not elapsed. This is expected behavior.

---

## Category 6: UI Component Testing

### Overview

**Goal:** Verify UI component displays ACK feedback correctly.

**Status:** ⬜ **READY** (1/1 test guide created)

---

### Test C6.1: AckIndicator Component

**Status:** ⬜ **READY FOR MANUAL TESTING**

**Component:** `src/components/meeting/AckIndicator.tsx`

**From `dev_specs/user_stories.md` line 23:** "Providing visual or other feedback to confirm that outbound audio is successfully received"

#### Prerequisites

- Backend server running: `cd backend && npm run dev`
- Frontend server running: `npm run dev`
- Browser: Open `http://localhost:5173`

#### Test Cases

**C6.1.1: Empty State (No Summary)**
- ✅ Component displays "Checking audio delivery..." message
- ✅ Gray pulsing indicator shown

**C6.1.2: All ACKed Display**
- ✅ Component shows "X/X hearing you"
- ✅ Success rate shows "100% delivery"
- ✅ Green indicator/color
- ✅ All users listed with checkmarks when expanded

**C6.1.3: All Missing Display**
- ✅ Component shows "0/X hearing you"
- ✅ Success rate shows "0% delivery"
- ✅ Red indicator/color
- ✅ All users listed with X marks when expanded

**C6.1.4: Mixed Display (Some ACKed, Some Missing)**
- ✅ Component shows "X/Y hearing you"
- ✅ Success rate shows correct percentage
- ✅ Yellow/Red indicator/color (based on success rate)
- ✅ ACKed users under "Connected:" with green checkmarks
- ✅ Missing users under "Issues:" with red X marks

**C6.1.5: Expand/Collapse Functionality**
- ✅ Component starts collapsed
- ✅ Clicking expands to show details
- ✅ Clicking again collapses

**C6.1.6: Real-Time Updates**
- ✅ Component updates when ACK summary changes
- ✅ Display reflects new ACK status
- ✅ Color scheme updates based on success rate

#### Manual Testing Instructions

**Test Scenario 1: All ACKed**
1. Join meeting as User A
2. Join meeting as User B (in another browser/tab)
3. User A speaks into microphone
4. Wait for ACK summary (2 seconds)
5. Verify `AckIndicator` shows:
   - "1/1 hearing you" (or "2/2" if both users are senders)
   - Green indicator
   - 100% delivery

**Test Scenario 2: Mixed Results**
1. Join meeting as User A
2. Join meeting as User B
3. User A speaks
4. Simulate packet loss (disconnect User B's network briefly)
5. Wait for ACK summary
6. Verify `AckIndicator` shows:
   - "0/1 hearing you" or "1/2 hearing you"
   - Yellow/Red indicator
   - Lower delivery percentage

**Test Scenario 3: Real-Time Updates**
1. Join meeting with 2+ users
2. Observe `AckIndicator` updates every 2 seconds
3. Verify display reflects current ACK status
4. Verify color changes based on success rate

#### Success Criteria

- ✅ Component renders without errors
- ✅ Displays correct ACK status (ACKed/Missing users)
- ✅ Color scheme matches success rate (green/yellow/red)
- ✅ Expand/collapse functionality works
- ✅ Updates in real-time when ACK summary changes
- ✅ Integration with `App.tsx` complete (onAckSummary callback set up)

**Note:** UI testing requires manual verification or browser automation tools. See Category 6 section above for detailed instructions.

---

## Test Execution Summary

### Overall Progress

**Created:** 8/8 test files (100%)  
**Executed:** 0/8 tests (0%)  
**Passed:** 0 tests  
**Failed:** 0 tests  
**Ready:** 8 tests

### Category-by-Category Status

| Category | Status | Tests Created | Tests Total | Completion |
|----------|--------|--------------|-------------|------------|
| Category 1: Component-Level Testing | ⬜ READY | 2 | 2 | 0% |
| Category 2: Integration Testing | ⬜ READY | 1 | 1 | 0% |
| Category 3: Approximation Behavior Testing | ⬜ READY | 2 | 2 | 0% |
| Category 4: Edge Cases & Error Scenarios | ⬜ READY | 1 | 1 | 0% |
| Category 5: ACK Summary Delivery Testing | ⬜ READY | 1 | 1 | 0% |
| Category 6: UI Component Testing | ⬜ READY | 1 | 1 | 0% |

### Key Achievements

- ✅ All test files created and ready for execution
- ✅ Test structure organized by user story (`user_story_3/` subfolder)
- ✅ All test files compile successfully
- ✅ UI integration complete (`onAckSummary` callback in `App.tsx`)
- ✅ Comprehensive coverage of all components and flows

### Remaining Work

- ⬜ Execute all backend tests (Categories 1-5)
- ⬜ Execute UI component tests (Category 6)
- ⬜ Document test results
- ⬜ Fix any issues found during testing

---

## Quick Reference

### Common Commands

**Start Backend Server:**
```bash
cd backend
npm run dev
```

**Start Frontend Server:**
```bash
# In root directory
npm run dev
```

**Run Individual Test:**
```bash
cd backend
npx tsc src/tests/user_story_3/test-<test-name>.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-<test-name>.js
```

**Run All Tests (Sequential):**
```bash
cd backend
# Compile all tests
for test in src/tests/user_story_3/test-*.ts; do
  npx tsc "$test" --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
done

# Run all tests
node dist/tests/test-fingerprint-verifier.js
node dist/tests/test-ack-aggregator.js
node dist/tests/test-crc32-computation.js
node dist/tests/test-rtp-timestamp-matching.js
node dist/tests/test-edge-cases.js
node dist/tests/test-fingerprint-flow.js
node dist/tests/test-ack-delivery.js
```

**Kill Process on Port 8080:**
```bash
lsof -ti:8080 | xargs kill
```

### File Locations

- **Test Files:** `backend/src/tests/user_story_3/`
  - `test-fingerprint-verifier.ts` (C1.1)
  - `test-ack-aggregator.ts` (C1.2)
  - `test-crc32-computation.ts` (C3.1)
  - `test-rtp-timestamp-matching.ts` (C3.2)
  - `test-edge-cases.ts` (C4.1)
  - `test-fingerprint-flow.ts` (C2.1)
  - `test-ack-delivery.ts` (C5.1)
- **Backend Source:** `backend/src/`
  - `FingerprintVerifier.ts`
  - `AckAggregator.ts`
  - `SignalingServer.ts` (integration)
- **Frontend Source:** `src/`
  - `components/meeting/AckIndicator.tsx` (UI component)
  - `services/UserClient.ts` (fingerprint sending)
  - `services/SignalingClient.ts` (ACK summary callback)
  - `App.tsx` (UI integration)
- **Testing Guides:**
  - `USER_STORY_3_COMPLETE_TESTING_GUIDE.md` (this document)
  - `USER_STORY_3_TECHNICAL_DECISIONS.md` (approximation decisions)
- **Dev Specs:** `assets/dev_specs/` (treat as "holy bible" - all implementation must comply)

---

## Troubleshooting

### Issue: Test Compilation Errors

**Error Message:**
```
error TS2307: Cannot find module '../../FingerprintVerifier'
```

**Solution:**
- Verify test file is in `backend/src/tests/user_story_3/`
- Verify import paths use `../../` to reach `backend/src/`
- Run compilation from `backend/` directory

### Issue: Cannot Connect to WebSocket (Integration Tests)

**Error Message:**
```
ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:8080
```

**Solution:**
- Start backend server: `cd backend && npm run dev`
- Verify server logs show: `[SignalingServer] WebSocket server started on port 8080`
- Check if port 8080 is in use: `lsof -ti:8080 | xargs kill`

### Issue: ACK Summary Not Received

**Check:**
- Backend server is running
- Fingerprints are being sent (check server logs)
- Summary window (2 seconds) has elapsed
- WebSocket connection is still active
- `onAckSummary` callback is set up in `App.tsx`

### Issue: UI Component Not Updating

**Check:**
- `onAckSummary` callback is set up in `App.tsx` (line 106)
- `ackSummary` state is being updated
- `AckIndicator` component receives `summary` prop
- Browser console shows ACK summary received

### Issue: Fingerprint Verification Not Working

**Check:**
- Sender fingerprints are being sent (50 fps, 20ms intervals)
- Receiver fingerprints are being sent (50 fps, 20ms intervals)
- Frame IDs match between sender and receiver
- RTP timestamps are within tolerance window (±50ms)
- Server logs show fingerprint comparison

---

## Notes for Testing Engineers

### What Has Been Created

- ✅ **Test Files:** All 7 backend test files created and ready
- ✅ **Test Plan:** Comprehensive testing plan document
- ✅ **UI Testing Guide:** Manual testing instructions for UI component
- ✅ **UI Integration:** `onAckSummary` callback integrated in `App.tsx`

### What Still Needs Testing

- ⬜ **Execute Backend Tests:** Run all test files and verify results
- ⬜ **Execute UI Tests:** Manual testing of `AckIndicator` component
- ⬜ **Document Results:** Record test results and any issues found

### Testing Approach

1. **Start with Component Tests:** Run Category 1 tests first (FingerprintVerifier, AckAggregator)
2. **Then Approximation Tests:** Verify CRC32 computation and RTP timestamp matching
3. **Then Integration Tests:** Verify end-to-end fingerprint flow
4. **Then Edge Cases:** Verify error handling and edge cases
5. **Then Delivery Tests:** Verify ACK summary message delivery
6. **Finally UI Tests:** Manual testing of UI component

### Known Limitations

#### Approximation Approaches

- **CRC32 on PCM Frames:** Sender CRC32 is computed on PCM frames (before encoding) as an approximation for encoded frames. This is documented in `USER_STORY_3_TECHNICAL_DECISIONS.md` Decision 1.
- **RTP Timestamp Matching:** Frame matching uses RTP timestamp with ±50ms tolerance window as an approximation for packet loss scenarios. This is documented in `USER_STORY_3_TECHNICAL_DECISIONS.md` Decision 2.

#### Test Timing

- **Summary Window:** ACK summaries are generated every 2 seconds. Tests may need to wait for this window to elapse.
- **TTL Cleanup:** Fingerprints expire after 15 seconds. Cleanup runs every 5 seconds.

#### UI Testing

- **Manual Verification:** UI component testing requires manual verification or browser automation tools.
- **Real-Time Updates:** UI updates depend on ACK summary delivery via WebSocket, which requires active backend server and WebSocket connection.

---

## References

- **Dev Specs:** `assets/dev_specs/` (treat as "holy bible")
  - `user_stories.md` - User Story 3 requirements
  - `flow_charts.md` - Fingerprint verification flow (lines 163-198)
  - `state_diagrams.md` - Fingerprint verification state machine
  - `data_schemas.md` - DS-04 (FrameFingerprint), DS-05 (AckSummary)
  - `APIs.md` - FingerprintVerifier and AckAggregator APIs
  - `public_interfaces.md` - WebSocket message formats
- **Implementation Guides:**
  - `USER_STORY_3_IMPLEMENTATION_GUIDE.md` - Implementation details
  - `USER_STORY_3_TECHNICAL_DECISIONS.md` - Technical decisions for approximations
  - `USER_STORY_11_IMPLEMENTATION_GUIDE.md` - Dependencies and risks
- **Testing Guides:**
  - `USER_STORY_3_COMPLETE_TESTING_GUIDE.md` - Complete testing guide (this document)
  - `USER_STORY_11_COMPLETE_TESTING_GUIDE.md` - Reference for testing structure

---

**Last Updated:** November 9, 2025  
**Document Version:** 1.0  
**Status:** Test Files Created, Ready for Execution

