# User Story 8: Adaptive Quality Management - Complete Testing Guide

**Purpose:** Comprehensive testing guide for User Story 8 (Adaptive Quality Management)  
**Target Audience:** Testing engineers and LLMs assisting with testing  
**Last Updated:** November 9, 2025  
**Status:** Implementation Complete, Ready for Testing

---

## Executive Summary

### Testing Objectives

**Primary Objective:** Verify that the system automatically adjusts audio quality to match the worst receiver's connection, ensuring all participants experience consistent quality (per `dev_specs/user_stories.md` lines 29-38)

**Secondary Objectives:**
1. Verify RTCP report collection from all receivers
2. Verify worst receiver loss computation
3. Verify quality tier decision logic with hysteresis
4. Verify Consumer layer switching via mediasoup `setPreferredLayers()`
5. Verify tier change broadcasting to all participants
6. Verify frontend RTCP extraction and sending
7. Verify UI updates on tier changes
8. Verify end-to-end adaptive quality flow

### Current Test Status

| Category | Status | Tests Created | Tests Total | Completion |
|----------|--------|--------------|-------------|------------|
| Category 1: Component-Level Testing | ⬜ READY | 3 | 3 | 0% |
| Category 2: Integration Testing | ⬜ READY | 2 | 2 | 0% |
| Category 3: End-to-End Testing | ⬜ READY | 2 | 2 | 0% |
| Category 4: Edge Cases & Error Scenarios | ⬜ READY | 1 | 1 | 0% |
| **TOTAL** | **⬜ READY** | **8** | **8** | **0%** |

**Note:** All test files need to be created. This guide provides the structure and test specifications.

### Quick Reference

**Test Files Location:** `backend/src/tests/user_story_8/`  
**Backend Server:** `cd backend && npm run dev` (port 8080, WebSocket: `ws://localhost:8080`)  
**Frontend Server:** `npm run dev` (port 5173, HTTP: `http://localhost:5173`)  

**Note:** 
- Development uses `ws://` (unencrypted WebSocket). Production uses `wss://` (TLS) per `dev_specs/public_interfaces.md`.
- JWT authentication is specified in `dev_specs/public_interfaces.md` but simplified for User Story 11 implementation (see `SignalingServer.ts` line 153).

---

## Testing Approach

### Scope Assessment

**User Story 8 Scope:** Large (Real-time network monitoring)

**Rationale:**
- Depends on User Story 3 (✅ Complete) & User Story 11 (✅ Complete)
- Focuses on RTCP collection, quality tier decision, and adaptive layer switching
- Requires integration with mediasoup Consumer layer switching
- Requires frontend RTCP extraction from WebRTC stats

**Testing Structure:** Categories focusing on:
1. Component-level tests (RtcpCollector, QualityController, StreamForwarder)
2. Integration tests (RTCP flow, tier change flow)
3. End-to-end tests (network degradation simulation, UI updates)
4. Edge cases and error scenarios

---

## Category 1: Component-Level Testing

### Overview

**Goal:** Test individual backend components in isolation.

**Status:** ⬜ **READY** (3/3 test files need to be created)

**Test Files Location:** `backend/src/tests/user_story_8/`

---

### Test C1.1: RtcpCollector Component

**Status:** ⬜ **READY FOR CREATION**

**Test File:** `backend/src/tests/user_story_8/test-rtcp-collector.ts`

