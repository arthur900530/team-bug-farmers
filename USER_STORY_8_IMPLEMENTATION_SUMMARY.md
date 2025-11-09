# User Story 8: Implementation Summary - Key Changes Required

**Purpose:** Quick reference for what must be changed to implement User Story 8  
**Last Updated:** November 9, 2025

---

## 🎯 Core Components to Create

### Backend (3 new classes)

1. **`RtcpCollector.ts`** - NEW
   - Collect RTCP reports from receivers
   - Maintain sliding window (last 10 reports per user)
   - Compute worst receiver loss per meeting

2. **`QualityController.ts`** - NEW
   - Decide tier based on worst receiver loss
   - Apply 2% hysteresis to prevent rapid changes
   - Broadcast tier changes to all participants

3. **`RtcpReport` interface** - ADD to `backend/src/types.ts`
   - Already exists in frontend, needs to be added to backend

---

## 🔧 Components to Modify

### Backend Modifications

#### 1. `MediasoupManager.ts` - EXTEND
**Current Issue:** Only tracks consumers by `consumer.id`, not by `userId`

**Changes:**
- Add `Map<userId, Consumer[]>` to track consumers per user
- Add `getConsumersForUser(userId: string): Consumer[]` method
- Update `createConsumer()` to add consumer to user's list
- Update `cleanupUser()` to remove user's consumers

**Why:** Needed for `StreamForwarder` to switch layers for all consumers of a user

---

#### 2. `StreamForwarder.ts` - IMPLEMENT
**Current Status:** Stub exists, needs actual mediasoup integration

**Changes:**
- Implement `setTier()` to call `consumer.setPreferredLayers({ spatialLayer })`
- Get all consumers for all recipients in meeting
- Switch layers: LOW=0, MEDIUM=1, HIGH=2

**Note:** Must verify `setPreferredLayers()` API exists in mediasoup v3.19.7

---

#### 3. `SignalingServer.ts` - INTEGRATE
**Changes:**
- Initialize `RtcpCollector` and `QualityController` in constructor
- Add `handleRtcpReport()` method (new WebSocket message type: `rtcp-report`)
- Add periodic evaluation (every 5 seconds) to check and update tiers
- Add `sendTierChange()` method to broadcast tier changes

---

#### 4. `backend/src/types.ts` - ADD TYPES
**Add:**
- `RtcpReport` interface (from `data_schemas.md` DS-03)
- `RtcpReportMessage` interface (WebSocket message format)
- Add `RtcpReportMessage` to `ClientMessage` union type

---

#### 5. `backend/src/server.ts` - INITIALIZE
**Changes:**
- Initialize `RtcpCollector` and `QualityController`
- Pass to `SignalingServer` constructor

---

### Frontend Modifications

#### 1. `UserClient.ts` - ADD RTCP FUNCTIONALITY
**Changes:**
- Add `extractRtcpMetrics()` - Extract from WebRTC stats (handle null/undefined)
- Add `sendRtcpReport()` - Send to server (skip if metrics null)
- Add `startRtcpReporting()` - Start 5-second interval
- Add `stopRtcpReporting()` - Stop interval
- Add tier change handling - Register `onTierChange` callback

**Integration:**
- Start RTCP reporting when audio track received (`ontrack` handler)
- Stop RTCP reporting when leaving meeting

---

#### 2. `SignalingClient.ts` - ADD RTCP SENDING
**Changes:**
- Add `sendRtcpReport(report: RtcpReport): void` method

---

#### 3. `src/types/index.ts` - ADD MESSAGE TYPE
**Add:**
- `RtcpReportMessage` interface (RtcpReport already exists)

---

#### 4. `App.tsx` - INTEGRATE TIER CHANGES
**Changes:**
- Register `onTierChange` callback in `handleJoinMeeting()`
- Update `currentTier` state when tier changes
- Pass `currentTier` to `QualityIndicator` component

---

## ⚠️ Critical Integration Points

### 1. Mediasoup Consumer Tracking
**Problem:** MediasoupManager doesn't track which consumers belong to which user

