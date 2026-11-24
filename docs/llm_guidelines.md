# 🧠 NepaChrome: Sovereign LLM Guidelines (v1.0)

This document establishes the "Sovereign Standard" for interacting with local Gemini Nano models within the NepaChrome ecosystem. Following these guidelines ensures high-fidelity research, cultural nuance, and technical density.

---

## 1. The Platinum Prompting Standard
Inspired by the **Golden Sample** architecture, all high-stakes research prompts should encourage the model to follow a "Reason-First" approach.

### A. Chain-of-Thought (CoT)
Always instruct the model to use internal reasoning before responding. 
- **Prompt Fragment**: *"Before answering in Nepali, analyze the technical context and cultural nuance within <thought> tags."*
- **Objective**: Improves factual accuracy and prevents the model from hallucinating simplified Nepali translations.

### B. Cultural Nuance & Localization
Do not settle for generic translations. The model should be prompted to consider:
- **Regional Dialects**: Distinguish between standard Nepali, Terai context, and Hill-region agricultural terms.
- **Formal vs. Informal**: Use appropriate honorifics (Hajur/Tapai) when simulating pedagogical or governmental content.

---

## 2. Module-Specific Guidelines

### 💬 Sovereign Chat (Prompt API)
- **Role**: A high-density research assistant specializing in science, philosophy, and technology.
- **Guideline**: Maintain a "Sovereign Tone"—professional, objective, and privacy-conscious.
- **Constraint**: If the model starts producing repetitive loops, use the "Clear Hub" button to reset the KV cache and start a fresh atomic session.

### 📝 Recursive Summarizer (Summarization API)
- **Role**: A distillation engine for long-form academic and research texts.
- **Guideline**: Use the `key-points` type with `format: markdown` for maximum readability.
- **Length**: Prefer `medium` or `long` lengths for technical articles to avoid losing critical scientific citations.

### 🌐 Pro Translator (Hybrid Engine)
- **Role**: A high-fidelity bridge between English scientific literature and the Nepali language.
- **Guideline**: When using the Gemini Nano fallback, prompt the model to *"Preserve technical English terms in parentheses alongside the Nepali equivalent"* (e.g., "प्रकाश संश्लेषण (Photosynthesis)").

---

## 3. Bilingual Interaction Strategy

### A. Technical Density
When processing scientific papers:
1. **First Pass**: Summarize in English to extract the core thesis.
2. **Second Pass**: Translate the summary into Nepali, focusing on making the "Abstract Concepts" accessible to a Nepali-speaking audience.

### B. Code-Switching
Encourage the model to use English for specific technical nouns (Software names, Chemical formulas) while using Nepali for the explanatory logic and connectors.

---

## 4. Quality Assurance & Dataset Training
Every interaction in the Sovereign Lab is an opportunity to improve the next generation of models.

- **Check for Hallucinations**: Always cross-reference AI-generated Nepali definitions with the established *Sabdakosh* or scientific registries.
- **Archival Protocol**: Use the "Archive to Server" feature only for "Golden" responses. Clean the chat history of errors before saving to ensure the resulting `.jsonl` file is training-ready.
- **Thought Tag Evaluation**: Review the `<thought>` blocks to understand *why* the model made specific linguistic choices. This is critical for debugging the "Bilingual Engine."

---
**Document Status**: Active Research Protocol
**Principles**: Density, Nuance, Sovereignty.
