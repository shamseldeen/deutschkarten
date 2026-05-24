import sqlite3
import os
import threading
from datetime import datetime

DB_PATH = os.path.join(os.path.expanduser("~"), ".deutschkarten", "cards.db")
_lock = threading.Lock()


def _conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    with _lock, _conn() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS flashcards (
                id              INTEGER PRIMARY KEY,
                word            TEXT NOT NULL,
                article         TEXT,
                base_word       TEXT NOT NULL,
                level           TEXT NOT NULL,
                category        TEXT NOT NULL,
                english         TEXT NOT NULL,
                arabic          TEXT NOT NULL,
                example_de      TEXT NOT NULL,
                example_en      TEXT NOT NULL,
                example_ar      TEXT NOT NULL,
                image_url       TEXT,
                known           INTEGER NOT NULL DEFAULT 0,
                source          TEXT NOT NULL DEFAULT 'offline',
                created_at      TEXT NOT NULL
            )
        """)
        c.commit()
    _seed_offline()


def _seed_offline():
    from offline_data import OFFLINE_WORDS
    with _lock, _conn() as c:
        for w in OFFLINE_WORDS:
            existing = c.execute("SELECT id FROM flashcards WHERE id=?", (w["id"],)).fetchone()
            if not existing:
                c.execute("""
                    INSERT INTO flashcards
                        (id,word,article,base_word,level,category,english,arabic,
                         example_de,example_en,example_ar,image_url,known,source,created_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,'offline',?)
                """, (
                    w["id"], w["word"], w.get("article"), w["baseWord"],
                    w["level"], w["category"],
                    w["englishTranslation"], w["arabicTranslation"],
                    w["exampleSentenceDe"], w["exampleSentenceEn"], w["exampleSentenceAr"],
                    w.get("imageUrl"), datetime.utcnow().isoformat()
                ))
        c.commit()


def _row_to_dict(row):
    if row is None:
        return None
    return {
        "id": row["id"],
        "word": row["word"],
        "article": row["article"],
        "baseWord": row["base_word"],
        "level": row["level"],
        "category": row["category"],
        "englishTranslation": row["english"],
        "arabicTranslation": row["arabic"],
        "exampleSentenceDe": row["example_de"],
        "exampleSentenceEn": row["example_en"],
        "exampleSentenceAr": row["example_ar"],
        "imageUrl": row["image_url"],
        "known": bool(row["known"]),
        "source": row["source"],
        "createdAt": row["created_at"],
    }


def get_cards(level=None, limit=200, offset=0):
    with _lock, _conn() as c:
        if level:
            rows = c.execute(
                "SELECT * FROM flashcards WHERE level=? ORDER BY id LIMIT ? OFFSET ?",
                (level, limit, offset)
            ).fetchall()
            total = c.execute(
                "SELECT COUNT(*) FROM flashcards WHERE level=?", (level,)
            ).fetchone()[0]
        else:
            rows = c.execute(
                "SELECT * FROM flashcards ORDER BY id LIMIT ? OFFSET ?",
                (limit, offset)
            ).fetchall()
            total = c.execute("SELECT COUNT(*) FROM flashcards").fetchone()[0]
    return {"items": [_row_to_dict(r) for r in rows], "total": total}


def get_daily_cards(level=None, count=20):
    with _lock, _conn() as c:
        if level:
            rows = c.execute(
                "SELECT * FROM flashcards WHERE level=? AND known=0 ORDER BY RANDOM() LIMIT ?",
                (level, count)
            ).fetchall()
            if len(rows) < count:
                extra = c.execute(
                    "SELECT * FROM flashcards WHERE level=? ORDER BY RANDOM() LIMIT ?",
                    (level, count - len(rows))
                ).fetchall()
                rows = list(rows) + [r for r in extra if r["id"] not in {x["id"] for x in rows}]
        else:
            rows = c.execute(
                "SELECT * FROM flashcards WHERE known=0 ORDER BY RANDOM() LIMIT ?",
                (count,)
            ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_stats():
    levels = ["A1", "A2", "B1", "B2", "C1"]
    result = []
    with _lock, _conn() as c:
        for lv in levels:
            total = c.execute("SELECT COUNT(*) FROM flashcards WHERE level=?", (lv,)).fetchone()[0]
            known = c.execute("SELECT COUNT(*) FROM flashcards WHERE level=? AND known=1", (lv,)).fetchone()[0]
            result.append({
                "level": lv,
                "total": total,
                "known": known,
                "unknown": total - known,
                "percentage": int(known / total * 100) if total else 0,
            })
    return result


def update_progress(card_id, known):
    with _lock, _conn() as c:
        c.execute("UPDATE flashcards SET known=? WHERE id=?", (1 if known else 0, card_id))
        c.commit()


def upsert_api_card(card):
    with _lock, _conn() as c:
        existing = c.execute("SELECT id FROM flashcards WHERE id=?", (card["id"],)).fetchone()
        if existing:
            return
        c.execute("""
            INSERT INTO flashcards
                (id,word,article,base_word,level,category,english,arabic,
                 example_de,example_en,example_ar,image_url,known,source,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,'online',?)
        """, (
            card["id"], card["word"], card.get("article"), card.get("baseWord", card["word"]),
            card["level"], card["category"],
            card["englishTranslation"], card["arabicTranslation"],
            card["exampleSentenceDe"], card["exampleSentenceEn"], card["exampleSentenceAr"],
            card.get("imageUrl"), card.get("createdAt", datetime.utcnow().isoformat())
        ))
        c.commit()
