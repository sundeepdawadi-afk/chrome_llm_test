export const UI = {
    styles: `
        :host { font-family: 'Inter', -apple-system, sans-serif; }
        .nc-card {
            background: #fff; border-radius: 8px; border: 1px solid #dadce0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nc-header {
            padding: 12px 16px; border-bottom: 1px solid #f1f3f4;
            font-size: 12px; font-weight: 500; color: #70757a;
        }
        .nc-body { padding: 16px; font-size: 14px; line-height: 1.6; color: #202124; }
        .nc-footer {
            padding: 8px 16px; border-top: 1px solid #f1f3f4;
            display: flex; justify-content: flex-end; gap: 8px;
        }
        .nc-btn {
            padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 500;
            cursor: pointer; border: none; transition: background 0.2s;
        }
        .nc-btn-primary { background: #1a73e8; color: #fff; }
        .nc-btn-primary:hover { background: #1765cc; }
        .nc-btn-secondary { background: transparent; color: #70757a; }
        .nc-btn-secondary:hover { background: #f1f3f4; }
        
        .nc-input {
            width: 100%; padding: 10px; border: 1px solid #dadce0;
            border-radius: 4px; box-sizing: border-box; font-size: 13px;
            outline: none; transition: border-color 0.2s;
        }
        .nc-input:focus { border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.2); }
        
        .nc-menu-item {
            padding: 10px 16px; font-size: 13px; color: #3c4043;
            cursor: pointer; transition: background 0.1s;
        }
        .nc-menu-item:hover { background: #f1f3f4; }
    `,

    createButton(text, type = 'primary', onClick) {
        const btn = document.createElement('button');
        btn.className = `nc-btn nc-btn-${type}`;
        btn.textContent = text;
        btn.onclick = onClick;
        return btn;
    },

    createInput(placeholder, onEnter) {
        const input = document.createElement('input');
        input.className = 'nc-input';
        input.placeholder = placeholder;
        input.onkeydown = (e) => { if (e.key === 'Enter') onEnter(input.value); };
        return input;
    }
};
