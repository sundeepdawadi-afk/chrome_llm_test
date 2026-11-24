# 🏛️ NepaChrome Sovereign AI: Feature Blueprint & Navigator

NepaChrome is a high-fidelity, local-first research ecosystem designed for Nepali NLP experimentation and bilingual immersion. This document outlines the technical features and navigation paths established during development.

---

## 1. Immersive Bilingual Engine (Browser Extension)
The core of the immersion experience, designed to inject Nepali intelligence into English web content without breaking DOM integrity.

- **Ironclad Request Lock (Citation: Session Fix #7)**: A global state-lock prevents the browser from sending multiple overlapping AI requests, which previously caused "congestion" and UI freezes.
- **Serial Inference Pipeline**: Paragraphs are processed one-by-one with a visual "pulse" animation, ensuring the local GPU/NPU is never over-saturated.
- **Atomic RunIDs (Citation: Content.js refactor)**: Every page-load generates a unique `runID`. If a page is refreshed, previous "ghost" translation loops are instantly killed to save resources.
- **Node-Wrapping Integrity**: Uses advanced DOM injection techniques to place translations directly beneath original text while maintaining the website's original CSS layout.

---

## 2. Sovereign AI Lab (The Playground)
A Material 3 research dashboard hosted at `http://localhost:8001/playground` for direct interaction with Chrome's built-in models.

- **Hybrid Translation Strategy (Citation: Playground Fix #9)**: If the native `Translator API` fails (due to unsupported language pairs like En->Ne), the lab automatically pivots to a specialized **Gemini Nano (Prompt API)** translation persona.
- **Real-Time Model Diagnostics**: A sidebar monitors the state of `Prompt`, `Summarizer`, and `Translator` models, reporting status as `available`, `downloading`, or `NO FLAG`.
- **Language Attestation**: Complies with Chrome 138+ safety standards by explicitly declaring `expectedInputs` and `expectedOutputs` for English and Nepali.
- **Archival Sync**: A single click saves entire chat histories and experimental summaries to your local `playground_history.jsonl`.

---

## 3. Sovereign Hub Backend (FastAPI)
The central nervous system for data persistence and dashboard serving.

- **Namespace Isolation**: All internal APIs are versioned under `/nc-hub/v1/` to ensure stability and prevent collisions with other local services.
- **Data Harvesting Pipeline**: Automatically records every translation performed in the browser to `browser_harvested_data.jsonl`.
- **Integrated Stats Dashboard**: Accessible at `http://localhost:8001/dashboard`, providing a bird's-eye view of your harvested data density and research progress.

---

## ⚙️ How to Activate Chrome AI Features

To unlock the sovereign capabilities of NepaChrome, your browser must be configured as a developer-grade research environment.

### 1. Mandatory Flags
Navigate to `chrome://flags` and set the following:
| Flag | Recommended Setting |
| :--- | :--- |
| `#optimization-guide-on-device-model` | **Enabled (BypassPerfRequirement)** |
| `#prompt-api-for-gemini-nano` | **Enabled** |
| `#summarization-api-for-gemini-nano` | **Enabled** |
| `#translation-api` | **Enabled** |

### 2. Model Download
After setting flags and restarting Chrome:
1. Open the **Sovereign Lab** (`http://localhost:8001/playground`).
2. Check the **Model Diagnostics** in the sidebar.
3. If it says `downloading`, leave the tab open for 2-5 minutes until it turns `available`.

---

## 📂 File Manifest & Navigator

### Extension Components
- `manifest.json`: Defines permissions and the `/nc-hub/` communication channel.
- `background.js`: Manages the session lifecycle and AI request queuing.
- `content.js`: Handles DOM manipulation and the Immersive Mode UI.
- `modules/ai-engine.js`: The universal interface for `window.ai`.

### Server Components
- `main.py`: The FastAPI engine and API route definitions.
- `templates/playground.html`: The high-fidelity research interface.
- `templates/dashboard.html`: The harvested data analytics view.
- `playground_history.jsonl`: The persistent log of your AI research sessions.

---
**Document Version**: 1.0 (Sovereign Masterclass Edition)
**Developed for**: Nepali NLP Enthusiasm & Research
