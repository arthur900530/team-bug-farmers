import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

// Define environments
const environments = {
  localhost: {
    baseURL: 'http://localhost:5173',
    wsURL: 'ws://localhost:8080',
  },
  cloud: {
    baseURL: process.env.CLOUD_URL || 'https://main.d3j8fnrr90aipm.amplifyapp.com',
    wsURL: process.env.CLOUD_BACKEND_WS_URL || 'wss://34.193.221.159.nip.io:443',
  }
};

// Select environment based on TEST_ENV var, default to localhost
const testEnv = process.env.TEST_ENV || 'localhost';
const currentConfig = environments[testEnv as keyof typeof environments] || environments.localhost;

console.log(`Running tests against: ${testEnv} (${currentConfig.baseURL})`);
console.log(`Backend WebSocket URL: ${currentConfig.wsURL}`);

// Export WS URL for use in tests
export const getWebSocketUrl = () => currentConfig.wsURL;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/integration',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: currentConfig.baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        /* Grant microphone permissions and fake media stream for WebRTC testing */
        permissions: ['microphone'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
          ],
        },
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox specific preferences for fake media streams
        // Note: Firefox doesn't support the 'permissions' API like Chromium
        // All permissions must be configured via firefoxUserPrefs
        launchOptions: {
          firefoxUserPrefs: {
            // Enable fake media streams (critical for CI/headless)
            'media.navigator.streams.fake': true,
            // Disable permission prompts
            'media.navigator.permission.disabled': true,
            // Allow media access by default (1 = allow)
            'media.navigator.permission.default': 1,
            // Allow all domains for media access
            'media.getusermedia.screensharing.allowed_domains': '*',
            // Disable hardware acceleration (may help with fake streams)
            'media.webrtc.hw.h264.enabled': false,
            // Enable WebRTC (should be default, but explicit)
            'media.peerconnection.enabled': true,
            // Allow fake audio devices
            'media.audio_loopback_dev': true,
          },
        },
      },
    },
  ],
});
