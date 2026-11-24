# 🛠️ NepaChrome: Problems Faced & Sovereign Resolutions

Developing a local-first AI ecosystem using experimental browser APIs presented several unique engineering challenges. This document logs those problems and the hardened solutions implemented to overcome them.

---

## 1. AI Engine Congestion (The "Race Condition" Problem)
**Problem**: When opening a large article, the extension would attempt to translate 20+ paragraphs simultaneously. This over-saturated the local NPU/GPU, leading to `window.ai` returning `undefined` or persistent timeouts.
- **Symptom**: Translations would start but suddenly stop, or the browser would hang.
- **Resolution**: Implemented an **Ironclad Request Lock**. We moved from parallel requests to a **Serial Processing Queue**. The system now processes one paragraph at a time, ensuring the hardware always has a clear path for inference.

## 2. API Namespace Volatility
**Problem**: Google’s built-in AI implementation is evolving rapidly. Code that worked yesterday (`window.ai.assistant`) broke today because the property was renamed to `window.ai.languageModel` or moved to a global `LanguageModel` class.
- **Symptom**: `TypeError: Cannot read properties of undefined (reading 'languageModel')`.
- **Resolution**: Developed a **Universal AI Resolver** (`getAI()`). This helper function checks all known entry points:
  1. `window.LanguageModel` (Latest Standard)
  2. `window.ai.languageModel` (Current Canary)
  3. `window.ai.assistant` (Legacy Implementation)

## 3. Unsupported Language Pairs (Translator API)
**Problem**: The specialized `window.ai.translator` model currently has a limited support matrix and often rejects English-to-Nepali (En-Ne) requests as "Unsupported."
- **Symptom**: `Error: The language pair is unsupported.`
- **Resolution**: Created a **Hybrid Translation Strategy**. If the specialized Translator API fails, the system automatically pivots the request to the **Prompt API (Gemini Nano)** with a specialized "Professional Translator" system prompt. This ensures 100% reliability for Nepali research.

## 4. Resource Leaks & Ghost Loops
**Problem**: If a user refreshed a page while a translation loop was running, the previous `content.js` loop would continue to fire requests in the background, leading to massive resource waste.
- **Symptom**: High CPU usage even after a page refresh; multiple translations appearing for the same text.
- **Resolution**: Implemented **Atomic RunIDs**. Each page load generates a unique ID. Every step of the translation loop checks if the current `runID` matches the global `activeRunID`. If not (due to a refresh), the loop instantly self-terminates.

## 5. Model Safety/Quality Warnings
**Problem**: Chrome started requiring "Language Attestation" for safety and quality reasons.
- **Symptom**: Console warning: `No output language was specified in a LanguageModel API request.`
- **Resolution**: Updated all session creation calls to include explicit `expectedInputs` and `expectedOutputs`. This silences the warnings and optimizes the model's internal filters for English and Nepali contexts.

## 6. Server-Side Port Conflicts
**Problem**: During rapid development, the FastAPI server process sometimes wouldn't release port `8001` on shutdown, preventing subsequent launches.
- **Symptom**: `[Errno 48] error while attempting to bind on address ('0.0.0.0', 8001)`.
- **Resolution**: Integrated a **Port Cleanup Script** into the launch workflow (`lsof -ti:8001 | xargs kill -9`). This ensures the Sovereign Hub always starts on a clean port.

---
**Document Version**: 1.0
**Engineering Focus**: Resilience & Sovereign Autonomy
