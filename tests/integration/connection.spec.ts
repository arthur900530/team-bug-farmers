import { test, expect } from '@playwright/test';

test.describe('User Story 11: Initial Audio Connection', () => {
  
  test('INT-11-A: Full Join Flow', async ({ page }) => {
    // 1. Navigate to the application
    await page.goto('/');

    // 2. Verify Join Meeting Modal is present
    const joinButton = page.getByRole('button', { name: 'Join', exact: true });
    await expect(joinButton).toBeVisible();

    // 3. Fill in Meeting Details
    await page.fill('#userId', 'test-user-a');
    await page.fill('#meetingId', 'test-meeting-1');
    await page.fill('#displayName', 'Test User A');

    // 4. Submit Join Form
    await joinButton.click();

    // 5. Verify Connection State Transitions
    // It might go through Connecting -> Signaling -> Connected/Streaming
    
    // We look for the status indicator. 
    // Based on ConnectionStatus.tsx, it renders text like "Connecting...", "Signaling...", "Streaming"
    const statusIndicator = page.locator('text=Streaming').or(page.locator('text=Connected'));
    
    // Increase timeout because WebRTC connection might take a few seconds
    await expect(statusIndicator).toBeVisible({ timeout: 15000 });
  });

  test('INT-11-B: Two-Party Call', async ({ browser }) => {
    // Create two separate browser contexts to simulate two different users
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Capture logs for debugging
    pageA.on('console', msg => console.log(`[Page A] ${msg.text()}`));
    pageB.on('console', msg => console.log(`[Page B] ${msg.text()}`));

    // Common meeting ID for both users
    const meetingId = 'test-meeting-2';

    // --- User A Joins ---
    await pageA.goto('/');
    await pageA.fill('#userId', 'user-a');
    await pageA.fill('#meetingId', meetingId);
    await pageA.fill('#displayName', 'User A');
    await pageA.getByRole('button', { name: 'Join', exact: true }).click();
    
    // Wait for User A to be connected
    await expect(pageA.locator('text=Streaming').or(pageA.locator('text=Connected'))).toBeVisible({ timeout: 15000 });

    // --- User B Joins ---
    await pageB.goto('/');
    await pageB.fill('#userId', 'user-b');
    await pageB.fill('#meetingId', meetingId);
    await pageB.fill('#displayName', 'User B');
    await pageB.getByRole('button', { name: 'Join', exact: true }).click();

    // Wait for User B to be connected
    await expect(pageB.locator('text=Streaming').or(pageB.locator('text=Connected'))).toBeVisible({ timeout: 15000 });

    // --- Verification ---
    
    // Verify User A sees 2 participants count
    // ParticipantList header: "Participants (2)"
    // Debug: Check what the button actually says
    // Use a more specific selector to avoid matching other buttons (like view controls)
    // The participant toggle button has the text "Participant" or "Participants"
    const participantsButtonA = pageA.locator('button', { hasText: /Participant/ }).first();
    
    try {
      await expect(participantsButtonA).toContainText('2 Participants', { timeout: 5000 });
    } catch (e) {
      const text = await participantsButtonA.textContent();
      console.log(`[DEBUG] User A Participants Button Text: "${text}"`);
      throw e;
    }

    // Open participant list for User A
    await participantsButtonA.click();
    
    // Verify User A sees User B in the participant list
    // The ParticipantList component renders userId (e.g., "user-b")
    await expect(pageA.locator(`text=user-b`)).toBeVisible();

    // Verify User B sees 2 participants count
    const participantsButtonB = pageB.locator('button', { hasText: /Participant/ }).first();
    await expect(participantsButtonB).toContainText('2 Participants', { timeout: 5000 });

    // Open participant list for User B
    await participantsButtonB.click();

    // Verify User B sees User A in the participant list
    await expect(pageB.locator(`text=user-a`)).toBeVisible();

    // Cleanup
    await pageA.close();
    await pageB.close();
    await contextA.close();
    await contextB.close();
  });

});
