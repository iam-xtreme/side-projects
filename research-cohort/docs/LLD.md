# Low-Level Design — Research Cohort Chat Application

## 1. Module Map

```
research-cohort/
├── app.py                    § 2
├── config.json               § 3
├── agents/
│   ├── base_agent.py         § 4.1
│   ├── research_agent.py     § 4.2
│   └── analyst_agent.py      § 4.3
├── providers/
│   └── llm_provider.py       § 5
├── tools/
│   └── shared_memory.py      § 6
└── ui/
    └── layout.py             § 7
```

---

## 2. `app.py` — Orchestrator

### Functions

#### `build_agents() -> tuple[SharedMemory, ResearchAgent×3, AnalystAgent]`
- Instantiates `LLMProvider` (reads `config.json`, does not open any connections yet).
- Instantiates `SharedMemory` (opens SQLite, runs `CREATE TABLE IF NOT EXISTS`).
- Creates `ResearchAgent` for `research_agent_1/2/3` and `AnalystAgent` for `analyst_agent`.
- **Called on every request** — a new set of objects is created per submit click.

#### `async run_research(topic: str) -> tuple[AgentResult, AgentResult, AgentResult, AgentResult]`
1. `build_agents()` — fresh instances.
2. `memory.create_session(topic)` → `session_id` (UUID, stored in DB).
3. `asyncio.gather(agent1, agent2, agent3)` — all three fire concurrently.
4. `analyst.invoke(topic, session_id)` — runs after gather resolves.
5. Returns `(result1, result2, result3, analyst_result)`.

#### `main()`
- `create_ui(run_research)` — wires the async function into Gradio.
- `demo.queue()` — enables Gradio's task queue (required for async generators).
- `demo.launch(server_name="0.0.0.0", server_port=7860)`.

---

## 3. `config.json` — Configuration Schema

```
{
  "providers": {
    "<provider_id>": {
      "base_url": string,   // OpenAI-compat endpoint
      "env_key":  string    // name of the env var holding the API key
    }
  },
  "agents": {
    "<agent_id>": {
      "name":          string,   // display name
      "provider":      string,   // key into providers{}
      "model":         string,   // model identifier sent to the API
      "temperature":   float,
      "max_tokens":    int,
      "system_prompt": string
    }
  }
}
```

**Registered agents and models:**

| Agent ID | Display Name | Provider | Model |
|----------|-------------|----------|-------|
| `research_agent_1` | Agent Alpha | huggingface | `meta-llama/Llama-3.2-3B-Instruct` |
| `research_agent_2` | Agent Beta  | huggingface | `mistralai/Mistral-7B-Instruct-v0.3` |
| `research_agent_3` | Agent Gamma | huggingface | `google/gemma-2-2b-it` |
| `analyst_agent`    | Analyst     | huggingface | `meta-llama/Meta-Llama-3.1-8B-Instruct` |

---

## 4. Agents

### 4.1 `agents/base_agent.py`

#### `@dataclass AgentResult`

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | `str` | Config key (e.g. `research_agent_1`) |
| `agent_name` | `str` | Human name (e.g. `Agent Alpha`) |
| `model` | `str` | Model string from config |
| `response_text` | `str` | Raw LLM output; empty string on error |
| `session_id` | `str` | UUID linking to DB session |
| `timestamp` | `str` | UTC ISO-8601 at construction time |
| `error` | `str` | Non-empty if the invocation failed |

**Property:** `success: bool` — `True` when `error == ""`

#### `class BaseAgent(ABC)`

| Member | Type | Set by |
|--------|------|--------|
| `agent_id` | `str` | Constructor arg |
| `provider` | `LLMProvider` | Constructor arg |
| `memory` | `SharedMemory` | Constructor arg |
| `agent_name` | `str` | Read from `provider.get_agent_config()` |
| `model` | `str` | Read from `provider.get_agent_config()` |

**Abstract method:** `async invoke(topic, session_id) -> AgentResult`

---

### 4.2 `agents/research_agent.py`

#### `class ResearchAgent(BaseAgent)`

**`async invoke(topic, session_id) -> AgentResult`**