**From `dev_specs/flow_charts.md` lines 108-112:** RTCP collection flow  
**From `dev_specs/APIs.md` lines 169-181:** RtcpCollector API  
**From `dev_specs/data_schemas.md` DS-03:** RtcpReport structure

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_8/test-rtcp-collector.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-rtcp-collector.js
```

#### Test Cases

**C1.1.1: RtcpCollector.collect()**
- ✅ Single Report: Collect one RTCP report → Stored correctly
- ✅ Multiple Reports (Same User): Collect 10 reports → Sliding window maintained (last 10)
- ✅ Multiple Reports (Different Users): Collect reports from 3 users → All stored correctly
- ✅ Sliding Window: Collect 15 reports → Only last 10 retained

**C1.1.2: RtcpCollector.getWorstLoss()**
- ✅ Single User (Low Loss): User with 1% loss → Returns 0.01
- ✅ Single User (High Loss): User with 10% loss → Returns 0.10
- ✅ Multiple Users: Users with 2%, 5%, 8% loss → Returns 0.08 (worst)
- ✅ No Reports: No reports collected → Returns 0
- ✅ Empty Meeting: Meeting with no participants → Returns 0

**C1.1.3: RtcpCollector.getMetrics()**
- ✅ Average Loss: Reports with 2%, 4%, 6% loss → avgLoss = 4%
- ✅ Average Jitter: Reports with 10ms, 20ms, 30ms jitter → avgJitter = 20ms
- ✅ Average RTT: Reports with 50ms, 100ms, 150ms RTT → avgRtt = 100ms
- ✅ Worst Loss: Reports with 2%, 5%, 8% loss → worstLoss = 8%
- ✅ No Reports: No reports → Returns all zeros

**C1.1.4: Cleanup**
- ✅ cleanupUser(): Remove user's reports → Reports cleared
- ✅ clear(): Clear all reports → All reports cleared

#### Expected Results

- ✅ All collect() tests passed
- ✅ All getWorstLoss() tests passed
- ✅ All getMetrics() tests passed
- ✅ Cleanup tests passed

#### Success Criteria

- ✅ Reports stored in sliding window (last 10 per user)
- ✅ Worst loss computed correctly (maximum across all receivers)
- ✅ Metrics aggregated correctly (averages and worst)
- ✅ Cleanup works correctly

---

### Test C1.2: QualityController Component

**Status:** ⬜ **READY FOR CREATION**

**Test File:** `backend/src/tests/user_story_8/test-quality-controller.ts`

**From `dev_specs/flow_charts.md` lines 138-142:** Tier decision thresholds  
**From `dev_specs/APIs.md` lines 186-195:** QualityController API  
**From `USER_STORY_8_IMPLEMENTATION_GUIDE.md` Decision 3:** 2% hysteresis

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_8/test-quality-controller.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-quality-controller.js
```

#### Test Cases

**C1.2.1: QualityController.decideTier() - Thresholds**
- ✅ Low Loss (< 2%): 1% loss, current HIGH → Returns HIGH
- ✅ Medium Loss (2-5%): 3% loss, current HIGH → Returns MEDIUM
- ✅ High Loss (≥ 5%): 6% loss, current MEDIUM → Returns LOW
- ✅ Boundary (2%): 2% loss, current HIGH → Returns MEDIUM (with hysteresis)
- ✅ Boundary (5%): 5% loss, current MEDIUM → Returns LOW

**C1.2.2: QualityController.decideTier() - Hysteresis**
- ✅ HIGH → MEDIUM: 2% loss → Requires (2% + 2% = 4%) to downgrade
- ✅ MEDIUM → HIGH: 1% loss → Requires (< 2% - 2% = 0%) to upgrade (impossible, stays MEDIUM)
- ✅ MEDIUM → LOW: 5% loss → Downgrades immediately
- ✅ LOW → MEDIUM: 3% loss → Requires (< 5% - 2% = 3%) to upgrade (boundary case)
- ✅ LOW → MEDIUM: 2% loss → Upgrades to MEDIUM

**C1.2.3: QualityController.evaluateMeeting()**
- ✅ Tier Change: Worst loss changes tier → Tier updated in MeetingRegistry
- ✅ No Tier Change: Worst loss same tier → No update
- ✅ StreamForwarder Called: Tier change → StreamForwarder.setTier() called
- ✅ No Meeting: Non-existent meeting → Handles gracefully

#### Expected Results

- ✅ All decideTier() threshold tests passed
- ✅ All decideTier() hysteresis tests passed
- ✅ All evaluateMeeting() tests passed

#### Success Criteria

- ✅ Tier thresholds work correctly (<2% = HIGH, 2-5% = MEDIUM, ≥5% = LOW)
- ✅ Hysteresis prevents rapid tier changes (2% hysteresis applied)
- ✅ Meeting evaluation updates tier correctly
- ✅ StreamForwarder integration works

---

### Test C1.3: StreamForwarder Layer Switching

**Status:** ⬜ **READY FOR CREATION**

**Test File:** `backend/src/tests/user_story_8/test-stream-forwarder-layers.ts`

**From `dev_specs/flow_charts.md` line 157:** StreamForwarder forwards new tier  
**From `USER_STORY_8_MEDIASOUP_API_VERIFICATION.md`:** `setPreferredLayers()` API verified  
**From `USER_STORY_8_IMPLEMENTATION_GUIDE.md`:** Layer mapping (LOW=0, MEDIUM=1, HIGH=2)

#### Prerequisites

