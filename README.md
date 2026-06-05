# Autonomous Multi-Agent DevOps & Productivity Platform

A high-fidelity, production-ready fullstack software development lifecycle (SDLC) automation system. This tool provides autonomous agents that write code, resolve test failures, deploy sandboxed apps, and answer architectural queries via a Retrieval-Augmented Generation (RAG) assistant.

---
## Link to the web application

[https://synthdev-fe.onrender.com](https://synthdevv.onrender.com)

## 🛠️ Architecture & Technologies

### Frontend
- **React.js & JavaScript SPA**: Custom UI workspace using Outfit typography, dark mode aesthetic, and glassmorphic frames.
- **Monaco Code Editor**: Real-time syntax highlighting for Java, C++, Python, and JavaScript.
- **Animated SVG Workflow**: Displays real-time active states of 9 agent nodes.
- **GitHub Diff Viewer**: Highlights added/removed code changes in git-style red/green line overlays.

### Backend
- **FastAPI (Python)**: High-speed API endpoints secured with JWT tokens.
- **LangGraph Orchestrator**: Manages state-machine transitions and active agent behaviors.
- **ChromaDB**: Embeds and indexes codebase text chunks for RAG context lookups.
- **SQLAlchemy (PostgreSQL / SQLite)**: Captures user, program history, bug reports, and project workspaces.
- **Docker Sandbox**: Isolates python/js test execution inside sandboxed containers.

---

## 🚀 Quickstart Guide

### Option 1: Multi-Container Docker Compose (Recommended)
This starts all required resources (React, FastAPI, PostgreSQL, Redis) automatically.

1. Ensure Docker is running on your machine.
2. In the project root directory, run:
   ```bash
   docker-compose up --build
   ```
3. Open `http://localhost:3000` in your browser.

---

### Option 2: Standalone Local Setup (Easy Standalone Run)
The system automatically falls back to SQLite, local subprocess code execution, and an in-memory dictionary cache if Postgres or Redis are offline.

#### 1. Launch FastAPI Backend
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Uvicorn application server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### 2. Launch React Frontend
1. Open a new terminal window and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install node dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the Webpack development server:
   ```bash
   npm start
   ```
4. Navigate to `http://localhost:3000` in your web browser.

---

## 🧩 9-Agent SDLC Loop Diagram

```
[Requirement PM] ➔ [Planner Roadmap] ➔ [Architecture DB] 
                                            │
[Testing Sandbox] ⮘─── [Frontend layout] ⮘── [Backend routes]
    │      ▲
    ▼      │  (Max 3 iterations before Human-in-loop)
[Fix Agent Loop]
    │
    ▼ (Pass / Ignore)
[Deploy Sandbox] ➔ [Monitoring Node] ➔ [Workspace Live]
```

---

## ⚙️ Environment Variables
Rename `.env.example` to `.env` and fill in API keys if you want to use real LLM completions:
- `GEMINI_API_KEY`: Sets Gemini API completions.
- `OPENAI_API_KEY`: Sets ChatGPT model completions.
*If left blank, the platform uses intelligent rule-based templates for all stack codes, design plans, and RAG chats.*
