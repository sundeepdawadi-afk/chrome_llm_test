import { APIClient } from './modules/api-client.js';

const api = new APIClient();

document.addEventListener('DOMContentLoaded', async () => {
    const provider = document.getElementById('ai-provider');
    const ollamaGroup = document.getElementById('ollama-group');
    const ollamaEndpoint = document.getElementById('ollama-endpoint');
    const ollamaModel = document.getElementById('ollama-model');
    const hubUrl = document.getElementById('hub-url');
    const hubBadge = document.getElementById('hub-connection-badge');
    const testHubBtn = document.getElementById('test-hub-btn');
    const syncHubBtn = document.getElementById('sync-hub-btn');
    const hubTestResult = document.getElementById('hub-test-result');
    const bufferSummary = document.getElementById('buffer-summary');
    const saveBtn = document.getElementById('save-settings');
    const saveStatus = document.getElementById('save-status');

    function toggleGroups() {
        ollamaGroup.style.display = provider.value === 'ollama' ? 'block' : 'none';
    }

    provider.onchange = toggleGroups;

    // Load saved settings
    chrome.storage.local.get([
        'aiProvider',
        'ollamaEndpoint',
        'ollamaModel',
        'hubUrl',
        'local_harvests',
        'local_notes'
    ], (res) => {
        if (res.aiProvider) provider.value = res.aiProvider;
        ollamaEndpoint.value = res.ollamaEndpoint || 'http://localhost:11434/v1';
        ollamaModel.value = res.ollamaModel || 'llama3.2';
        hubUrl.value = res.hubUrl || 'http://localhost:8001';
        toggleGroups();
        updateBufferSummary(res.local_harvests, res.local_notes);
    });

    function updateBufferSummary(harvests = [], notes = []) {
        const unSyncedHarvests = (harvests || []).filter(h => !h.synced).length;
        const unSyncedNotes = (notes || []).filter(n => !n.synced).length;
        const totalHarvests = (harvests || []).length;
        const totalNotes = (notes || []).length;

        bufferSummary.innerHTML = `
            <b>Total Harvests:</b> ${totalHarvests} (${unSyncedHarvests} pending sync)<br>
            <b>Total Notes:</b> ${totalNotes} (${unSyncedNotes} pending sync)<br>
            <small style="color: #5f6368;">All research actions are preserved in local browser storage, ensuring no data loss when the backend is offline.</small>
        `;
    }

    // Check hub health
    async function checkHub() {
        api.baseUrl = hubUrl.value.trim() || 'http://localhost:8001';
        const health = await api.checkHealth();
        if (health.online) {
            hubBadge.className = 'badge badge-online';
            hubBadge.textContent = 'Online';
            hubTestResult.style.display = 'block';
            hubTestResult.style.color = '#137333';
            hubTestResult.textContent = `✓ Connected to Sovereign Hub (${api.baseUrl})`;
        } else {
            hubBadge.className = 'badge badge-offline';
            hubBadge.textContent = 'Offline';
            hubTestResult.style.display = 'block';
            hubTestResult.style.color = '#b06000';
            hubTestResult.textContent = `⚠️ Cannot reach Hub at ${api.baseUrl}. Make sure to run: cd server && python main.py`;
        }
    }

    checkHub();

    testHubBtn.onclick = checkHub;

    syncHubBtn.onclick = async () => {
        syncHubBtn.textContent = 'Syncing...';
        const result = await api.syncBufferedData();
        alert(result.message);
        syncHubBtn.textContent = 'Sync Buffered Data';
        chrome.storage.local.get(['local_harvests', 'local_notes'], (res) => {
            updateBufferSummary(res.local_harvests, res.local_notes);
        });
        checkHub();
    };

    saveBtn.onclick = () => {
        chrome.storage.local.set({
            aiProvider: provider.value,
            ollamaEndpoint: ollamaEndpoint.value.trim() || 'http://localhost:11434/v1',
            ollamaModel: ollamaModel.value.trim() || 'llama3.2',
            hubUrl: hubUrl.value.trim() || 'http://localhost:8001'
        }, () => {
            saveStatus.style.display = 'block';
            setTimeout(() => { saveStatus.style.display = 'none'; }, 3000);
            checkHub();
        });
    };
});
