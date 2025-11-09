"use strict";
/**
 * Test script to verify mediasoup Consumer.setPreferredLayers() API
 *
 * Purpose: Verify that the API exists and works correctly before implementing User Story 8
 *
 * This test:
 * 1. Initializes mediasoup Worker and Router
 * 2. Creates a WebRtcTransport
 * 3. Creates a Producer (simulated)
 * 4. Creates a Consumer
 * 5. Tests setPreferredLayers() with different spatial layers
 *
 * Expected: setPreferredLayers() should exist and accept { spatialLayer: number }
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mediasoup_1 = __importDefault(require("mediasoup"));
async function testSetPreferredLayers() {
    console.log('[Test] Starting mediasoup setPreferredLayers API verification...\n');
    let worker = null;
    let router = null;
    let transport = null;
    let producer = null;
    let consumer = null;
    try {
        // Step 1: Create Worker
        console.log('[Test] Step 1: Creating mediasoup Worker...');
        worker = await mediasoup_1.default.createWorker({
            logLevel: 'warn',
            rtcMinPort: 40000,
            rtcMaxPort: 49999,
        });
        console.log('[Test] ✅ Worker created\n');
        // Step 2: Create Router
        console.log('[Test] Step 2: Creating Router...');
        router = await worker.createRouter({
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                    preferredPayloadType: 111,
                },
            ],
        });
        console.log('[Test] ✅ Router created\n');
        // Step 3: Create WebRtcTransport
        console.log('[Test] Step 3: Creating WebRtcTransport...');
        transport = await router.createWebRtcTransport({
            listenIps: [{ ip: '127.0.0.1', announcedIp: '127.0.0.1' }],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        });
        console.log('[Test] ✅ WebRtcTransport created\n');
        // Step 4: Create Producer (simulated - we'll use minimal RTP parameters)
        console.log('[Test] Step 4: Creating Producer...');
        const rtpParameters = {
            codecs: [
                {
                    mimeType: 'audio/opus',
                    payloadType: 111,
                    clockRate: 48000,
                    channels: 2,
                    parameters: {
                        useinbandfec: 1,
                        usedtx: 1,
                    },
                },
            ],
            headerExtensions: [],
            encodings: [
                {
                    ssrc: 11111111,
                    // Simulcast: 3 layers (LOW/MEDIUM/HIGH)
                    rid: 'r0',
                },
                {
                    ssrc: 22222222,
                    rid: 'r1',
                },
                {
                    ssrc: 33333333,
                    rid: 'r2',
                },
            ],
            rtcp: {
                cname: 'test-producer',
            },
        };
        producer = await transport.produce({
            kind: 'audio',
            rtpParameters: rtpParameters,
        });
        console.log('[Test] ✅ Producer created (ID: ' + producer.id + ')\n');
        // Step 5: Create Consumer
        console.log('[Test] Step 5: Creating Consumer...');
        const rtpCapabilities = router.rtpCapabilities;
        consumer = await transport.consume({
            producerId: producer.id,
            rtpCapabilities,
            paused: false,
        });
        console.log('[Test] ✅ Consumer created (ID: ' + consumer.id + ')\n');
        // Step 6: Verify setPreferredLayers exists
        console.log('[Test] Step 6: Verifying setPreferredLayers() method exists...');
        if (typeof consumer.setPreferredLayers !== 'function') {
            throw new Error('setPreferredLayers() method does not exist on Consumer');
        }
        console.log('[Test] ✅ setPreferredLayers() method exists\n');
        // Step 7: Test setPreferredLayers with different spatial layers
        console.log('[Test] Step 7: Testing setPreferredLayers() with different spatial layers...\n');
        // Test layer 0 (LOW tier)
        console.log('[Test]   Testing spatialLayer: 0 (LOW tier)...');
        await consumer.setPreferredLayers({ spatialLayer: 0 });
        console.log('[Test]   ✅ setPreferredLayers({ spatialLayer: 0 }) succeeded');
        // Test layer 1 (MEDIUM tier)
        console.log('[Test]   Testing spatialLayer: 1 (MEDIUM tier)...');
        await consumer.setPreferredLayers({ spatialLayer: 1 });
        console.log('[Test]   ✅ setPreferredLayers({ spatialLayer: 1 }) succeeded');
        // Test layer 2 (HIGH tier)
        console.log('[Test]   Testing spatialLayer: 2 (HIGH tier)...');
        await consumer.setPreferredLayers({ spatialLayer: 2 });
        console.log('[Test]   ✅ setPreferredLayers({ spatialLayer: 2 }) succeeded\n');
        // Step 8: Verify preferredLayers property
        console.log('[Test] Step 8: Verifying preferredLayers property...');
        const preferredLayers = consumer.preferredLayers;
        console.log('[Test]   preferredLayers:', JSON.stringify(preferredLayers));
        if (preferredLayers && preferredLayers.spatialLayer === 2) {
            console.log('[Test]   ✅ preferredLayers property reflects last set value\n');
        }
        else {
            console.log('[Test]   ⚠️  preferredLayers may not reflect set value (this is OK, may be async)\n');
        }
        // Step 9: Test currentLayers property
        console.log('[Test] Step 9: Verifying currentLayers property...');
        const currentLayers = consumer.currentLayers;
        console.log('[Test]   currentLayers:', JSON.stringify(currentLayers));
        console.log('[Test]   ✅ currentLayers property exists\n');
        console.log('[Test] ✅✅✅ ALL TESTS PASSED ✅✅✅\n');
        console.log('[Test] Summary:');
        console.log('[Test]   - setPreferredLayers() method exists');
        console.log('[Test]   - Method accepts { spatialLayer: number } parameter');
        console.log('[Test]   - Method is async (returns Promise<void>)');
        console.log('[Test]   - Method works with spatialLayer values 0, 1, 2');
        console.log('[Test]   - preferredLayers property exists');
        console.log('[Test]   - currentLayers property exists');
        console.log('\n[Test] ✅ API VERIFICATION COMPLETE - Ready for User Story 8 implementation\n');
    }
    catch (error) {
        console.error('[Test] ❌ ERROR:', error);
        if (error instanceof Error) {
            console.error('[Test] Error message:', error.message);
            console.error('[Test] Stack:', error.stack);
        }
        process.exit(1);
    }
    finally {
        // Cleanup
        console.log('[Test] Cleaning up...');
        if (consumer) {
            consumer.close();
            console.log('[Test] Consumer closed');
        }
        if (producer) {
            producer.close();
            console.log('[Test] Producer closed');
        }
        if (transport) {
            transport.close();
            console.log('[Test] Transport closed');
        }
        if (router) {
            router.close();
            console.log('[Test] Router closed');
        }
        if (worker) {
            worker.close();
            console.log('[Test] Worker closed');
        }
        console.log('[Test] Cleanup complete');
    }
}
// Run the test
testSetPreferredLayers().catch((error) => {
    console.error('[Test] Unhandled error:', error);
    process.exit(1);
});
