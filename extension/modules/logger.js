export const Log = {
    info: (msg, ...args) => {
        console.log(`%c[NepaChrome 🔍] %c${msg}`, 'color: #1a73e8; font-weight: bold;', 'color: inherit;', ...args);
    },
    warn: (msg, ...args) => {
        console.warn(`[NepaChrome ⚠️] ${msg}`, ...args);
    },
    error: (msg, ...args) => {
        console.error(`%c[NepaChrome ❌] %c${msg}`, 'color: #d93025; font-weight: bold;', 'color: #d93025;', ...args);
    }
};
