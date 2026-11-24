# Building NepaChrome: A Sovereign NLP Harvester with Gemini Nano

This document outlines the technical architecture, challenges, and solutions implemented in the **NepaChrome** ecosystem. It serves as a guide for scaling this infrastructure to larger Devanagari datasets.

## 1. The Architectural Challenge
Building AI extensions in 2026 requires navigating strict browser security contexts and hardware-specific optimizations.

### The "Catalina" Barrier
*   **The Issue**: Chrome's official built-in AI (Prompt API) is hardware-locked by Google to macOS 13+ (Ventura). On macOS 10.15 (Catalina), the standard `self.ai` namespace is suppressed.
*   **The Solution**: We implemented **Deep Namespace Detection**, identifying that certain Chrome versions (140+) expose the model under `window.LanguageModel` even when the standard `ai` namespace is hidden.

### Context Isolation
*   **Problem**: Gemini Nano is unavailable in Service Workers and blocked by Content Security Policy (CSP) when injected as an iframe into high-security news sites (e.g., OnlineKhabar).
*   **Solution**: **The Anchored Window Pattern**. By spawning a dedicated extension window (`type: popup`) and anchoring it to the right of the screen, we create a "Secure Context" that has full AI access and is immune to website-level CSP blocks.

## 2. AI Optimization Strategies
Local models like Gemini Nano (3B parameters) require precise engineering to perform high-fidelity NLP tasks.

### Smart Chunking
*   **Constraint**: Local models have a context window of approximately 4,000 tokens.
*   **Implementation**: NepaChrome automatically trims input text to the first 3,000 characters. This prevents "silent failures" or empty responses while capturing the core semantic value of the harvested page.

### Few-Shot Prompting & JSON Hardening
To ensure the model outputs structured JSONL data consistently:
1.  **Few-Shot Examples**: Providing `EXAMPLE INPUT` and `EXAMPLE OUTPUT` in the system prompt.
2.  **Constraint Enforcement**: The instruction `Start your response with "{"` forces the model out of "chatty mode" and into "data mode."
3.  **Auto-Wrap Fallback**: A safety layer in `sidepanel.js` that automatically wraps raw text responses into a valid JSON structure if parsing fails.

## 3. The Multi-Mode Action Hub
NepaChrome is structured around three primary research missions:

1.  **📊 Dataset Generation**: (DATASET MODE)
    *   **Goal**: Synthesize raw Devanagari text into instruction-response pairs for LLM fine-tuning.
    *   **Prompt**: Optimized for linguistic accuracy and JSONL formatting.

2.  **📝 Intelligence Summarization**: (SUMMARY MODE)
    *   **Goal**: Instant comprehension of any page in elegant Nepali.
    *   **Flexibility**: Works on any site, regardless of the original language.

3.  **⚙️ Prompt Engineering**: (TUNE MODE)
    *   **Goal**: Self-optimizing pipeline. The AI suggests better prompts for its own future synthesis based on current page context.

## 4. Ingestion Pipeline
Data is synced via a local FastAPI server to a persistent `.jsonl` hub.

*   **Endpoint**: `POST http://localhost:8001/save-data`
*   **Output**: `server/browser_harvested_data.jsonl`
*   **Standard**: JSONL format (one JSON object per line) optimized for professional NLP tools (e.g., Hugging Face `datasets` library).

## 5. Maintenance & Troubleshooting
*   **Flags**: Always ensure `#optimization-guide-on-device-model` is set to **Enabled BypassPerfRequirement**.
*   **Internals**: Check `chrome://on-device-internals` to verify model download status.
*   **Disk Space**: Ensure at least **22GB of free disk space** is available for the model buffer.

---
*Created for the Nepali Sovereign NLP Project, 2026.*
