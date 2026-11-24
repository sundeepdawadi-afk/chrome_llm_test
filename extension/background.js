import { AIEngine } from './modules/ai-engine.js';
import { AI_MODES } from './modules/modes-config.js';
import { APIClient } from './modules/api-client.js';

const engine = new AIEngine();
const api = new APIClient();
let isBusy = false; // Ironclad lock to prevent hardware contention

console.log('[NepaChrome] Sovereign Service Worker Active (v2.0)');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'QUICK_AI') {
        if (isBusy) {
            setTimeout(() => processQuickAI(request, sender, sendResponse), 400);
        } else {
            processQuickAI(request, sender, sendResponse);
        }
        return true; 
    }

    if (request.type === 'START_LONG_SESSION') {
        engine.startLongSession(AI_MODES[request.mode])
            .then(() => sendResponse({ status: 'READY' }))
            .catch(err => sendResponse({ status: 'ERROR', error: err.message }));
        return true;
    }

    if (request.type === 'STOP_LONG_SESSION') {
        engine.stopLongSession();
        sendResponse({ status: 'STOPPED' });
        return true;
    }

    if (request.type === 'SAVE_NOTE') {
        api.saveNote({
            content: request.content,
            url: request.url || sender.tab?.url || ''
        }).then(result => {
            sendResponse(result);
        }).catch(err => {
            sendResponse({ status: 'error', message: err.message });
        });
        return true;
    }

    if (request.type === 'CHECK_HUB') {
        api.checkHealth().then(status => sendResponse(status));
        return true;
    }

    if (request.type === 'SYNC_DATA') {
        api.syncBufferedData().then(result => sendResponse(result));
        return true;
    }

    return true;
});

async function processQuickAI(request, sender, sendResponse) {
    if (isBusy) return;
    
    try {
        isBusy = true;
        const detection = await engine.detect();
        if (detection.status !== 'READY') {
            throw new Error(`AI Model not ready (${detection.message || detection.status}).`);
        }

        const config = AI_MODES[request.mode];
        if (!config) throw new Error(`Unknown AI Mode: ${request.mode}`);

        const result = await engine.run(config, request.text, request.customInstr);
        const output = result.translation || result.summary || result.response || result.suggested_prompt || (typeof result === 'string' ? result : JSON.stringify(result));

        // Log work done on frontend as research data
        await api.logActivity({
            type: request.mode,
            text: request.text,
            result: output,
            url: sender.tab?.url || request.url || ''
        });

        sendResponse({ result: output });
    } catch (e) {
        console.error('[NepaChrome Error]', e);
        sendResponse({ error: e.message });
    } finally {
        isBusy = false;
    }
}