```
user_message = "Research the following topic thoroughly: {topic}"
response_text = await provider.chat_completion(agent_id, user_message)
memory.save_agent_response(session_id, agent_id, agent_name, model, response_text)
return AgentResult(...)
```

- On any exception: returns `AgentResult` with `error=str(exc)`, `response_text=""`.
- Does **not** re-raise; caller sees a populated `AgentResult` regardless.

---

### 4.3 `agents/analyst_agent.py`

#### `class AnalystAgent(BaseAgent)`

**`async invoke(topic, session_id) -> AgentResult`**

1. `memory.get_session_responses(session_id)` — fetches all agent rows for this session.
2. Guard: if zero rows, returns error `AgentResult` without calling LLM.
3. Builds `user_message`:
   ```
   Topic: **{topic}**

   Below are research responses from N agents:

   ### Agent Alpha (model: ...)
   {response_text}

   ---

   ### Agent Beta (model: ...)
   {response_text}

   ---
   ...

   Please evaluate these responses and provide your synthesis.
   ```
4. `provider.chat_completion(analyst_agent, user_message)` — LLM call.
5. `memory.save_analyst_evaluation(session_id, recommendation=response_text)`.
6. `memory.complete_session(session_id)` — flips status to `completed`.
7. Returns `AgentResult`.

**Note:** `reasoning` and `best_agent_id` columns in DB are always saved as empty strings because the analyst output is freeform markdown; those fields are not parsed out.

---

## 5. `providers/llm_provider.py`

#### `class LLMProvider`

**Constructor**
- Loads `config.json`.
- Initialises `_clients: dict[str, AsyncOpenAI] = {}` (lazy client pool, keyed by provider name).

**`_get_client(provider_name) -> AsyncOpenAI`**
- Reads `providers[provider_name]` from config.
- Reads API key from `os.environ[env_key]`; raises `ValueError` if missing.
- Creates and caches `AsyncOpenAI(api_key=..., base_url=...)`.
- Subsequent calls for the same provider return the cached client.

**`get_agent_config(agent_id) -> dict`**
- Validates `agent_id` exists in config; raises `ValueError` if not.
- Returns the agent's config dict.

**`async chat_completion(agent_id, user_message, extra_system="") -> str`**
- Looks up agent config → determines provider → retrieves client.
- Builds messages list: `[system, user]`.
- Optionally appends `extra_system` to system prompt (unused by current agents).
- Calls `client.chat.completions.create(model, messages, temperature, max_tokens)`.
- Returns `response.choices[0].message.content or ""`.

---

## 6. `tools/shared_memory.py`

### Database Schema

**`research_sessions`**
```sql
CREATE TABLE IF NOT EXISTS research_sessions (
    id         TEXT PRIMARY KEY,   -- UUID
    topic      TEXT NOT NULL,
    created_at TEXT NOT NULL,      -- UTC ISO-8601
    status     TEXT NOT NULL DEFAULT 'in_progress'  -- 'in_progress' | 'completed'
);
```

**`agent_responses`**
```sql
CREATE TABLE IF NOT EXISTS agent_responses (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES research_sessions(id),
    agent_id      TEXT NOT NULL,
    agent_name    TEXT NOT NULL,
    model         TEXT NOT NULL,
    response_text TEXT NOT NULL,
    created_at    TEXT NOT NULL
);
```

**`analyst_evaluations`**
```sql
CREATE TABLE IF NOT EXISTS analyst_evaluations (
    id             TEXT PRIMARY KEY,
    session_id     TEXT NOT NULL REFERENCES research_sessions(id),
    recommendation TEXT NOT NULL,   -- full analyst LLM output
    reasoning      TEXT,            -- always empty in current impl
    best_agent_id  TEXT,            -- always empty in current impl
    created_at     TEXT NOT NULL
);
```

### `class SharedMemory`

