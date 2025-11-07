# User Stories

---

## **User Story 11 — Establishing Initial Audio Connection**
**Story:**  
“As a user, I want my audio to be transmitted seamlessly from my device through the server to other participants so that my voice is heard clearly during the call.”

**What it’s about:**  
Ensuring audio propagates from the sender → server → receiver without interruption.

**Size:** Large (Real-time packet sending)

---

## **User Story 3 — Real-Time Audio Feedback**  
**Depends on:** User Story 11

**Story:**  
“As a user, I want real-time feedback showing that other participants can hear me so that I can confidently speak without having to ask ‘can you hear me?’ every call.”

**What it’s about:**  
Providing visual or other feedback to confirm that outbound audio is successfully received by other participants.

**Size:** Large (Real-time audio processing)

---

## **User Story 8 — Adaptive Quality Management**  
**Depends on:** User Story 3 & 11

**Story:**  
“As a user, I want the call to automatically adjust the sender's audio quality to match the worst receiver's connection so that all participants experience consistent quality and no one is excluded from the conversation due to bandwidth limitations.”

**What it’s about:**  
Maintaining call stability by dynamically degrading audio/video quality to match network constraints instead of dropping participants.

**Size:** Large (Real-time network monitoring)

## Feature Overview
This feature enables reliable, real-time audio delivery across participants with built-in integrity checks and adaptive quality control. Audio is sent in multiple tiers, validated via CRC fingerprints, and monitored through RTCP feedback. The SFU automatically selects the lowest viable tier so everyone hears clearly, ensuring consistent audio quality even when network conditions vary across users.