**Solution:** Add `Map<userId, Consumer[]>` mapping

**Impact:** Required for `StreamForwarder.setTier()` to switch layers

---

### 2. RTCP Stats Availability
**Problem:** WebRTC stats may not be available immediately

**Solution:** Handle null/undefined gracefully, skip sending if unavailable

**Impact:** Prevents errors, allows system to work even if stats delayed

---

### 3. Tier Change Hysteresis
**Problem:** Rapid tier changes can cause instability

**Solution:** 2% hysteresis prevents oscillation

**Implementation:**
- HIGH → MEDIUM: loss ≥ 4% (2% + 2%)
- MEDIUM → LOW: loss ≥ 5%
- MEDIUM → HIGH: loss < 2%
- LOW → MEDIUM: loss < 3% (5% - 2%)

---

### 4. Message Format Consistency
**Problem:** Need to ensure RTCP message format matches existing patterns

**Solution:** Follow same structure as `FingerprintMessage` and `AckSummaryMessage`

**Format:**
```typescript
{
  type: 'rtcp-report',
  userId: string,
  lossPct: number,
  jitterMs: number,
  rttMs: number,
  timestamp: number
}
```

---

## 🔍 Verification Required

### Before Implementation

1. **Mediasoup API Verification**
   - Verify `consumer.setPreferredLayers({ spatialLayer: number })` exists in v3.19.7
   - Check mediasoup documentation for exact API signature
   - Test with a simple consumer to confirm it works

2. **WebRTC Stats Timing**
   - Test when `inbound-rtp` stats become available after connection
   - Verify stats structure matches expected format
   - Test null/undefined handling

3. **Consumer Tracking**
   - Verify current consumer tracking in MediasoupManager
   - Plan migration to `Map<userId, Consumer[]>` structure
   - Ensure cleanup works correctly

---

## 📊 Implementation Order

### Phase 1: Backend Foundation
1. Add `RtcpReport` and `RtcpReportMessage` to `backend/src/types.ts`
2. Create `RtcpCollector.ts`
3. Create `QualityController.ts`
4. Extend `MediasoupManager.ts` with consumer tracking

### Phase 2: Backend Integration
5. Update `SignalingServer.ts` - Add RTCP handling and periodic evaluation
6. Update `StreamForwarder.ts` - Implement layer switching
7. Update `server.ts` - Initialize new components

### Phase 3: Frontend Foundation
8. Add `RtcpReportMessage` to `src/types/index.ts`
9. Update `SignalingClient.ts` - Add `sendRtcpReport()` method

### Phase 4: Frontend Integration
10. Update `UserClient.ts` - Add RTCP extraction and sending
11. Update `UserClient.ts` - Add tier change handling
12. Update `App.tsx` - Integrate tier changes

### Phase 5: Testing
13. Test RTCP extraction and sending
14. Test tier decision logic
15. Test mediasoup layer switching
16. Test end-to-end flow

---

## 🚨 Risks to Watch

1. **Mediasoup API Compatibility**
   - Risk: `setPreferredLayers()` may not exist or work differently
   - Mitigation: Verify API before implementing

2. **Consumer Tracking Migration**
   - Risk: Breaking existing consumer cleanup
   - Mitigation: Test cleanup thoroughly after adding tracking

3. **RTCP Stats Timing**
   - Risk: Stats not available when expected
   - Mitigation: Handle null/undefined gracefully from start

4. **Tier Change Oscillation**
   - Risk: Rapid tier changes cause instability
   - Mitigation: 2% hysteresis prevents this

---

## ✅ Decisions Made

1. ✅ **Mediasoup API:** Use `setPreferredLayers()` (verify during implementation)
2. ✅ **RTCP Message Format:** Defined (consistent with existing patterns)
3. ✅ **Hysteresis:** 2% to prevent rapid changes
4. ✅ **Null Handling:** Graceful from start
5. ✅ **Per-Meeting Tier:** Worst receiver determines tier for all

---

**END OF SUMMARY**

*For detailed implementation instructions, see `USER_STORY_8_IMPLEMENTATION_GUIDE.md`*