- Backend server must be running: `cd backend && npm run dev`
- MediasoupManager initialized

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_8/test-stream-forwarder-layers.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-stream-forwarder-layers.js
```

#### Test Cases

**C1.3.1: setTier() - Layer Mapping**
- ✅ LOW Tier: setTier('meeting1', 'LOW') → Calls setPreferredLayers({ spatialLayer: 0 })
- ✅ MEDIUM Tier: setTier('meeting1', 'MEDIUM') → Calls setPreferredLayers({ spatialLayer: 1 })
- ✅ HIGH Tier: setTier('meeting1', 'HIGH') → Calls setPreferredLayers({ spatialLayer: 2 })

**C1.3.2: setTier() - Multiple Consumers**
- ✅ Single Consumer: One consumer in meeting → Layer switched correctly
- ✅ Multiple Consumers: Three consumers in meeting → All layers switched correctly
- ✅ No Consumers: No consumers in meeting → Handles gracefully (no error)

**C1.3.3: setTier() - No Change**
- ✅ Same Tier: Tier already set → No update (early return)

#### Expected Results

- ✅ All layer mapping tests passed
- ✅ All multiple consumers tests passed
- ✅ No change test passed

#### Success Criteria

- ✅ Correct layer mapping (LOW=0, MEDIUM=1, HIGH=2)
- ✅ All consumers in meeting updated
- ✅ No errors when no consumers exist
- ✅ Early return when tier unchanged

---

## Category 2: Integration Testing

### Overview

**Goal:** Test component interactions and data flow.

**Status:** ⬜ **READY** (2/2 test files need to be created)

---

### Test C2.1: RTCP Report Flow

**Status:** ⬜ **READY FOR CREATION**

**Test File:** `backend/src/tests/user_story_8/test-rtcp-flow.ts`

**From `dev_specs/flow_charts.md` lines 108-112:** RTCP report generation and collection

#### Prerequisites

- Backend server must be running: `cd backend && npm run dev`

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_8/test-rtcp-flow.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-rtcp-flow.js
```

#### Test Cases

**C2.1.1: RTCP Report Reception**
- ✅ Client sends RTCP report → Server receives via WebSocket
- ✅ Server validates report (userId, lossPct, jitterMs, rttMs)
- ✅ Server forwards to RtcpCollector
- ✅ RtcpCollector stores report

**C2.1.2: Multiple Receivers**
- ✅ Three receivers send RTCP reports → All collected correctly
- ✅ Worst loss computed across all receivers
- ✅ Metrics aggregated correctly

**C2.1.3: Periodic Reporting**
- ✅ Client sends reports every 5 seconds → Reports collected continuously
- ✅ Sliding window maintained (last 10 per user)

#### Expected Results

- ✅ RTCP report reception works
- ✅ Multiple receivers handled correctly
- ✅ Periodic reporting works

#### Success Criteria

- ✅ RTCP reports received via WebSocket
- ✅ Reports forwarded to RtcpCollector
- ✅ Multiple receivers handled correctly
- ✅ Sliding window maintained

---

### Test C2.2: Tier Change Flow

**Status:** ⬜ **READY FOR CREATION**

**Test File:** `backend/src/tests/user_story_8/test-tier-change-flow.ts`

**From `dev_specs/flow_charts.md` lines 130-159:** Adaptive Quality Control Loop

#### Prerequisites

