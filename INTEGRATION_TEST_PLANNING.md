# Integration Test Planning & GitHub Actions Workflow

**Date:** November 14, 2025  
**Purpose:** Define the roadmap for implementing an automated integration test suite and packaging it into a GitHub Actions workflow.  
**Context:** Testing frontend-to-backend flows (User Stories 11, 3, 8) locally and in the cloud (EC2/Amplify).

---

## 🚀 Executive Summary: Step-by-Step Implementation Plan

This plan outlines the **4 phases** required to go from our current state (separate unit tests) to a fully automated CI/CD integration test pipeline.

### Phase 1: Test Infrastructure Setup (Localhost)
*Goal: Enable frontend and backend to talk to each other in a test environment.*
1.  **Create Test Runner:** Setup Playwright (recommended for E2E) or Extend Jest to handle concurrent frontend/backend processes.
2.  **Mock/Stub Externalities:** 
    -   Stub `UserMedia` (Microphone) for consistent audio testing.
    -   Mock `AWS Cognito` (if we implement JWT) for auth bypass in tests.
3.  **Environment Config:** Create `test-config.json` to switch between `localhost` and `cloud` endpoints dynamically.

### Phase 2: Implement Integration Tests (Code)
*Goal: Translate the `INTEGRATION_TEST_SPECIFICATION.md` into actual code.*
1.  **US-11 (Connection):** Write tests for Join -> SDP Offer -> Answer -> ICE connection.
2.  **US-3 (Fingerprinting):** Write tests verifying the full loop: Audio Gen -> Fingerprint Send -> Backend Verify -> ACK Return.
3.  **US-8 (Quality):** Write tests for Network degradation simulation (mock stats) -> Tier Change -> Simulcast Layer Switch.

### Phase 3: Cloud Readiness (PM2 Environment)
*Goal: Ensure tests run against the deployed EC2/Amplify environment.*
1.  **Environment Config:** Update test scripts to accept `VITE_WS_URL` from environment variables to target the EC2 instance (e.g., `wss://34.193.221.159.nip.io:443`).
2.  **Deployment Verification:** Tests will verify that the PM2-managed backend is reachable and correctly handling WSS connections.

### Phase 4: GitHub Actions Packaging
*Goal: Automate execution on every push/PR.*
1.  **Create `run-integration-tests.yml`:** Define a new workflow.
2.  **Define Steps (Localhost Mode):**
    -   Checkout code.
    -   Install dependencies & Playwright browsers.
    -   Start Backend (Background process via `npm start`).
    -   Start Frontend (Background process via `npm run preview`).
    -   Run Playwright tests against localhost.
3.  **Define Steps (Cloud Mode - Optional/Manual Trigger):**
    -   Run Playwright tests against the production URLs defined in secrets.


---

## 🧪 Integration Test Specification (Refined for Automation)

This section details the specific tests to be implemented, aligned with the `INTEGRATION_TEST_SPECIFICATION.md` but structured for automated execution.

### Test Suite 1: Connection & Signaling (User Story 11)

| Test ID | Description | Inputs | Expected Output | Automation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **INT-11-A** | **Full Join Flow** | User `A` joins `meeting-1` | `connectionState` becomes `connected`, `isJoined` is true. | Playwright: Open page, click join, assert UI state & WS messages. |
| **INT-11-B** | **Two-Party Call** | User `A` & `B` join `meeting-1` | Both users see each other in participant list. Audio tracks active. | Playwright: Launch 2 browser contexts, verify cross-client presence. |
| **INT-11-C** | **Reconnection** | Simulate WS close event | Client automatically reconnects and restores state. | Playwright: Manually close WS connection via CDPSession, verify reconnect. |

### Test Suite 2: Audio Integrity (User Story 3)

| Test ID | Description | Inputs | Expected Output | Automation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **INT-3-A** | **Fingerprint Loop** | Client sends audio (mock sine wave) | Backend verifies FP, sends `ACK`. Client receives `ACK`. | Mock `AudioContext`. Intercept WS traffic to verify `ack-summary` message. |
| **INT-3-B** | **Mismatch Handling** | Client sends bad FP | Backend logs mismatch, Match Rate drops. | Inject invalid FP in outgoing WS message, verify Backend response/state. |

### Test Suite 3: Adaptive Quality (User Story 8)

| Test ID | Description | Inputs | Expected Output | Automation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **INT-8-A** | **Degradation Trigger** | Mock `getStats` to report high packet loss | Backend sends `tier-change` to `LOW`. | Override `RTCPeerConnection.getStats`. Assert `tier-change` WS message received. |
| **INT-8-B** | **Recovery Trigger** | Mock `getStats` to report 0 loss | Backend sends `tier-change` to `HIGH`. | Sequence: High loss -> Low Tier -> Zero loss -> High Tier. |

---

## 📦 GitHub Actions Workflow Design

We will create a file `.github/workflows/run-integration-tests.yml`.

### Workflow Logic
1.  **Trigger:** On `push` to `main` or `workflow_dispatch`.
2.  **Services:** We will NOT use service containers for the app itself because we need fine-grained control over their startup (e.g., building the TS backend). We will run them as background processes in the runner.
3.  **Browser:** We will use Playwright's pre-built action or install browsers manually.

### Proposed YAML Structure

```yaml
name: Run Integration Tests

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  integration-test:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Build Backend
        run: |
          cd backend
          npm run build

      - name: Start Backend (Background)
        run: |
          cd backend
          npm start &
          echo "Backend started with PID $!"
          npx wait-on tcp:8080 --timeout 30000

      - name: Start Frontend (Background)
        run: |
          npm run preview -- --port 4173 & 
          npx wait-on tcp:4173 --timeout 30000

      - name: Run Integration Tests
        env:
          # Point tests to local background services
          VITE_WS_URL: "ws://localhost:8080"
          BASE_URL: "http://localhost:4173"
        run: npx playwright test

      - name: Upload Test Artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## 🛠️ Actionable Next Steps

1.  **Select Framework:** Confirm use of **Playwright** for these E2E integration tests. (It handles multiple browser contexts perfectly for testing 2-user meetings).
2.  **Install Playwright:** Run `npm init playwright@latest` in the root (or a dedicated `tests/e2e` folder).
3.  **Write First Test:** Implement **INT-11-A** (Single user join) to validate the pipeline.
4.  **Create Workflow File:** Commit the `.github/workflows/run-integration-tests.yml` file.

---

**END OF PLANNING DOCUMENT**

