# Gaps, Missed Details & Assumptions

This document audits the original implementation plan against the actual code, records every assumption made during implementation, and flags risks that could cause runtime failures.

---

## Part 1 — Gaps in the Original Plan

These are things the plan either under-specified, conflicted internally, or omitted entirely.

---

### G1 — "3×3 Grid" Description Is Inaccurate

**Plan said:** "The UI is a Gradio 3×3 grid."

**Actual layout:**
- Row 1: 3 columns (the three research agents) — correct
- Row 2: 1 full-width column (analyst synthesis) — not a grid row
- Row 3: Textbox + Button (user input)

The layout is `3-1-1`, not `3×3`. A 3×3 grid would imply 9 cells. The ASCII diagram in the plan itself contradicts the "3×3" label — it shows 3 rows, not 3 rows × 3 columns throughout.

**Impact:** Low — cosmetic mismatch in naming only.

---

### G2 — All Agents Use the Same Provider (HuggingFace)

**Plan said:** "3 parallel research agents independently investigate a topic using different LLMs."

**Plan's `config.json` showed:** All four agents set `"provider": "huggingface"`.

**Actual implementation:** All four agents use HuggingFace. The models differ (Llama-3.2-3B, Mistral-7B, Gemma-2-2B, Llama-3.1-8B), but the API provider is the same for all.

**Consequence:** "Different LLMs" means different model weights here, not different vendor APIs. Groq and OpenRouter keys are in `.env.example` but no agent currently uses them. The provider abstraction exists but is unused beyond HuggingFace.

**Impact:** Medium — if the intent was genuine provider diversity (HF + Groq + OpenRouter), the config needs updating to assign different providers per agent. The code supports it fully; only the config is missing.

---

### G3 — Individual Agent Status Streaming Is Not Possible With Current Design

**Plan said:** "Status indicators per agent column show 'Researching...' while async tasks run."

**Actual behaviour:** All three agents are fired via `asyncio.gather`. The UI yields one "Researching..." state for all three simultaneously, waits for all three to complete, then renders all three results at once. There is no mechanism to update Agent Alpha's panel the moment Alpha finishes while Beta and Gamma are still running.

**Root cause:** `asyncio.gather` returns only when all coroutines complete. To show per-agent completion, you would need Gradio streaming with separate state per column, or use `asyncio.as_completed`.

**Impact:** High (UX) — if a user expects to see agents populate one by one as they finish (the natural reading of "while async tasks run"), that expectation is not met. All three populate simultaneously when the slowest one finishes.

---

### G4 — `reasoning` and `best_agent_id` DB Columns Are Always Empty

**Plan's `analyst_evaluations` table:** Defined `reasoning TEXT` and `best_agent_id TEXT` as meaningful structured fields.

**Actual behaviour:** `AnalystAgent` passes `reasoning=""` and `best_agent_id=""` to `save_analyst_evaluation()`. The analyst's LLM output is stored only in `recommendation` as a freeform markdown blob.

**Root cause:** The plan didn't specify how to parse the analyst's free-text response into structured fields. No parsing logic was implemented.

**Impact:** Medium — the DB schema implies structured data that doesn't materialise. Queries like `SELECT best_agent_id FROM analyst_evaluations` always return empty strings.

---

### G5 — `asyncio.run()` Wrapper Mentioned in Plan Is Not Used

**Plan said:** "Gradio calls this via `asyncio.run()` wrapper."

**Actual implementation:** Gradio 4.x natively supports async event handlers. `on_submit` is an `async def` generator that Gradio runs directly. No `asyncio.run()` is needed or used.

**Impact:** None — the plan's description was outdated. The implementation is correct for Gradio 4.x.

---

### G6 — No Timeout on LLM API Calls

**Plan:** Silent on timeouts.

**Actual implementation:** `AsyncOpenAI` is created with default settings (no `timeout` parameter). If an LLM API endpoint hangs, the coroutine hangs indefinitely, blocking the Gradio request for that user.

**Impact:** High (reliability) — in production, a single slow HuggingFace cold-start can hold a Gradio worker for minutes.

---

### G7 — No Retry Logic for Failed API Calls

**Plan:** Silent on retries.

**Actual implementation:** `ResearchAgent` catches exceptions and returns an error `AgentResult`. There is no retry — a single transient network error or rate-limit response permanently fails that agent's panel for the session.

**Impact:** Medium — HuggingFace Inference API frequently returns 503 during cold-starts. Without retry, users will see error panels rather than waiting briefly and succeeding.

---

### G8 — SQLite Concurrent Write Contention Is Not Handled

**Plan:** "Agents share state via SQLite."

**Actual implementation:** `asyncio.gather` runs three coroutines concurrently. Each calls `save_agent_response`, which opens a new `sqlite3.connect()` and writes. SQLite in default journal mode does not support concurrent writers — simultaneous writes will raise `OperationalError: database is locked`.

**Root cause:** SQLite's default journal mode (DELETE/rollback) serialises writes with a file lock. With async concurrent writes, this lock contention is frequent.

**Mitigation not implemented:** WAL mode (`PRAGMA journal_mode=WAL`) or serialising writes through a queue.

**Impact:** High (correctness) — concurrent agent writes will fail under realistic async concurrency.

---

### G9 — `build_agents()` Called on Every Request

**Plan showed** `run_research` as a standalone function but didn't specify object lifecycle.

**Actual implementation:** `build_agents()` is called inside `run_research()`, so every button click creates new `LLMProvider`, `SharedMemory`, and four agent instances. This means:
- `SharedMemory._init_db()` runs on every request (harmless but wasteful).
- `LLMProvider._clients` cache is discarded on every request (no connection reuse).
- `AsyncOpenAI` HTTP client is recreated per request (no persistent connection pool).

