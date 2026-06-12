# BridgeMind — Cognitive Accessibility AI Platform

> **Submitted for STEMINATE Hackathon — "AI for a Better World"**  
> *Dynamic, agentic learning adaptations for neurodivergent students (ADHD, Dyslexia, Autism, Custom).*

---

## 📖 Project Overview

BridgeMind is a Chrome Extension and Web Platform designed to adapt dense, unstructured digital content into formats optimized for a student's specific cognitive profile. Rather than static page styling (contrast, font resizing), BridgeMind employs a parallel **multi-agent AI orchestrator** to restructure layout flow, strip sensory distractions, rewrite assignments into step-by-step actions, and build visual summaries.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Chrome Extension** | Manifest V3, Content script overlay, Background service worker, HTML/CSS/JS (Glassmorphic design) |
| **Backend API** | FastAPI (Python), Uvicorn, Pydantic, Anthropic SDK, concurrent thread-pool orchestrator |
| **Orchestration** | Multi-Agent prompt chains with **Mock Mode** fallback capabilities |
| **Web Landing Page** | HTML, Vanilla CSS (Premium animations, custom layouts), JS (Before/After split simulator) |
| **AI Models** | Anthropic Claude 3.5 Sonnet |

---

## 📁 Repository Structure

```
/backend
  /agents
    reader_agent.py          ← Restructures text paragraphs & bolds terms
    focus_agent.py           ← Generates cleanup selectors & CSS overrides
    comprehension_agent.py   ← Compiles TL;DR summaries & concept maps
    communication_agent.py   ← Rewrites assignment sheets into clear steps
    emotion_agent.py         ← Generates Distress Warning notices
    orchestrator.py          ← Manages concurrent agent runs
  /models
    schemas.py               ← Pydantic request/response schema specifications
  /utils
    claude_client.py         ← Claude API client with high-fidelity Mock fallback
    create_icons.py          ← Python script generating resized icon assets
  main.py                    ← FastAPI entrypoint with CORS routing
  requirements.txt           ← Python dependency manifest
  test_api.py                ← Local API integration verification test suite
  .env                       ← Key configuration (ANTHROPIC_API_KEY)

/extension
  manifest.json              ← Chrome Manifest V3 configuration
  /background
    background.js            ← Background router calling the FastAPI API
  /content
    content.js               ← Scraping script & custom reader overlay injector
    content.css              ← Styles for cream/sepia/dark/high-contrast views
  /popup
    popup.html               ← Popup layout (glassmorphism UI)
    popup.css                ← Premium theme stylesheet for extension settings
    popup.js                 ← Control card event handlers & storage syncer
  /assets
    icon-16/48/128.png       ← Extension icons generated via AI

/frontend
  index.html                 ← Web marketing landing page
  styles.css                 ← Premium design styles & custom animations
  app.js                     ← Simulated Before/After split simulator control logic
  /assets
    logo.png                 ← High resolution visual brand identity
```

---

## 🚀 Installation & Running Locally

### 1. Backend Server Setup
Make sure you have Python 3.10+ installed.
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your Anthropic API Key (Optional):
   Create a `.env` file or fill out the template with your key:
   ```env
   ANTHROPIC_API_KEY=your-actual-api-key
   ```
   *Note: If no API key is specified, BridgeMind automatically starts in **Mock Mode**, using a local parser and generator to simulate Claude's formatting. This ensures out-of-the-box offline functionality for testing.*
4. Start the development server:
   ```bash
   python main.py
   ```
   The API will bind to `http://127.0.0.1:8000`.

### 2. Loading the Chrome Extension
1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (toggle switch in the top-right corner).
4. Click **Load unpacked** (top-left button).
5. Select the `/extension` directory inside this repository.
6. The BridgeMind extension is now active and visible in your browser toolbar!

### 3. Running the Web Landing Page
Open the file [frontend/index.html](file:///g:/BridgeMind/frontend/index.html) directly in any modern browser to view the marketing layout and try the interactive Before/After preview simulator.

---

## 🧪 Integration Verification

To run the automated suite verifying API routes, CORS configs, and response schemas:
```bash
cd backend
python test_api.py
```

---

## 🤖 AI Disclosure
BridgeMind was developed with assistance from Google DeepMind's Antigravity AI coding assistant and integrates the Anthropic Claude API for live cognitive adaptation prompts.
