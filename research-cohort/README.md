# Research Cohort

A multi-agent research chat application where three independent AI agents investigate a user-provided topic in parallel, and a fourth Analyst Agent synthesises their outputs into a final recommendation.

---

## How It Works

1. You enter a research topic in the UI.
2. **Agent Alpha**, **Agent Beta**, and **Agent Gamma** each independently research the topic using different language models, running concurrently via `asyncio`.
3. Each agent saves its response to a shared SQLite database.
4. The **Analyst Agent** reads all three responses and synthesises them — scoring each agent, identifying the strongest response, and producing a final recommendation.
5. All four outputs are displayed in a Gradio web UI.

```
┌─────────────────────────────────────────────────────────────┐
│ Row 1: Research Agent Outputs                               │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│ │ Agent Alpha │  │ Agent Beta  │  │ Agent Gamma │         │
│ │ [Markdown]  │  │ [Markdown]  │  │ [Markdown]  │         │
│ └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│ Row 2: Analyst Synthesis (full width)                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Analyst Agent Insights & Recommendation                 │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Row 3: User Input (full width)                              │
│ ┌──────────────────────────────────────┐  ┌─────────────┐ │
│ │ Enter your research topic here...    │  │   Research  │ │
│ └──────────────────────────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Agents & Models

| Agent | Role | Model | Provider |
|-------|------|-------|----------|
| Agent Alpha | Comprehensive overview, key concepts | `meta-llama/Llama-3.2-3B-Instruct` | HuggingFace |
| Agent Beta | Data-driven, evidence-focused analysis | `mistralai/Mistral-7B-Instruct-v0.3` | HuggingFace |
| Agent Gamma | Patterns, connections, big-picture synthesis | `google/gemma-2-2b-it` | HuggingFace |
| Analyst | Evaluates all 3 responses, synthesises recommendation | `meta-llama/Meta-Llama-3.1-8B-Instruct` | HuggingFace |

All models are served via the [HuggingFace Inference API](https://huggingface.co/inference-api) using an OpenAI-compatible endpoint. The provider abstraction also supports **Groq** and **OpenRouter** — see [Switching Providers](#switching-providers).

---

## Prerequisites

- Python 3.10 or higher
- A [HuggingFace account](https://huggingface.co/) with an API token
- Model access accepted for each model (see [Model Access](#model-access))

---

## Setup

### 1. Clone / navigate to the project

```bash
cd /path/to/research-cohort
```

### 2. Create and activate a virtual environment

```bash
python -m venv .venv
# Linux / macOS
source .venv/bin/activate
# Windows
.venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure API keys

```bash
cp .env.example .env
```

Open `.env` and add your HuggingFace token:

```
HUGGINGFACE_API_KEY=hf_your_token_here
```

Groq and OpenRouter keys are only needed if you reassign agents to those providers (see [Switching Providers](#switching-providers)).

### 5. Accept model licences

Before the models will respond to API calls, you must accept each model's licence on HuggingFace while logged in to your account:

| Model | Licence page |
|-------|-------------|
| `meta-llama/Llama-3.2-3B-Instruct` | https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct |
| `mistralai/Mistral-7B-Instruct-v0.3` | https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3 |
| `google/gemma-2-2b-it` | https://huggingface.co/google/gemma-2-2b-it |
| `meta-llama/Meta-Llama-3.1-8B-Instruct` | https://huggingface.co/meta-llama/Meta-Llama-3.1-8B-Instruct |

Click **"Agree and access repository"** on each page. API calls will return `403` until this is done.

---

## Running

```bash
python app.py
```

The Gradio UI starts at **http://localhost:7860**.

Enter a topic (e.g. `"climate change mitigation strategies"`) and click **Research**. The three agent panels and the analyst panel will populate once all responses are ready.

---

## Project Structure

```
research-cohort/
├── app.py                    # Entrypoint — orchestration & Gradio launch
├── config.json               # Agent & provider configuration
├── requirements.txt
├── .env                      # API keys (not committed)
├── .env.example              # Key template
├── research.db               # SQLite database (auto-created on first run)
├── agents/
│   ├── base_agent.py         # Abstract BaseAgent + AgentResult dataclass
│   ├── research_agent.py     # Calls LLM, saves response to DB
│   └── analyst_agent.py      # Reads all 3 DB responses, synthesises
├── providers/
│   └── llm_provider.py       # OpenAI-compatible client with per-provider base_url
├── tools/
│   └── shared_memory.py      # SQLite persistence (sessions, responses, evaluations)
├── ui/
│   └── layout.py             # Gradio Blocks layout & event wiring
└── docs/
    ├── HLD.md                # High-Level Design
    ├── LLD.md                # Low-Level Design
    └── GAPS_AND_ASSUMPTIONS.md
```

---

## Configuration

All agent and provider settings live in `config.json`. No code changes are needed to swap models or adjust parameters.

### Changing a model

```json
"research_agent_1": {
  "model": "meta-llama/Llama-3.2-3B-Instruct",
  "temperature": 0.7,
  "max_tokens": 1500
}
```

### Switching Providers

To use Groq or OpenRouter for an agent, change its `"provider"` field and add the corresponding key to `.env`:

```json
"research_agent_2": {
  "provider": "groq",
  "model": "llama-3.1-8b-instant"
}
```

```
GROQ_API_KEY=gsk_your_key_here
```

Available providers and their endpoints:

| Provider | Base URL |
|----------|---------|
| `huggingface` | `https://api-inference.huggingface.co/v1` |
| `groq` | `https://api.groq.com/openai/v1` |
| `openrouter` | `https://openrouter.ai/api/v1` |

---

## Database

A SQLite file `research.db` is created in the project root on first run. It contains three tables:

| Table | Contents |
|-------|---------|
| `research_sessions` | One row per topic submitted; tracks `status` (`in_progress` / `completed`) |
| `agent_responses` | One row per agent per session; stores the full LLM response |
| `analyst_evaluations` | One row per session; stores the analyst's synthesis |

Inspect the database at any time:

```bash
sqlite3 research.db "SELECT id, topic, status, created_at FROM research_sessions"
sqlite3 research.db "SELECT agent_name, model, substr(response_text,1,80) FROM agent_responses"
```

---

## Known Limitations

See [`docs/GAPS_AND_ASSUMPTIONS.md`](docs/GAPS_AND_ASSUMPTIONS.md) for the full audit. The most significant:

- **All three agent panels update simultaneously** — they are fired with `asyncio.gather` so the UI cannot show individual agents completing as they finish; all three appear at once when the slowest one completes.
- **No retry logic** — a transient API error (e.g. HuggingFace cold-start 503) permanently fails that agent for the session.
- **No request timeout** — a hung API call blocks the UI indefinitely.
- **SQLite write contention** — concurrent async writes use default journal mode; enabling WAL mode (`PRAGMA journal_mode=WAL`) is recommended for reliability.

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/HLD.md`](docs/HLD.md) | System architecture, component responsibilities, data flow, concurrency model |
| [`docs/LLD.md`](docs/LLD.md) | Per-module class/method reference, DB schema, sequence diagram |
| [`docs/GAPS_AND_ASSUMPTIONS.md`](docs/GAPS_AND_ASSUMPTIONS.md) | Implementation audit: gaps, missed details, assumptions, recommended fixes |
