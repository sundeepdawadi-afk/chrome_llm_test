import { AIEngine } from './modules/ai-engine.js';
import { APIClient } from './modules/api-client.js';

const engine = new AIEngine();
const api = new APIClient();

document.addEventListener('DOMContentLoaded', async () => {
    const statusBadge = document.getElementById('status-badge');
    const hubBadge = document.getElementById('hub-badge');
    const syncContainer = document.getElementById('sync-container');
    const pendingCount = document.getElementById('pending-count');
    const syncNowBtn = document.getElementById('sync-now-btn');
    const settingsBtn = document.getElementById('go-to-settings');
    const clearBtn = document.getElementById('clear-storage');
    const immersiveToggle = document.getElementById('toggle-immersive');

    // 1. Detect AI availability
    const aiCheck = await engine.detect();
    if (aiCheck.status === 'READY') {
        statusBadge.innerHTML = `<span>✅</span> AI Ready (${aiCheck.name})`;
        statusBadge.style.background = '#e6f4ea';
        statusBadge.style.color = '#137333';
    } else {
        statusBadge.innerHTML = `<span>⚠️</span> AI ${aiCheck.status}: ${aiCheck.message || 'Check chrome://flags'}`;
        statusBadge.style.background = '#fef7e0';
        statusBadge.style.color = '#b06000';
    }

    // 2. Check Hub status & pending buffers
    async function refreshHubStatus() {
        const health = await api.checkHealth();
        if (health.online) {
            hubBadge.innerHTML = '<span>🟢</span> Hub Online (localhost:8001)';
            hubBadge.style.background = '#e6f4ea';
            hubBadge.style.color = '#137333';
        } else {
            hubBadge.innerHTML = '<span>🟠</span> Hub Offline (Data buffered locally)';
            hubBadge.style.background = '#fef7e0';
            hubBadge.style.color = '#b06000';
        }

        const data = await chrome.storage.local.get(['local_harvests', 'local_notes']);
        const pendingHarvests = (data.local_harvests || []).filter(h => !h.synced).length;
        const pendingNotes = (data.local_notes || []).filter(n => !n.synced).length;
        const totalPending = pendingHarvests + pendingNotes;

        if (totalPending > 0) {
            syncContainer.style.display = 'flex';
            pendingCount.textContent = `${totalPending} item(s) buffered offline`;
        } else {
            syncContainer.style.display = 'none';
        }
    }

    await refreshHubStatus();

    hubBadge.onclick = refreshHubStatus;

    syncNowBtn.onclick = async () => {
        syncNowBtn.textContent = 'Syncing...';
        const res = await api.syncBufferedData();
        alert(res.message);
        syncNowBtn.textContent = 'Sync Now';
        await refreshHubStatus();
    };

    settingsBtn.onclick = () => chrome.runtime.openOptionsPage();

    // Bilingual Toggle Logic
    chrome.storage.local.get(['immersiveEnabled'], (res) => {
        immersiveToggle.checked = !!res.immersiveEnabled;
    });

    immersiveToggle.onchange = () => {
        const enabled = immersiveToggle.checked;
        chrome.storage.local.set({ immersiveEnabled: enabled }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_IMMERSIVE', enabled });
                }
            });
        });
    };

    clearBtn.onclick = () => {
        if (confirm('Clear local extension storage and buffered items?')) {
            chrome.storage.local.clear(() => window.close());
        }
    };
});
