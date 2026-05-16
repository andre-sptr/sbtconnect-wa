import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "database" / "dev.db"
SQL = ROOT / "database" / "init.sql"

DB.parent.mkdir(parents=True, exist_ok=True)
if DB.exists():
    DB.unlink()

with sqlite3.connect(DB) as conn:
    conn.executescript(SQL.read_text(encoding="utf-8-sig"))
    conn.commit()

print(DB)
