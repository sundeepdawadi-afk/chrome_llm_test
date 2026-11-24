import { DATASET_PROMPT } from '../prompts/dataset.js';
import { SUMMARY_PROMPT } from '../prompts/summary.js';
import { TRANSLATE_PROMPT } from '../prompts/translate.js';
import { SUGGEST_PROMPT } from '../prompts/suggest.js';

export const AI_MODES = {
    DATASET: {
        label: 'Build Dataset',
        icon: '📊',
        systemPrompt: DATASET_PROMPT.system,
        getUserPrompt: DATASET_PROMPT.user
    },
    SUMMARY: {
        label: 'Summarize',
        icon: '📝',
        systemPrompt: SUMMARY_PROMPT.system,
        getUserPrompt: SUMMARY_PROMPT.user
    },
    TRANSLATE: {
        label: 'Translate',
        icon: '🌐',
        systemPrompt: TRANSLATE_PROMPT.system,
        getUserPrompt: TRANSLATE_PROMPT.user
    },
    CUSTOM: {
        label: 'Custom Instruction',
        icon: '✏️',
        systemPrompt: `You are a helpful Nepali AI assistant.
        TASK: Perform the user's specific instruction on the provided text.
        RULE: Always output in high-quality Nepali.`,
        getUserPrompt: (text, customInstr) => `Instruction: ${customInstr}\nText to process: ${text}`
    },
    SUGGEST: {
        label: 'Smart Suggestions',
        icon: '💡',
        systemPrompt: SUGGEST_PROMPT.system,
        getUserPrompt: SUGGEST_PROMPT.user
    }
};
