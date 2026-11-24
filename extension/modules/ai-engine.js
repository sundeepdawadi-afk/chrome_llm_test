/**
 * NepaChrome AIEngine
 * Universal local inference coordinator for Devanagari NLP.
 * Supports:
 *  1. Chrome Built-in AI (Prompt API / Gemini Nano via LanguageModel / ai.languageModel)
 *  2. Local Ollama / OpenAI-compatible endpoint (e.g. http://localhost:11434/v1) - 100% offline, zero cloud keys
 */

export class AIEngine {
    constructor() {
        this.modelApi = null;
        this.foundName = '';
        this.activeSession = null;
        this.provider = 'chrome'; // 'chrome' | 'ollama'
        this.ollamaEndpoint = 'http://localhost:11434/v1';
        this.ollamaModel = 'llama3.2';
    }

    async loadConfig() {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            const cfg = await chrome.storage.local.get(['aiProvider', 'ollamaEndpoint', 'ollamaModel']);
            if (cfg.aiProvider) this.provider = cfg.aiProvider;
            if (cfg.ollamaEndpoint) this.ollamaEndpoint = cfg.ollamaEndpoint;
            if (cfg.ollamaModel) this.ollamaModel = cfg.ollamaModel;
        }
    }

    async detect() {
        await this.loadConfig();

        if (this.provider === 'ollama') {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1200);
                const baseUrl = this.ollamaEndpoint.replace(/\/v1\/?$/, '');
                const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    return { status: 'READY', name: `Ollama (${this.ollamaModel})` };
                }
            } catch (e) {
                return {
                    status: 'OPTIONAL_TODO',
                    name: 'Ollama (Offline)',
                    message: `Ollama is configured but not running at ${this.ollamaEndpoint}. Start Ollama or switch to Chrome AI in Settings.`
                };
            }
        }

        // Detect Chrome Built-in AI across evolving W3C and Chromium namespaces
        const context = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);
        const namespaces = {
            'window.LanguageModel': context.LanguageModel,
            'ai.languageModel': context.ai?.languageModel,
            'self.LanguageModel': typeof self !== 'undefined' ? self.LanguageModel : null,
            'chrome.languageModel': context.chrome?.languageModel,
            'ai.assistant': context.ai?.assistant,
            'chrome.aiOriginTrial.languageModel': context.chrome?.aiOriginTrial?.languageModel
        };

        for (const [name, obj] of Object.entries(namespaces)) {
            if (obj) {
                this.modelApi = obj;
                this.foundName = name;
                break;
            }
        }

        if (!this.modelApi) {
            return {
                status: 'MISSING',
                name: 'Chrome Built-in AI',
                message: 'Chrome Built-in AI is not enabled. Check chrome://flags (#prompt-api-for-gemini-nano).'
            };
        }

        try {
            let available = 'no';
            if (typeof this.modelApi.capabilities === 'function') {
                const caps = await this.modelApi.capabilities();
                available = caps.available;
            } else if (typeof this.modelApi.availability === 'function') {
                available = await this.modelApi.availability();
            }

            const isReady = (available === 'available' || available === 'readily' || available !== 'no');
            return {
                status: isReady ? 'READY' : 'DOWNLOADING',
                name: this.foundName,
                message: isReady ? 'Model active and ready' : 'Gemini Nano is downloading or warming up'
            };
        } catch (e) {
            return { status: 'ERROR', message: e.message, name: this.foundName };
        }
    }

    async run(modeConfig, text, customInstr = null) {
        await this.loadConfig();
        const userPrompt = modeConfig.getUserPrompt(text, customInstr);

        if (this.provider === 'ollama') {
            return this.runOllama(modeConfig.systemPrompt, userPrompt);
        }

        return this.runChromeAI(modeConfig, userPrompt);
    }

    async runChromeAI(modeConfig, userPrompt) {
        if (!this.modelApi) {
            const detection = await this.detect();
            if (detection.status !== 'READY') {
                throw new Error(detection.message || 'Chrome Prompt API is not ready.');
            }
        }

        const session = this.activeSession || await this.modelApi.create({
            systemPrompt: modeConfig.systemPrompt,
            expectedInputs: [{ type: 'text', languages: ['en', 'ne'] }],
            expectedOutputs: [{ type: 'text', languages: ['ne'] }]
        });

        try {
            const rawResult = await Promise.race([
                session.prompt(userPrompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error('AI Prompt Timeout (60s)')), 60000))
            ]);
            return this.parseResponse(String(rawResult).trim());
        } catch (err) {
            if (this.activeSession && this.activeSession.destroy) {
                try { this.activeSession.destroy(); } catch (_) {}
            }
            this.activeSession = null;
            throw err;
        } finally {
            if (!this.activeSession && session && session.destroy) {
                try { session.destroy(); } catch (_) {}
            }
        }
    }

    async runOllama(systemPrompt, userPrompt) {
        try {
            const endpoint = `${this.ollamaEndpoint.replace(/\/+$/, '')}/chat/completions`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.ollamaModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.2
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Ollama returned status ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const content = data.choices?.[0]?.message?.content || '';
            return this.parseResponse(content.trim());
        } catch (e) {
            if (e.name === 'AbortError') throw new Error('Ollama request timed out (60s).');
            throw new Error(`Ollama connection error: ${e.message}. (Ensure Ollama is running locally at ${this.ollamaEndpoint})`);
        }
    }

    async startLongSession(modeConfig) {
        await this.loadConfig();
        if (this.provider === 'ollama') return; // Long session pooling not required for HTTP endpoints

        const detection = await this.detect();
        if (detection.status !== 'READY') throw new Error(detection.message || 'AI Not Ready');
        
        console.log('[AIEngine] Starting Long-Lived Session...');
        this.activeSession = await this.modelApi.create({
            systemPrompt: modeConfig.systemPrompt,
            expectedInputs: [{ type: 'text', languages: ['en', 'ne'] }],
            expectedOutputs: [{ type: 'text', languages: ['ne'] }]
        });
    }

    stopLongSession() {
        if (this.activeSession) {
            console.log('[AIEngine] Destroying Long-Lived Session');
            if (this.activeSession.destroy) {
                try { this.activeSession.destroy(); } catch (_) {}
            }
            this.activeSession = null;
        }
    }

    parseResponse(text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch || arrayMatch) {
            try { return JSON.parse((jsonMatch || arrayMatch)[0].trim()); } catch (e) {}
        }
        return { response: text }; 
    }
}
