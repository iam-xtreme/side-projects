# High-Level Design — Research Cohort Chat Application

## 1. Purpose

A multi-agent research system where a user submits a topic, three independent Research Agents investigate it concurrently using different language models, and a fourth Analyst Agent synthesizes their outputs into a final recommendation. The result is displayed in a Gradio web UI.

---

## 2. System Overview

```
User (Browser)
     │
     ▼
┌────────────────────────────────────────────┐
│  Gradio UI  (ui/layout.py)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Agent α  │ │ Agent β  │ │ Agent γ  │   │   ← Row 1: Research outputs
│  └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────────────────────────────────┐  │
│  │        Analyst Synthesis             │  │   ← Row 2: Synthesis output
│  └──────────────────────────────────────┘  │
│  ┌───────────────────────────┐ ┌────────┐  │
│  │  Research Topic Input     │ │  Run   │  │   ← Row 3: User input
│  └───────────────────────────┘ └────────┘  │
└────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────┐
│  Orchestrator  (app.py)                    │
│  asyncio.gather(agent1, agent2, agent3)    │
│  then: analyst.invoke(topic, session_id)   │
└───────────────┬────────────────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌─────────────────┐  ┌──────────────────┐
│ Research Agents │  │  Analyst Agent   │
│ (×3 parallel)   │  │  (sequential,    │
│                 │  │   after agents)  │
└────────┬────────┘  └────────┬─────────┘
         │                    │
         ▼                    ▼
┌────────────────────────────────────────────┐
│  LLMProvider  (providers/llm_provider.py)  │
│  AsyncOpenAI with per-provider base_url    │
│  ┌────────────┐ ┌────────┐ ┌───────────┐  │
│  │HuggingFace │ │  Groq  │ │OpenRouter │  │
│  └────────────┘ └────────┘ └───────────┘  │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  SharedMemory  (tools/shared_memory.py)    │
│  SQLite — research.db                      │
│  ┌──────────────────┐                      │
│  │ research_sessions│                      │
│  ├──────────────────┤                      │
│  │ agent_responses  │                      │
│  ├──────────────────┤                      │
│  │analyst_evaluations│                     │
│  └──────────────────┘                      │
└────────────────────────────────────────────┘
```

---

## 3. Component Responsibilities

| Component | File | Responsibility |
|-----------|------|----------------|
| **Gradio UI** | `ui/layout.py` | Renders the 3-panel + analyst layout, wires button events, yields streaming status updates |
| **Orchestrator** | `app.py` | Creates agents, manages session lifecycle, runs `asyncio.gather` for parallelism |
| **ResearchAgent** | `agents/research_agent.py` | Sends user topic to assigned LLM, persists response to DB, returns `AgentResult` |
| **AnalystAgent** | `agents/analyst_agent.py` | Reads all 3 responses from DB, sends to LLM for synthesis, persists evaluation, marks session complete |
| **LLMProvider** | `providers/llm_provider.py` | Config-driven OpenAI-compatible client factory; routes requests to correct provider via `base_url` |
| **SharedMemory** | `tools/shared_memory.py` | SQLite persistence layer; single source of truth for session data and inter-agent communication |
| **config.json** | `config.json` | Centralised agent/provider configuration (models, temperatures, system prompts, API base URLs) |

---

## 4. Data Flow

```
User enters topic
        │
        ▼
  app.create_session(topic) → session_id
        │
        ├──────────────────────────────────┐
        │                                  │
  agent1.invoke()              agent2.invoke()       agent3.invoke()
  [LLM call]                   [LLM call]            [LLM call]
  save_agent_response()        save_agent_response() save_agent_response()
        │                                  │
        └──────────────────────────────────┘
                    asyncio.gather waits for all 3
                              │
                              ▼
                     analyst.invoke()
                     get_session_responses()   ← reads 3 rows from DB
                     [LLM call with all 3 as context]
                     save_analyst_evaluation()
                     complete_session()
                              │
                              ▼
                     UI displays all 4 results
```

---

## 5. Concurrency Model

- The Gradio server runs in a single process.
- `asyncio.gather()` is used to run the 3 Research Agents concurrently — they issue non-blocking async HTTP calls via `AsyncOpenAI`.
- The Analyst Agent runs **after** all 3 Research Agents complete (sequential dependency).
- Gradio 4.x supports async event handlers natively; no `asyncio.run()` wrapper is needed.
- The UI yields intermediate status ("Researching...") before awaiting results, giving visual feedback.

---

## 6. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | Gradio | 4.44.0 |
| LLM Client | openai (AsyncOpenAI) | ≥1.40.0 |
| Env config | python-dotenv | ≥1.0.0 |
| Persistence | SQLite (stdlib) | — |
| Async runtime | asyncio (stdlib) | — |
| Language | Python | ≥3.10 |

---

## 7. External Dependencies

| Provider | API Endpoint | Auth |
|----------|-------------|------|
| HuggingFace Inference API | `https://api-inference.huggingface.co/v1` | `HUGGINGFACE_API_KEY` |
| Groq | `https://api.groq.com/openai/v1` | `GROQ_API_KEY` |
| OpenRouter | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |

All three expose OpenAI-compatible `/chat/completions` endpoints — the same client code path handles all of them.

---

## 8. Deployment Topology

```
Single machine / local dev
  └── Python process (app.py)
        ├── Gradio HTTP server  → port 7860
        └── research.db         → filesystem (project root)
```

No containerisation, reverse proxy, or external database is required for the current scope.
