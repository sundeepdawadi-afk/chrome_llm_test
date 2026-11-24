(async () => {
    if (window.hasNepaChromeDiagnosticInjected) return;
    window.hasNepaChromeDiagnosticInjected = true;

    const [uiMod, logMod] = await Promise.all([
        import(chrome.runtime.getURL('modules/ui-components.js')),
        import(chrome.runtime.getURL('modules/logger.js'))
    ]);
    
    const { UI } = uiMod;
    const { Log } = logMod;

    Log.info('NepaChrome Core Loaded and Diagnostic-Ready.');

    let currentSelection = '';
    let container = null;

    function init() {
        const root = document.createElement('div');
        root.id = 'nc-framework-root';
        document.body.appendChild(root);
        const shadow = root.attachShadow({mode: 'open'});
        
        const style = document.createElement('style');
        style.textContent = UI.styles;
        shadow.appendChild(style);

        container = document.createElement('div');
        container.className = 'nc-card';
        container.style.cssText = 'position: absolute; display: none; z-index: 2147483647; min-width: 32px;';
        shadow.appendChild(container);

        setupListeners();
    }

    function setupListeners() {
        document.addEventListener('mouseup', (e) => {
            const selection = window.getSelection().toString().trim();
            if (selection.length > 3) {
                currentSelection = selection;
                renderTrigger(e.pageX, e.pageY);
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (!document.getElementById('nc-framework-root').contains(e.target)) {
                container.style.display = 'none';
            }
        });

        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.type === 'TOGGLE_IMMERSIVE') {
                if (msg.enabled) startImmersive();
                else stopImmersive();
            }
        });

        // Check on load
        chrome.storage.local.get(['immersiveEnabled'], (res) => {
            if (res.immersiveEnabled) startImmersive();
        });
    }

    let immersiveActive = false;
    let currentRunId = 0; // TRACKER TO KILL GHOST LOOPS

    async function startImmersive() {
        if (immersiveActive) return;
        immersiveActive = true;
        const runId = ++currentRunId;
        
        Log.info(`Initializing Immersive Mode (Run #${runId})`);
        
        // 1. Start long-lived session
        await new Promise(r => chrome.runtime.sendMessage({type: 'START_LONG_SESSION', mode: 'TRANSLATE'}, r));

        const selectors = 'p, h1, h2, h3, article section, li';
        const elements = Array.from(document.querySelectorAll(selectors));
        
        for (const el of elements) {
            // KILL CHECK: If a new run started, or mode was disabled, stop this loop immediately
            if (!immersiveActive || runId !== currentRunId) break;
            
            if (el.innerText.length < 25 || el.querySelector('.nc-translation')) continue;

            try {
                // Visual Indicator: Light pulse while thinking
                el.style.transition = 'opacity 0.5s';
                el.style.opacity = '0.7';

                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        type: 'QUICK_AI',
                        mode: 'TRANSLATE',
                        text: el.innerText
                    }, (res) => {
                        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                        else resolve(res);
                    });
                });

                el.style.opacity = '1';

                if (response && response.error) {
                    Log.warn('Translation Error:', response.error);
                } else if (response && response.result && immersiveActive && runId === currentRunId) {
                    const transEl = document.createElement('div');
                    transEl.className = 'nc-translation';
                    transEl.style.cssText = `
                        color: #5f6368; font-size: 0.92em; margin-top: 6px;
                        border-left: 3px solid #1a73e8; padding-left: 12px;
                        font-family: 'Inter', sans-serif; line-height: 1.6;
                        background: #f8f9fa; border-radius: 0 4px 4px 0; padding: 8px 12px;
                        animation: nc-fadein 0.5s ease-out;
                    `;
                    transEl.textContent = response.result;
                    el.appendChild(transEl);
                }
            } catch (err) {
                Log.error('Immersive Error:', err.message);
            } finally {
                el.style.opacity = '1';
            }
        }
    }

    function stopImmersive() {
        immersiveActive = false;
        currentRunId++; // Effectively kills any running loops
        Log.info('Deactivating Immersive Mode...');
        chrome.runtime.sendMessage({type: 'STOP_LONG_SESSION'});
        document.querySelectorAll('.nc-translation').forEach(el => el.remove());
    }

    function renderTrigger(x, y) {
        container.innerHTML = '';
        container.style.width = '32px';
        const isNearRight = (x + 200) > window.innerWidth;
        container.style.left = isNearRight ? `${x - 42}px` : `${x + 10}px`;
        container.style.top = `${y - 40}px`;
        container.style.display = 'block';

        const nBtn = document.createElement('div');
        nBtn.style.cssText = 'width:32px; height:32px; background:#1a73e8; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; cursor:pointer; font-size:14px;';
        nBtn.textContent = 'N';
        nBtn.onclick = (e) => { e.stopPropagation(); renderMenu(isNearRight); };
        container.appendChild(nBtn);
    }

    function renderMenu(isNearRight) {
        container.innerHTML = '';
        container.style.width = '200px';
        
        const modes = [
            { id: 'TRANSLATE', label: 'Translate to Nepali' },
            { id: 'SUMMARY', label: 'Summarize Selection' },
            { id: 'SAVE_NOTE', label: 'Save as Note' },
            { id: 'CUSTOM', label: 'Custom Instruction...' }
        ];

        modes.forEach((mode, idx) => {
            const item = document.createElement('div');
            item.className = 'nc-menu-item';
            item.textContent = mode.label;
            if (idx === 3) item.style.borderTop = '1px solid #f1f3f4';
            
            item.onclick = (e) => {
                e.stopPropagation();
                if (mode.id === 'CUSTOM') renderCustomInput(isNearRight);
                else if (mode.id === 'SAVE_NOTE') saveNote();
                else runAI(mode.id, null, isNearRight);
            };
            container.appendChild(item);
        });
    }

    function renderCustomInput(isNearRight) {
        container.innerHTML = `
            <div class="nc-header">Custom Instruction</div>
            <div class="nc-body"></div>
            <div class="nc-footer"></div>
        `;
        container.style.width = '280px';
        
        const input = UI.createInput('e.g. Explain like a scientist', (val) => runAI('CUSTOM', val, isNearRight));
        
        // Fix for GitHub shortcuts
        const stopKeys = (e) => e.stopPropagation();
        input.addEventListener('keydown', stopKeys);
        input.addEventListener('keypress', stopKeys);
        input.addEventListener('keyup', stopKeys);

        container.querySelector('.nc-body').appendChild(input);
        
        const cancelBtn = UI.createButton('Cancel', 'secondary', () => renderMenu(isNearRight));
        const runBtn = UI.createButton('Run', 'primary', () => runAI('CUSTOM', input.value, isNearRight));
        
        const footer = container.querySelector('.nc-footer');
        footer.appendChild(cancelBtn);
        footer.appendChild(runBtn);
        
        setTimeout(() => input.focus(), 10);
    }

    function runAI(mode, customInstr, isNearRight) {
        container.style.width = '340px';
        if (isNearRight) {
            const currentLeft = parseInt(container.style.left);
            container.style.left = `${currentLeft - 140}px`;
        }
        container.innerHTML = `<div class="nc-body" style="color:#70757a">🧠 Thinking...</div>`;
        
        Log.info(`Running AI Mode: ${mode}`);

        chrome.runtime.sendMessage({
            type: 'QUICK_AI', mode, text: currentSelection, customInstr
        }, (response) => {
            if (response && response.error) {
                Log.error(`AI Failure: ${response.error}`, response.stack);
                container.innerHTML = `
                    <div class="nc-body" style="color:#d93025; font-size:13px;">
                        <b>❌ AI Error</b><br>${response.error}<br>
                        <small style="color:#70757a; cursor:pointer;" id="see-logs">Check console for details</small>
                    </div>
                    <div class="nc-footer"></div>
                `;
            } else {
                container.innerHTML = `
                    <div class="nc-body" style="max-height:350px; overflow-y:auto;">${response?.result || '❌ Unknown Response'}</div>
                    <div class="nc-footer"></div>
                `;
            }
            const closeBtn = UI.createButton('Close', 'secondary', () => container.style.display = 'none');
            container.querySelector('.nc-footer').appendChild(closeBtn);
        });
    }

    function saveNote() {
        container.innerHTML = `<div class="nc-body" style="color:#70757a; text-align:center;">Saving note...</div>`;
        chrome.runtime.sendMessage({
            type: 'SAVE_NOTE',
            content: currentSelection,
            url: window.location.href
        }, (res) => {
            if (res && res.status === 'offline_buffered') {
                container.innerHTML = `
                    <div class="nc-body" style="color:#b06000; font-size:12px; text-align:center; line-height:1.4;">
                        <b>⚠️ Hub Offline</b><br>Note safely saved in local extension storage.
                    </div>
                `;
            } else if (res && res.status === 'success') {
                container.innerHTML = `<div class="nc-body" style="color:#1e8e3e; text-align:center;">✓ Saved to Sovereign Hub</div>`;
            } else {
                container.innerHTML = `<div class="nc-body" style="color:#1e8e3e; text-align:center;">✓ Note Saved</div>`;
            }
            setTimeout(() => { container.style.display = 'none'; }, 2000);
        });
    }

    init();
})();