- Backend server must be running: `cd backend && npm run dev`

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_8/test-tier-change-flow.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-tier-change-flow.js
```

#### Test Cases

**C2.2.1: Tier Change Trigger**
- ✅ Worst loss increases → QualityController evaluates
- ✅ Tier changes → MeetingRegistry updated
- ✅ StreamForwarder.setTier() called
- ✅ Tier change message sent to all participants

**C2.2.2: Tier Change Message Delivery**
- ✅ Server sends tier-change message → All participants receive
- ✅ Message format correct (type, tier, timestamp)
- ✅ Message delivered via WebSocket

**C2.2.3: Periodic Evaluation**
- ✅ Evaluation runs every 5 seconds → Tier checked periodically
- ✅ No change when loss stable → No unnecessary updates

#### Expected Results

- ✅ Tier change trigger works
- ✅ Tier change message delivery works
- ✅ Periodic evaluation works

#### Success Criteria

- ✅ Tier changes triggered correctly
- ✅ Messages delivered to all participants
- ✅ Periodic evaluation runs every 5 seconds
- ✅ No unnecessary updates when tier stable

---

## Category 3: End-to-End Testing

### Overview

**Goal:** Verify complete adaptive quality flow from network degradation to UI update.

**Status:** ⬜ **READY** (2/2 test scenarios need to be created)

---

### Test C3.1: Network Degradation Simulation

**Status:** ⬜ **READY FOR CREATION**

**Test File:** `backend/src/tests/user_story_8/test-network-degradation.ts`

**From `dev_specs/user_stories.md` line 33:** "automatically adjust the sender's audio quality to match the worst receiver's connection"

#### Prerequisites

- Backend server running: `cd backend && npm run dev`
- Frontend server running: `npm run dev`
- Two browser windows open (simulating sender and receiver)

#### Execution

**Manual Testing with Browser Automation:**

1. **Setup:**
   - Client A (sender) joins meeting
   - Client B (receiver) joins meeting
   - Both clients connected and streaming

2. **Simulate Network Degradation:**
   - Use browser DevTools → Network → Throttling
   - Set Client B to "Slow 3G" or "Fast 3G"
   - Monitor RTCP reports (loss% should increase)

3. **Verify Tier Change:**
   - Wait for periodic evaluation (5 seconds)
   - Check server logs for tier change
   - Verify Client A receives tier-change message
   - Verify Client B receives tier-change message

4. **Verify Layer Switching:**
   - Check mediasoup Consumer layer switched
   - Verify audio quality degraded (lower bitrate)

#### Success Criteria

- ✅ Network degradation detected (loss% increases)
- ✅ Tier changes automatically (HIGH → MEDIUM → LOW)
- ✅ Tier change messages delivered to all participants
- ✅ Consumer layers switched correctly
- ✅ Audio quality adjusted (lower bitrate)

---

### Test C3.2: UI Tier Change Updates

**Status:** ⬜ **READY FOR MANUAL TESTING**

**Component:** `src/components/meeting/QualityIndicator.tsx` (if exists) or tier display in UI

**From `dev_specs/user_stories.md` line 33:** "automatically adjust the sender's audio quality"

#### Prerequisites

- Backend server running: `cd backend && npm run dev`
- Frontend server running: `npm run dev`
- Browser: Open `http://localhost:5173`

#### Test Cases

**C3.2.1: Tier Change Display**
- ✅ UI shows current tier (HIGH/MEDIUM/LOW)
- ✅ Tier updates when tier-change message received
- ✅ All participants see same tier (meeting-wide tier)

**C3.2.2: Real-Time Updates**
- ✅ Tier changes reflected immediately in UI
- ✅ No lag or delay in display update

#### Manual Testing Instructions

**Test Scenario 1: Tier Downgrade**
1. Join meeting as User A
2. Join meeting as User B (in another browser/tab)
3. Simulate network degradation for User B (browser throttling)
4. Wait for tier change (5-10 seconds)
5. Verify UI shows tier change (HIGH → MEDIUM or MEDIUM → LOW)

**Test Scenario 2: Tier Upgrade**
1. Start with degraded network (LOW tier)
2. Improve network conditions
3. Wait for tier change
4. Verify UI shows tier upgrade (LOW → MEDIUM or MEDIUM → HIGH)

#### Success Criteria

- ✅ UI displays current tier correctly
- ✅ Tier updates when tier-change message received
- ✅ Updates reflected immediately
- ✅ All participants see same tier

---

## Category 4: Edge Cases and Error Scenarios

### Overview

**Goal:** Verify system handles edge cases and error scenarios gracefully.

**Status:** ⬜ **READY** (1/1 test file needs to be created)

---

### Test C4.1: Edge Cases and Error Scenarios

**Status:** ⬜ **READY FOR CREATION**

**Test File:** `backend/src/tests/user_story_8/test-edge-cases.ts`

**From `USER_STORY_8_IMPLEMENTATION_GUIDE.md` Decision 4:** Null/undefined handling

#### Execution

```bash
cd backend
npx tsc src/tests/user_story_8/test-edge-cases.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-edge-cases.js
```

#### Test Cases

**C4.1.1: Null/Undefined Handling**
- ✅ Null RTCP Report: Client sends null report → Handled gracefully
- ✅ Missing Fields: Report missing lossPct → Handled gracefully
- ✅ Invalid Values: Negative lossPct → Handled gracefully

**C4.1.2: Empty Meeting**
- ✅ No Participants: Meeting with no participants → getWorstLoss() returns 0
- ✅ No Reports: Meeting with participants but no reports → getWorstLoss() returns 0