**Impact:** Low-medium — inefficient but not incorrect for single-user local use.

---

### G10 — `aiohttp` in `requirements.txt` Is Unused

**Plan's requirements:** Listed `aiohttp>=3.9.0`.

**Actual code:** No file imports `aiohttp`. The `openai` library manages its own HTTP transport internally.

**Impact:** Low — installs an unnecessary dependency.

---

### G11 — HuggingFace Model Availability Is Not Guaranteed

**Plan specified:** Specific model IDs including `google/gemma-2-2b-it` and `meta-llama/Meta-Llama-3.1-8B-Instruct`.

**Risk:** HuggingFace Inference API (serverless) only serves models that are:
1. Officially supported in their inference API (not all models are).
2. Available under the user's account tier (some require PRO subscription).
3. Not gated behind licence agreements requiring explicit model access request.

`meta-llama/Llama-3.2-3B-Instruct` and `meta-llama/Meta-Llama-3.1-8B-Instruct` require accepting Meta's licence on HuggingFace first. `google/gemma-2-2b-it` requires accepting Google's licence.

**Impact:** High (first-run) — the application will return 403 or 404 errors until the user has explicitly accepted each model's licence on HuggingFace.

---

### G12 — No `.gitignore`

**Plan:** Mentioned `.env` is gitignored but no `.gitignore` was specified or created.

**Impact:** Medium (security) — `research.db` and `.env` will appear as untracked files and could be accidentally committed.

---

### G13 — No Session Isolation for Concurrent Users

**Plan:** Single-user local app assumed, but `server_name="0.0.0.0"` means it's accessible to anyone on the network.

**Risk:** If two users submit topics simultaneously, both calls to `run_research` create separate sessions (different `session_id`), so DB rows are isolated. However, SQLite write contention (G8) is worsened under multi-user load.

**Impact:** Low for single-user; medium if shared on a LAN.

---

## Part 2 — Dead Code / Minor Issues in Implementation

| Location | Issue |
|----------|-------|
| `ui/layout.py:54` | `set_researching()` is defined but never called. |
| `app.py:3` | `import sys` — unused. |
| `app.py:4` | `import os` — unused. |
| `providers/llm_provider.py:38` | `extra_system` parameter exists and is documented but no agent ever passes a non-empty value. |

---

## Part 3 — Assumptions Made During Implementation

These are decisions made without explicit guidance in the plan.

| # | Assumption | Rationale |
|---|-----------|-----------|
| A1 | Python ≥3.10 required | Used `str \| None` union syntax (PEP 604). If Python 3.9 is needed, this must change to `Optional[str]`. |
| A2 | All 4 agents use HuggingFace provider | The plan's `config.json` sample listed HuggingFace for all agents. Groq and OpenRouter are configured as available providers but not assigned to any agent. |
| A3 | SQLite without WAL mode | Simple default setup; appropriate for single-user local POC. Not suitable for concurrent users. |
| A4 | DB file placed at project root (`research.db`) | `Path(__file__).parent.parent / "research.db"` from `tools/shared_memory.py`. Not configurable without changing code. |
| A5 | No LLM response streaming | Full response is awaited before display. The plan did not ask for token streaming. |
| A6 | Analyst reads from DB, not from in-memory `AgentResult` objects | Follows the plan's architectural decision that DB is the inter-agent communication channel. |
| A7 | `AgentResult.error` is non-empty string on failure | Empty string = success. This avoids `None` checks but means `bool(result.error)` is the failure signal. |
| A8 | `analyst_evaluations.reasoning` and `best_agent_id` left empty | No structured parsing of the LLM's freeform output was specified. Full output stored in `recommendation`. |
| A9 | `build_agents()` called per request | Simplest correct approach given no explicit object lifecycle was specified. |
| A10 | Gradio `queue()` called before `launch()` | Required to support async generator event handlers in Gradio 4.x. Not mentioned in plan but necessary. |
| A11 | `topic_input.submit` (Enter key) triggers the same handler as the button | Standard UX convenience; plan only showed the button. |
| A12 | `server_name="0.0.0.0"` | Makes the app reachable from other machines on the same network. `localhost`-only would use `"127.0.0.1"`. |

---

## Part 4 — Recommended Fixes (Priority Order)

| Priority | Gap | Fix |
|----------|-----|-----|
| **Critical** | G8 — SQLite write contention | Enable WAL mode: `conn.execute("PRAGMA journal_mode=WAL")` in `_init_db()` |
| **Critical** | G11 — Model gating | Document that user must accept model licences on HuggingFace before first run |
| **High** | G6 — No timeout | Add `timeout=60` to `AsyncOpenAI(...)` constructor |
| **High** | G7 — No retry | Wrap `chat_completion` call in a simple retry loop (max 3 attempts, exponential backoff) |
| **Medium** | G3 — No per-agent streaming | Use `asyncio.as_completed` and Gradio state updates to populate panels as each agent finishes |
| **Medium** | G4 — Empty DB fields | Parse analyst output with regex or structured prompting to extract `best_agent_id` and `reasoning` |
| **Medium** | G12 — No `.gitignore` | Add `.gitignore` with `*.db`, `.env`, `__pycache__/`, `*.pyc` |
| **Low** | G9 — Per-request object creation | Move `build_agents()` to module level; make `SharedMemory` and `LLMProvider` singletons |
| **Low** | G10 — Unused `aiohttp` | Remove from `requirements.txt` |
| **Low** | Dead code | Remove `set_researching()`, `import sys`, `import os` |
| **Low** | G2 — Single provider | Reassign `research_agent_2` → Groq, `research_agent_3` → OpenRouter for genuine provider diversity |
