import { AIEngine } from './modules/ai-engine.js';
import { APIClient } from './modules/api-client.js';
import { AI_MODES } from './modules/modes-config.js';

const engine = new AIEngine();
const api = new APIClient();
let currentResults = [];

async function init() {
    updateStatus();
    checkHubStatus();

    // Add a suggestion bar container if not present
    if (!document.getElementById('suggestion-bar')) {
        const bar = document.createElement('div');
        bar.id = 'suggestion-bar';
        bar.style.cssText = 'display:flex; gap:8px; margin-bottom:24px; overflow-x:auto; padding-bottom:8px;';
        document.querySelector('h1').after(bar);
    }

    const hubEl = document.getElementById('hub-status');
    if (hubEl) {
        hubEl.onclick = async () => {
            hubEl.textContent = 'Checking...';
            const health = await api.checkHealth();
            if (health.online) {
                // Try sync if any pending
                const syncRes = await api.syncBufferedData();
                showNotice(syncRes.message || 'Connected to Sovereign Hub.', 'success');
            } else {
                showNotice('Sovereign Hub offline. Start server with "cd server && python main.py". Data is safely buffered in extension storage.', 'warning');
            }
            updateHubBadge(health.online);
        };
    }
}

async function updateStatus() {
    const statusEl = document.getElementById('model-status');
    const result = await engine.detect();
    statusEl.textContent = result.status === 'READY' ? `✅ AI Ready (${result.name})` : `⚠️ Local AI: ${result.message || result.status}`;
    if (result.status !== 'READY') {
        statusEl.style.background = '#fef7e0';
        statusEl.style.color = '#b06000';
    } else {
        statusEl.style.background = '#e6f4ea';
        statusEl.style.color = '#137333';
    }
}

async function checkHubStatus() {
    const health = await api.checkHealth();
    updateHubBadge(health.online);
}

function updateHubBadge(isOnline) {
    const hubEl = document.getElementById('hub-status');
    if (!hubEl) return;
    if (isOnline) {
        hubEl.textContent = '🟢 Hub Online';
        hubEl.style.background = '#e6f4ea';
        hubEl.style.color = '#137333';
    } else {
        hubEl.textContent = '🟠 Hub Offline (Local Buffer Active)';
        hubEl.style.background = '#fef7e0';
        hubEl.style.color = '#b06000';
    }
}

function showNotice(message, type = 'info') {
    const notice = document.getElementById('hub-notice');
    if (!notice) return;
    notice.style.display = 'block';
    notice.textContent = message;
    if (type === 'warning') {
        notice.style.background = '#fef7e0';
        notice.style.color = '#b06000';
        notice.style.border = '1px solid #f9ab00';
    } else if (type === 'success') {
        notice.style.background = '#e6f4ea';
        notice.style.color = '#137333';
        notice.style.border = '1px solid #34a853';
    } else {
        notice.style.background = '#e8f0fe';
        notice.style.color = '#1a73e8';
        notice.style.border = '1px solid #d2e3fc';
    }
    setTimeout(() => { notice.style.display = 'none'; }, 6000);
}

function renderSuggestions(suggestions) {
    const bar = document.getElementById('suggestion-bar');
    if (!bar) return;
    bar.innerHTML = '';
    suggestions.forEach(text => {
        const chip = document.createElement('div');
        chip.textContent = text;
        chip.style.cssText = `
            padding: 6px 14px; background: #e8f0fe; color: #1a73e8;
            border-radius: 16px; font-size: 13px; font-weight: 500;
            cursor: pointer; white-space: nowrap; border: 1px solid #d2e3fc;
        `;
        chip.onclick = () => {
            const mode = text.toLowerCase().includes('data') ? 'DATASET' : 'SUMMARY';
            chrome.runtime.sendMessage({ type: 'PROCESS_AI_DATA', mode: mode, text: document.title });
        };
        bar.appendChild(chip);
    });
}

chrome.runtime.onMessage.addListener(async (message) => {
    const container = document.getElementById('output-container');

    if (message.type === 'INIT_SIDEBAR') {
        const config = AI_MODES.SUGGEST;
        try {
            const data = await engine.run(config, message.context);
            if (data.suggestions) renderSuggestions(data.suggestions);
        } catch (e) {
            console.error('Suggestion failed', e);
        }
    }

    if (message.type === 'GENERATE_DATA' || message.type === 'PROCESS_AI_DATA') {
        const mode = message.mode || 'DATASET';
        const config = AI_MODES[mode];
        container.innerHTML = `<div id="loading-state">🧠 Thinking (${config?.label || mode})...</div>`;
        
        try {
            const data = await engine.run(config, message.text);
            renderResults(data, mode);
        } catch (e) {
            container.innerHTML = `<div id="loading-state" style="color: #d93025;">❌ Error: ${e.message}</div>`;
        }
    }
});

function renderResults(data, mode) {
    const container = document.getElementById('output-container');
    container.innerHTML = '';
    const items = Array.isArray(data) ? data : [data];
    currentResults = items;

    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        let html = '';
        if (item.instruction && item.response) {
            html = `<div class="label">Q&A ${index + 1}</div><div class="content" style="font-weight:500;">${item.instruction}</div><div class="content">${item.response}</div>`;
        } else if (item.summary || item.translation) {
            html = `<div class="label">${mode}</div><div class="content">${item.summary || item.translation}</div>`;
        } else {
            html = `<div class="content">${JSON.stringify(item)}</div>`;
        }
        
        card.innerHTML = html;
        container.appendChild(card);
    });

    document.getElementById('save-btn').disabled = false;
}

document.getElementById('save-btn').onclick = async () => {
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        let anyBuffered = false;
        for (const item of currentResults) {
            const res = await api.saveData(item);
            if (res.status === 'offline_buffered') anyBuffered = true;
        }

        if (anyBuffered) {
            btn.textContent = '✓ Saved Locally';
            btn.style.background = '#b06000';
            showNotice('Backend not active: items are safely preserved in local storage and will sync when the server is online.', 'warning');
            updateHubBadge(false);
        } else {
            btn.textContent = '✓ Saved to Hub!';
            btn.style.background = '#1e8e3e';
            showNotice('All items successfully archived to Sovereign Hub.', 'success');
            updateHubBadge(true);
        }

        setTimeout(() => {
            btn.textContent = 'Save to Sovereign Hub';
            btn.style.background = '#1a73e8';
            btn.disabled = false;
        }, 2500);
    } catch (e) {
        btn.textContent = 'Save Error';
        btn.disabled = false;
    }
};

init();
