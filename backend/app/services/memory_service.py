import sqlite3
from pathlib import Path
from threading import Lock

ChatMessage = dict[str, str]

MAX_MESSAGES_PER_SESSION = 16
DB_PATH = Path(__file__).resolve().parents[2] / "data" / "app.db"

_db_lock = Lock()


def init_memory_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
            ON chat_messages (session_id, id)
            """
        )


def get_recent_messages(session_id: str) -> list[ChatMessage]:
    init_memory_db()
    with _db_lock, sqlite3.connect(DB_PATH) as connection:
        rows = connection.execute(
            """
            SELECT role, content
            FROM chat_messages
            WHERE session_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (session_id, MAX_MESSAGES_PER_SESSION),
        ).fetchall()

    return [{"role": role, "content": content} for role, content in reversed(rows)]


def append_turn(session_id: str, user_message: str, assistant_reply: str) -> None:
    init_memory_db()
    with _db_lock, sqlite3.connect(DB_PATH) as connection:
        connection.executemany(
            """
            INSERT INTO chat_messages (session_id, role, content)
            VALUES (?, ?, ?)
            """,
            [
                (session_id, "user", user_message),
                (session_id, "assistant", assistant_reply),
            ],
        )
        connection.execute(
            """
            DELETE FROM chat_messages
            WHERE session_id = ?
              AND id NOT IN (
                  SELECT id
                  FROM chat_messages
                  WHERE session_id = ?
                  ORDER BY id DESC
                  LIMIT ?
              )
            """,
            (session_id, session_id, MAX_MESSAGES_PER_SESSION),
        )