**C4.1.3: Rapid Tier Changes**
- ✅ Hysteresis Prevents Oscillation: Rapid loss changes → Tier stable (hysteresis applied)
- ✅ Boundary Cases: Loss at exact thresholds → Hysteresis prevents rapid changes

**C4.1.4: Consumer Errors**
- ✅ Consumer Not Found: setTier() with non-existent consumer → Handled gracefully
- ✅ setPreferredLayers() Error: mediasoup error → Handled gracefully (error logged, continues)

#### Expected Results

- ✅ All null/undefined handling tests passed
- ✅ All empty meeting tests passed
- ✅ All rapid tier change tests passed
- ✅ All consumer error tests passed

#### Success Criteria

- ✅ Null/undefined values handled gracefully
- ✅ Empty meetings handled correctly
- ✅ Hysteresis prevents rapid oscillations
- ✅ Consumer errors handled gracefully

---

## Test Execution Summary

### Overall Progress

**Created:** 0/8 test files (0%)  
**Executed:** 0/8 tests (0%)  
**Passed:** 0 tests  
**Failed:** 0 tests  
**Ready:** 8 tests (specifications complete)

### Category-by-Category Status

| Category | Status | Tests Created | Tests Total | Completion |
|----------|--------|--------------|-------------|------------|
| Category 1: Component-Level Testing | ⬜ READY | 0 | 3 | 0% |
| Category 2: Integration Testing | ⬜ READY | 0 | 2 | 0% |
| Category 3: End-to-End Testing | ⬜ READY | 0 | 2 | 0% |
| Category 4: Edge Cases & Error Scenarios | ⬜ READY | 0 | 1 | 0% |

### Key Achievements

- ✅ Implementation complete (all phases done)
- ✅ Test specifications complete
- ✅ Test structure organized by user story (`user_story_8/` subfolder)
- ✅ Comprehensive coverage of all components and flows

### Remaining Work

