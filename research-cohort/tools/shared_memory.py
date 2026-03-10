import sqlite3
import uuid
from datetime import datetime
from pathlib import Path


DB_PATH = Path(__file__).parent.parent / "research.db"


class SharedMemory:
    def __init__(self, db_path: str | None = None):
        self.db_path = str(db_path or DB_PATH)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS research_sessions (
                    id TEXT PRIMARY KEY,
                    topic TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'in_progress'
                );

                CREATE TABLE IF NOT EXISTS agent_responses (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    agent_id TEXT NOT NULL,
                    agent_name TEXT NOT NULL,
                    model TEXT NOT NULL,
                    response_text TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES research_sessions(id)
                );

                CREATE TABLE IF NOT EXISTS analyst_evaluations (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    recommendation TEXT NOT NULL,
                    reasoning TEXT,
                    best_agent_id TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES research_sessions(id)
                );
            """)

    def create_session(self, topic: str) -> str:
        session_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO research_sessions (id, topic, created_at, status) VALUES (?, ?, ?, ?)",
                (session_id, topic, now, "in_progress"),
            )
        return session_id

    def complete_session(self, session_id: str):
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE research_sessions SET status = 'completed' WHERE id = ?",
                (session_id,),
            )

    def save_agent_response(
        self,
        session_id: str,
        agent_id: str,
        agent_name: str,
        model: str,
        response_text: str,
    ) -> str:
        response_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        with self._get_conn() as conn:
            conn.execute(
                """INSERT INTO agent_responses
                   (id, session_id, agent_id, agent_name, model, response_text, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (response_id, session_id, agent_id, agent_name, model, response_text, now),
            )
        return response_id

    def get_session_responses(self, session_id: str) -> list[dict]:
        with self._get_conn() as conn:
            rows = conn.execute(
                """SELECT agent_id, agent_name, model, response_text, created_at
                   FROM agent_responses
                   WHERE session_id = ?
                   ORDER BY created_at""",
                (session_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def save_analyst_evaluation(
        self,
        session_id: str,
        recommendation: str,
        reasoning: str = "",
        best_agent_id: str = "",
    ) -> str:
        eval_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        with self._get_conn() as conn:
            conn.execute(
                """INSERT INTO analyst_evaluations
                   (id, session_id, recommendation, reasoning, best_agent_id, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (eval_id, session_id, recommendation, reasoning, best_agent_id, now),
            )
        return eval_id