| Method | Signature | Notes |
|--------|-----------|-------|
| `__init__` | `(db_path=None)` | Defaults to `<project_root>/research.db`; calls `_init_db()` |
| `_get_conn` | `() -> sqlite3.Connection` | New connection per call; `row_factory = sqlite3.Row` |
| `_init_db` | `()` | `CREATE TABLE IF NOT EXISTS` for all 3 tables |
| `create_session` | `(topic) -> session_id` | Inserts row; returns UUID string |
| `complete_session` | `(session_id)` | `UPDATE status = 'completed'` |
| `save_agent_response` | `(session_id, agent_id, agent_name, model, response_text) -> id` | Inserts row; returns UUID |
| `get_session_responses` | `(session_id) -> list[dict]` | Ordered by `created_at`; returns all columns except `id` |
| `save_analyst_evaluation` | `(session_id, recommendation, reasoning="", best_agent_id="") -> id` | Inserts row |

**Connection strategy:** A new `sqlite3.connect()` call is made for every operation. There is no persistent connection or connection pool. SQLite's default journal mode (DELETE) is used.

---

## 7. `ui/layout.py`

### `create_ui(run_research_fn) -> gr.Blocks`

**Layout structure:**

```
gr.Blocks
├── gr.Markdown  (title + description)
├── gr.Row                        ← Row 1: Research agents
│   ├── gr.Column
│   │   ├── gr.Markdown("### Agent Alpha")   [static header]
│   │   ├── gr.Markdown  alpha_status        [dynamic: Waiting / Researching / Done]
│   │   └── gr.Markdown  alpha_out           [dynamic: LLM response text]
│   ├── gr.Column
│   │   └── (same structure for Agent Beta)
│   └── gr.Column
│       └── (same structure for Agent Gamma)
├── gr.Row                        ← Row 2: Analyst
│   └── gr.Column
│       ├── gr.Markdown("### Analyst Synthesis")
│       ├── gr.Markdown  analyst_status
│       └── gr.Markdown  analyst_out
└── gr.Row                        ← Row 3: Input
    ├── gr.Textbox  topic_input   (scale=5)
    └── gr.Button   submit_btn    (scale=1, variant="primary")
```

**Event wiring:**
- `submit_btn.click` → `on_submit`
- `topic_input.submit` (Enter key) → `on_submit`

**`async on_submit(topic)` — async generator**

```
if topic is blank:
    yield 4 status warnings + 4 empty content fields
    return

yield "Researching..." × 3, "Waiting for research agents...", "" × 4   ← first yield (immediate feedback)

results = await run_research_fn(topic)                                   ← blocking await

yield formatted status + content for all 4 outputs                      ← second yield (final results)
```

**Output tuple order** (8 values):
```
(alpha_status, beta_status, gamma_status, analyst_status,
 alpha_out,    beta_out,    gamma_out,    analyst_out)
```

**`fmt(result) -> (status_str, content_str)`**
- On error: `status = "*Error: {msg}*"`, `content = blockquote of error`.
- On success: `status = "*Done — `{model}`*"`, `content = response_text`.

---

## 8. Sequence Diagram

```
User          Gradio UI       Orchestrator     Agent1/2/3       LLMProvider     SQLite
  │               │                │                │                │             │
  │─── submit ───►│                │                │                │             │
  │               │─ yield "Researching..." ────────────────────────────────────── │
  │               │─── run_research(topic) ──►│     │                │             │
  │               │                │──create_session──────────────────────────────►│
  │               │                │◄── session_id ───────────────────────────────│
  │               │                │──────────── asyncio.gather ──►│               │
  │               │                │                │── chat_completion ──►│        │
  │               │                │                │◄── response_text ───│        │
  │               │                │                │── save_agent_response ───────►│
  │               │                │◄──────────────── AgentResult ─┘               │
  │               │                │── analyst.invoke(topic, session_id) ──────────│
  │               │                │                       │── get_session_responses►│
  │               │                │                       │◄── 3 rows ────────────│
  │               │                │                       │── chat_completion ──►│ │
  │               │                │                       │◄── synthesis ───────│ │
  │               │                │                       │── save_analyst_eval ─►│
  │               │                │                       │── complete_session ──►│
  │               │◄── (4 AgentResults) ─────────────────────────────────────────  │
  │               │─ yield results ─────────────────────────────────────────────── │
  │◄── render ───│                │                │                │             │
```
