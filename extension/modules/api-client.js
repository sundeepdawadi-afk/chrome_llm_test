/**
 * NepaChrome API Client
 * Manages communication with the local Sovereign Hub (FastAPI at localhost:8001).
 * Features offline resilience: automatically buffers harvests and notes in chrome.storage.local
 * when the backend is offline, and logs all frontend activity.
 */

export class APIClient {
    constructor(baseUrl = 'http://localhost:8001') {
        this.baseUrl = baseUrl;
        this.loadBaseUrl();
    }

    async loadBaseUrl() {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            const res = await chrome.storage.local.get(['hubUrl']);
            if (res.hubUrl) this.baseUrl = res.hubUrl;
        }
    }

    async checkHealth() {
        await this.loadBaseUrl();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);
            const res = await fetch(`${this.baseUrl}/nc-hub/v1/health`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                return { online: true, service: data.service, url: this.baseUrl };
            }
        } catch (e) {
            // Hub offline or unreachable
        }
        return { online: false, url: this.baseUrl };
    }

    async saveData(item) {
        await this.loadBaseUrl();
        const entry = {
            id: 'harv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            instruction: item.instruction || (item.mode ? `Mode: ${item.mode}` : 'Devanagari Data'),
            response: item.response || item.translation || item.summary || JSON.stringify(item),
            source_url: item.source_url || (typeof window !== 'undefined' ? window.location?.href : ''),
            timestamp: new Date().toISOString(),
            synced: false
        };

        // Buffer locally first so data is NEVER lost
        await this.appendToStorage('local_harvests', entry);
        await this.logActivity({
            type: 'HARVEST',
            text: entry.instruction,
            result: entry.response,
            url: entry.source_url
        });

        // Attempt live transmission to hub
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`${this.baseUrl}/save-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                await this.markAsSynced('local_harvests', entry.id);
                return { status: 'success', synced: true, message: 'Saved to Sovereign Hub' };
            }
        } catch (err) {
            // Server offline
        }

        return {
            status: 'offline_buffered',
            synced: false,
            message: 'Hub offline: Data saved safely in local extension storage.'
        };
    }

    async saveNote(noteData) {
        await this.loadBaseUrl();
        const note = {
            id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            content: noteData.content || '',
            source_url: noteData.url || (typeof window !== 'undefined' ? window.location?.href : ''),
            timestamp: new Date().toISOString(),
            synced: false
        };

        await this.appendToStorage('local_notes', note);
        await this.logActivity({
            type: 'NOTE',
            text: note.content,
            result: 'Saved Note',
            url: note.source_url
        });

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`${this.baseUrl}/nc-hub/v1/note`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(note),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                await this.markAsSynced('local_notes', note.id);
                return { status: 'success', synced: true, message: 'Saved to Sovereign Hub' };
            }
        } catch (e) {
            // Hub offline
        }

        return {
            status: 'offline_buffered',
            synced: false,
            message: 'Hub offline: Note preserved in local extension storage.'
        };
    }

    async logActivity(event) {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
        const entry = {
            id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            timestamp: new Date().toISOString(),
            type: event.type || 'AI_ACTION',
            input: (event.text || '').substring(0, 300),
            output: (event.result || '').substring(0, 300),
            url: event.url || (typeof window !== 'undefined' ? window.location?.href : '')
        };
        await this.appendToStorage('local_activity_log', entry, 200);
    }

    async syncBufferedData() {
        await this.loadBaseUrl();
        if (typeof chrome === 'undefined' || !chrome.storage?.local) return { synced_harvests: 0, synced_notes: 0 };

        const data = await chrome.storage.local.get(['local_harvests', 'local_notes']);
        const harvests = (data.local_harvests || []).filter(h => !h.synced);
        const notes = (data.local_notes || []).filter(n => !n.synced);

        if (harvests.length === 0 && notes.length === 0) {
            return { status: 'no_pending', synced_harvests: 0, synced_notes: 0, message: 'All items already synced.' };
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${this.baseUrl}/nc-hub/v1/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ harvests, notes }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const allHarvests = (data.local_harvests || []).map(h => ({ ...h, synced: true }));
                const allNotes = (data.local_notes || []).map(n => ({ ...n, synced: true }));
                await chrome.storage.local.set({ local_harvests: allHarvests, local_notes: allNotes });
                return {
                    status: 'success',
                    synced_harvests: harvests.length,
                    synced_notes: notes.length,
                    message: `Synced ${harvests.length} harvest(s) and ${notes.length} note(s) to Sovereign Hub.`
                };
            }
        } catch (e) {
            // Still offline
        }
        return {
            status: 'offline',
            synced_harvests: 0,
            synced_notes: 0,
            message: 'Hub is currently unreachable. Items remain safely buffered in local storage.'
        };
    }

    async appendToStorage(key, item, maxLimit = 500) {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
        const res = await chrome.storage.local.get([key]);
        const list = res[key] || [];
        list.push(item);
        if (list.length > maxLimit) list.splice(0, list.length - maxLimit);
        await chrome.storage.local.set({ [key]: list });
    }

    async markAsSynced(key, id) {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
        const res = await chrome.storage.local.get([key]);
        const list = (res[key] || []).map(item => item.id === id ? { ...item, synced: true } : item);
        await chrome.storage.local.set({ [key]: list });
    }
}
