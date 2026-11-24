export const SUGGEST_PROMPT = {
    system: `You are a research assistant. 
    Analyze the page title and URL. Suggest 3 short action chips (max 3 words each) for a researcher.
    OUTPUT: {"suggestions": ["...", "...", "..."]}. RULE: Start with "{". No markdown.`,
    user: (metadata) => `Page: ${metadata.title} | URL: ${metadata.url}`
};