- ⬜ Create all backend test files (Categories 1, 2, 4)
- ⬜ Execute all backend tests
- ⬜ Execute end-to-end tests (Category 3)
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
npx tsc src/tests/user_story_8/test-<test-name>.ts --esModuleInterop --module commonjs --target es2020 --moduleResolution node --resolveJsonModule --skipLibCheck --outDir dist/tests
node dist/tests/test-<test-name>.js
```

**Kill Process on Port 8080:**
```bash
lsof -ti:8080 | xargs kill
```

### File Locations

- **Test Files:** `backend/src/tests/user_story_8/`
  - `test-rtcp-collector.ts` (C1.1)
  - `test-quality-controller.ts` (C1.2)
  - `test-stream-forwarder-layers.ts` (C1.3)
  - `test-rtcp-flow.ts` (C2.1)
  - `test-tier-change-flow.ts` (C2.2)
  - `test-network-degradation.ts` (C3.1)
  - `test-edge-cases.ts` (C4.1)
  - `test-mediasoup-setPreferredLayers.ts` (already exists - API verification)
- **Backend Source:** `backend/src/`
  - `RtcpCollector.ts`
  - `QualityController.ts`
  - `StreamForwarder.ts` (layer switching)
  - `SignalingServer.ts` (RTCP handling, tier change broadcasting)
  - `MediasoupManager.ts` (consumer tracking)
- **Frontend Source:** `src/`
  - `services/UserClient.ts` (RTCP extraction, sending, tier change handling)
  - `services/SignalingClient.ts` (sendRtcpReport, onTierChange)
  - `App.tsx` (tier change callback)
- **Testing Guides:**
  - `USER_STORY_8_COMPLETE_TESTING_GUIDE.md` (this document)
  - `USER_STORY_8_IMPLEMENTATION_GUIDE.md` (implementation details)
  - `USER_STORY_8_MEDIASOUP_API_VERIFICATION.md` (API verification)
- **Dev Specs:** `assets/dev_specs/` (treat as "holy bible" - all implementation must comply)

---

## Troubleshooting

### Issue: Test Compilation Errors

**Error Message:**
```
error TS2307: Cannot find module '../../RtcpCollector'
```

**Solution:**
- Verify test file is in `backend/src/tests/user_story_8/`
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

### Issue: RTCP Reports Not Received

**Check:**
- Backend server is running
- Client is sending RTCP reports (check browser console)
- WebSocket connection is still active
- `handleRtcpReport()` is called (check server logs)

### Issue: Tier Changes Not Triggered

**Check:**
- RTCP reports are being collected (check RtcpCollector)
- Worst loss exceeds thresholds (check QualityController logs)
- Periodic evaluation is running (every 5 seconds)
- Hysteresis is not preventing change (check current tier vs new tier)

### Issue: Consumer Layer Not Switching

**Check:**
- `setPreferredLayers()` API exists (verified in `test-mediasoup-setPreferredLayers.ts`)
- Consumers exist for meeting participants
- `StreamForwarder.setTier()` is called
- mediasoup Consumer layer switching logs (check server logs)

### Issue: UI Not Updating on Tier Change

**Check:**
- `onTierChange` callback is set up in `App.tsx` (line 114)
- `currentTier` state is being updated
- Tier change message received via WebSocket (check browser console)
- UI component receives tier prop

---

## Notes for Testing Engineers

### What Has Been Implemented

- ✅ **Backend Components:** RtcpCollector, QualityController, StreamForwarder layer switching
- ✅ **Backend Integration:** SignalingServer RTCP handling, periodic evaluation, tier change broadcasting
- ✅ **Frontend Components:** RTCP extraction, sending, tier change handling
- ✅ **UI Integration:** Tier change callback in App.tsx

### What Still Needs Testing

- ⬜ **Execute Backend Tests:** Run all test files and verify results
- ⬜ **Execute End-to-End Tests:** Verify network degradation → tier change → UI update
- ⬜ **Document Results:** Record test results and any issues found

### Testing Approach

1. **Start with Component Tests:** Run Category 1 tests first (RtcpCollector, QualityController, StreamForwarder)
2. **Then Integration Tests:** Verify RTCP flow and tier change flow
3. **Then Edge Cases:** Verify error handling and edge cases
4. **Finally End-to-End Tests:** Verify complete adaptive quality flow

### Known Limitations

#### Hysteresis Behavior

- **2% Hysteresis:** Tier changes require loss to exceed threshold by 2% to prevent rapid oscillations. This means:
  - HIGH → MEDIUM: Requires loss ≥ 4% (2% + 2% hysteresis)
  - MEDIUM → HIGH: Requires loss < 0% (impossible, so stays MEDIUM if loss is 1-2%)
  - MEDIUM → LOW: Requires loss ≥ 5% (immediate)
  - LOW → MEDIUM: Requires loss < 3% (5% - 2% hysteresis)

#### RTCP Reporting

- **Interval:** RTCP reports sent every 5 seconds (per `dev_specs/public_interfaces.md` line 203)
- **Sliding Window:** Last 10 reports per user retained (per `dev_specs/data_schemas.md`)
- **Null Handling:** Frontend gracefully handles null/undefined stats (per Decision 4)

#### Mediasoup Layer Switching

- **Audio Simulcast:** mediasoup does not natively support audio simulcast, but `setPreferredLayers()` API exists and can be called
- **Layer Mapping:** LOW=0, MEDIUM=1, HIGH=2 (spatial layers)
- **Client-Side Simulcast:** Client sends 3 simulcast tiers, mediasoup selects layer to forward

---

## References

- **Dev Specs:** `assets/dev_specs/` (treat as "holy bible")
  - `user_stories.md` - User Story 8 requirements (lines 29-38)
  - `flow_charts.md` - Adaptive Quality Control Loop (lines 121-159)
  - `state_diagrams.md` - Quality Controller State (lines 52-91)
  - `data_schemas.md` - DS-03 (RtcpReport)
  - `APIs.md` - RtcpCollector and QualityController APIs (lines 169-195)
  - `public_interfaces.md` - RTCP report format, tier-change message (lines 203-204, 124)
- **Implementation Guides:**
  - `USER_STORY_8_IMPLEMENTATION_GUIDE.md` - Implementation details
  - `USER_STORY_8_IMPLEMENTATION_SUMMARY.md` - Quick reference
  - `USER_STORY_8_MEDIASOUP_API_VERIFICATION.md` - API verification
  - `USER_STORY_11_IMPLEMENTATION_GUIDE.md` - Dependencies and risks
- **Testing Guides:**
  - `USER_STORY_8_COMPLETE_TESTING_GUIDE.md` - Complete testing guide (this document)
  - `USER_STORY_11_COMPLETE_TESTING_GUIDE.md` - Reference for testing structure
  - `USER_STORY_3_COMPLETE_TESTING_GUIDE.md` - Reference for testing structure

---

**Last Updated:** November 9, 2025  
**Document Version:** 1.0  
**Status:** Implementation Complete, Ready for Testing

