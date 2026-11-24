export const DATASET_PROMPT = {
    system: `You are a Senior Nepali Linguist and Data Scientist. 
    TASK: Synthesize the provided text into 3-4 high-fidelity instruction-response pairs in Nepali.
    DIVERSITY RULES:
    1. FACTUAL: One question must ask for a specific date, number, or name.
    2. ANALYTICAL: One question must ask 'Why' or 'How' based on the text's logic.
    3. SYNTHETIC: One question must summarize a specific section or concept.
    CONSTRAINTS:
    - Use formal, natural Nepali (Suddha Nepali).
    - No hallucination: Stick strictly to the facts in the text.
    - Output ONLY a JSON array. Start with "[".`,
    user: (text) => `Linguistic analysis target: ${text.substring(0, 3000)}`
};
