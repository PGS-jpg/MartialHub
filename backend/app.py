from flask import Flask, jsonify, request
from flask_cors import CORS
from functools import wraps
import os
import sqlite3
import json
from datetime import datetime
import threading
import time

import requests
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)


def parse_allowed_origins():
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    frontend_base = os.getenv("FRONTEND_BASE_URL", "https://selestialhub.com").strip()

    # Keep local developer domains always allowed, even when ALLOWED_ORIGINS is set.
    defaults = [
        frontend_base,
        "https://selestialhub.com",
        "https://www.selestialhub.com",
        "http://selestialhub.local:3000",
        "https://selestialhub.local:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]

    if raw:
        custom = [origin.strip() for origin in raw.split(",") if origin.strip()]
        return list(dict.fromkeys(custom + defaults))

    return list(dict.fromkeys(defaults))


ALLOWED_ORIGINS = parse_allowed_origins()

CORS(
    app,
    resources={r"/api/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=True,
)


RATE_LIMIT_STORAGE = {}
RATE_LIMIT_LOCK = threading.Lock()


def get_client_ip():
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.remote_addr or "unknown"


def rate_limit(key_prefix, max_requests=20, window_seconds=60):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            now = time.time()
            client_ip = get_client_ip()
            storage_key = f"{key_prefix}:{client_ip}"

            with RATE_LIMIT_LOCK:
                timestamps = RATE_LIMIT_STORAGE.get(storage_key, [])
                cutoff = now - window_seconds
                timestamps = [ts for ts in timestamps if ts >= cutoff]

                if len(timestamps) >= max_requests:
                    return jsonify({"error": "Muitas requisições. Tente novamente em instantes."}), 429

                timestamps.append(now)
                RATE_LIMIT_STORAGE[storage_key] = timestamps

            return func(*args, **kwargs)

        return wrapper

    return decorator

PLAN_PRICES = {
    "athlete_pro": 19.90,
    "academy_premium": 49.90,
}

PLAN_TITLES = {
    "athlete_pro": "Plano Atleta PRO",
    "academy_premium": "Plano Academia Premium",
}


def parse_bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "y", "on"}


def simulated_checkout_enabled() -> bool:
    return parse_bool_env("ALLOW_SIMULATED_CHECKOUT", default=False)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRIMARY_DB_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "martialhub.db"))
LEGACY_DB_PATH = os.path.join(BASE_DIR, "martialhub.db")


def get_db_connection(db_path: str = PRIMARY_DB_PATH):
    return sqlite3.connect(db_path)


def iter_user_sources():
    sources = [("primary", PRIMARY_DB_PATH)]
    if os.path.exists(LEGACY_DB_PATH) and os.path.normcase(LEGACY_DB_PATH) != os.path.normcase(PRIMARY_DB_PATH):
        sources.append(("legacy", LEGACY_DB_PATH))
    return sources


def get_users_table_columns(cursor):
    cursor.execute("PRAGMA table_info(users)")
    return {row[1] for row in cursor.fetchall()}


def build_users_select(columns, specs):
    expressions = []
    for col_name, default_sql in specs:
        if col_name in columns:
            expressions.append(col_name)
        else:
            expressions.append(f"{default_sql} AS {col_name}")
    return ", ".join(expressions)


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            is_pro BOOLEAN DEFAULT 0,
            is_academy_pro BOOLEAN DEFAULT 0,
            is_coach BOOLEAN DEFAULT 0,
            pagamento TEXT DEFAULT 'nenhum',
            bio TEXT DEFAULT '',
            academia TEXT DEFAULT '',
            cidade TEXT DEFAULT '',
            modalidade TEXT DEFAULT '',
            faixa TEXT DEFAULT '',
            estilo TEXT DEFAULT '',
            avatar_url TEXT DEFAULT ''
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,
            theme TEXT DEFAULT 'dark',
            profile_public BOOLEAN DEFAULT 1,
            show_weight BOOLEAN DEFAULT 0,
            allow_challenges BOOLEAN DEFAULT 1,
            allow_messages BOOLEAN DEFAULT 1,
            notify_events BOOLEAN DEFAULT 1,
            notify_ranking BOOLEAN DEFAULT 1,
            notify_chat BOOLEAN DEFAULT 1,
            notify_marketing BOOLEAN DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS academies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            endereco TEXT NOT NULL,
            cidade TEXT DEFAULT '',
            modalidade TEXT DEFAULT '',
            contato TEXT DEFAULT '',
            created_by_user_id INTEGER,
            lat REAL DEFAULT 0,
            lng REAL DEFAULT 0,
            is_sponsored BOOLEAN DEFAULT 0
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            recipient_id INTEGER,
            user_name TEXT,
            message TEXT,
            created_at TEXT
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tournaments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            modality TEXT NOT NULL,
            city TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            status TEXT DEFAULT 'upcoming',
            level TEXT DEFAULT 'intermediario',
            prize_pool REAL DEFAULT 0,
            max_participants INTEGER DEFAULT 100,
            description TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER NOT NULL,
            athlete1_id INTEGER,
            athlete1_name TEXT NOT NULL,
            athlete2_id INTEGER,
            athlete2_name TEXT NOT NULL,
            modality TEXT NOT NULL,
            round INTEGER DEFAULT 1,
            round_order INTEGER DEFAULT 1,
            status TEXT DEFAULT 'scheduled',
            winner_id INTEGER,
            duration_seconds INTEGER DEFAULT 0,
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tournament_id) REFERENCES tournaments(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scoreboards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL UNIQUE,
            athlete1_score INTEGER DEFAULT 0,
            athlete2_score INTEGER DEFAULT 0,
            athlete1_advantages INTEGER DEFAULT 0,
            athlete2_advantages INTEGER DEFAULT 0,
            athlete1_penalties INTEGER DEFAULT 0,
            athlete2_penalties INTEGER DEFAULT 0,
            current_round INTEGER DEFAULT 1,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            remaining_seconds INTEGER DEFAULT 0,
            clock_started_at INTEGER,
            status TEXT DEFAULT 'not_started',
            FOREIGN KEY(match_id) REFERENCES matches(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS modality_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            modality TEXT UNIQUE NOT NULL,
            point_types TEXT NOT NULL,
            max_rounds INTEGER DEFAULT 3,
            round_duration_seconds INTEGER DEFAULT 300,
            description TEXT DEFAULT ''
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_fights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            event TEXT NOT NULL,
            opponent TEXT NOT NULL,
            result TEXT NOT NULL,
            method TEXT NOT NULL,
            round INTEGER DEFAULT 1,
            time TEXT DEFAULT '00:00',
            is_official BOOLEAN DEFAULT 1,
            video_url TEXT DEFAULT '',
            review_status TEXT DEFAULT 'Pendente',
            review_notes TEXT DEFAULT '',
            reviewed_by_coach_id INTEGER,
            reviewed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            issuer TEXT NOT NULL,
            date TEXT NOT NULL,
            category TEXT DEFAULT 'Graduacao',
            evidence_url TEXT DEFAULT '',
            status TEXT DEFAULT 'Pendente',
            review_notes TEXT DEFAULT '',
            reviewed_by_coach_id INTEGER,
            reviewed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_training_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT DEFAULT '',
            modality TEXT DEFAULT '',
            session_type TEXT DEFAULT 'tecnico',
            status TEXT DEFAULT 'Pendente',
            duration_seconds INTEGER DEFAULT 0,
            distance_km REAL DEFAULT 0,
            rounds_completed INTEGER DEFAULT 0,
            notes TEXT DEFAULT '',
            evidence_url TEXT DEFAULT '',
            abandoned BOOLEAN DEFAULT 0,
            xp_estimated INTEGER DEFAULT 0,
            xp_awarded INTEGER DEFAULT 0,
            review_notes TEXT DEFAULT '',
            reviewed_by_coach_id INTEGER,
            reviewed_at TEXT,
            started_at TEXT,
            ended_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_follows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            follower_id INTEGER NOT NULL,
            following_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(follower_id, following_id),
            FOREIGN KEY(follower_id) REFERENCES users(id),
            FOREIGN KEY(following_id) REFERENCES users(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            actor_id INTEGER,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(actor_id) REFERENCES users(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS payment_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            provider_payment_id TEXT UNIQUE NOT NULL,
            user_id INTEGER,
            plan_code TEXT,
            external_reference TEXT,
            status TEXT NOT NULL,
            status_detail TEXT DEFAULT '',
            amount REAL DEFAULT 0,
            currency_id TEXT DEFAULT 'BRL',
            raw_payload TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS coach_athletes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL,
            athlete_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(coach_id, athlete_id),
            FOREIGN KEY(coach_id) REFERENCES users(id),
            FOREIGN KEY(athlete_id) REFERENCES users(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS coach_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL,
            athlete_id INTEGER NOT NULL,
            notes TEXT DEFAULT '',
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(coach_id, athlete_id),
            FOREIGN KEY(coach_id) REFERENCES users(id),
            FOREIGN KEY(athlete_id) REFERENCES users(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS coach_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL,
            athlete_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            focus TEXT NOT NULL,
            day_label TEXT DEFAULT 'Seg',
            duration_minutes INTEGER DEFAULT 60,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(coach_id) REFERENCES users(id),
            FOREIGN KEY(athlete_id) REFERENCES users(id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS athlete_radar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            athlete_id INTEGER NOT NULL UNIQUE,
            coach_id INTEGER NOT NULL,
            agressividade INTEGER DEFAULT 50,
            velocidade INTEGER DEFAULT 50,
            forca INTEGER DEFAULT 50,
            resistencia INTEGER DEFAULT 50,
            stamina INTEGER DEFAULT 50,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(athlete_id) REFERENCES users(id),
            FOREIGN KEY(coach_id) REFERENCES users(id)
        )
        """
    )

    migrations = [
        "ALTER TABLE users ADD COLUMN is_academy_pro BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN is_coach BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN pagamento TEXT DEFAULT 'nenhum'",
        "ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN academia TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN cidade TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN modalidade TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN faixa TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN estilo TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''",
        "ALTER TABLE messages ADD COLUMN recipient_id INTEGER",
        "ALTER TABLE academies ADD COLUMN cidade TEXT DEFAULT ''",
        "ALTER TABLE academies ADD COLUMN modalidade TEXT DEFAULT ''",
        "ALTER TABLE academies ADD COLUMN created_by_user_id INTEGER",
        "ALTER TABLE academies ADD COLUMN lat REAL DEFAULT 0",
        "ALTER TABLE academies ADD COLUMN lng REAL DEFAULT 0",
        "ALTER TABLE academies ADD COLUMN is_sponsored BOOLEAN DEFAULT 0",
        "ALTER TABLE academies ADD COLUMN contato TEXT DEFAULT ''",
        "ALTER TABLE user_fights ADD COLUMN video_url TEXT DEFAULT ''",
        "ALTER TABLE user_fights ADD COLUMN review_status TEXT DEFAULT 'Pendente'",
        "ALTER TABLE user_fights ADD COLUMN review_notes TEXT DEFAULT ''",
        "ALTER TABLE user_fights ADD COLUMN reviewed_by_coach_id INTEGER",
        "ALTER TABLE user_fights ADD COLUMN reviewed_at TEXT",
        "ALTER TABLE user_certificates ADD COLUMN review_notes TEXT DEFAULT ''",
        "ALTER TABLE user_certificates ADD COLUMN reviewed_by_coach_id INTEGER",
        "ALTER TABLE user_certificates ADD COLUMN reviewed_at TEXT",
        "ALTER TABLE athlete_radar ADD COLUMN agressividade INTEGER DEFAULT 50",
        "ALTER TABLE athlete_radar ADD COLUMN velocidade INTEGER DEFAULT 50",
        "ALTER TABLE athlete_radar ADD COLUMN forca INTEGER DEFAULT 50",
        "ALTER TABLE athlete_radar ADD COLUMN resistencia INTEGER DEFAULT 50",
        "ALTER TABLE athlete_radar ADD COLUMN stamina INTEGER DEFAULT 50",
    ]
    for stmt in migrations:
        try:
            cursor.execute(stmt)
        except Exception:
            pass

    cursor.execute('SELECT COUNT(*) FROM modality_rules WHERE modality = "bjj"')
    if cursor.fetchone()[0] == 0:
        rules_data = [
            ("bjj", "takedown:2,knee_on_belly:2,guard_pass:3,mount:4,back_control:4", 3, 300, "BJJ - Positional points"),
            ("muay_thai", "punch:1,kick:1,knee:2,elbow:1,clinch_control:1", 5, 180, "Muay Thai - Strike based"),
            ("boxe", "knock_down:1,judge_point:1", 12, 180, "Boxe - Judge scoring"),
            ("judo", "waza_ari:1,ippon:2", 1, 300, "Judo - Throw points"),
            ("taekwondo", "punch:1,kick:1,kick_head:2", 3, 120, "Taekwondo - Sensor points"),
            ("mma", "takedown:2,strike:1,submission_defense:1", 5, 300, "MMA - 10 point system"),
        ]
        for row in rules_data:
            cursor.execute(
                "INSERT INTO modality_rules (modality, point_types, max_rounds, round_duration_seconds, description) VALUES (?, ?, ?, ?, ?)",
                row,
            )

    conn.commit()
    conn.close()


def sync_legacy_users_to_primary():
    if not os.path.exists(LEGACY_DB_PATH):
        return
    if os.path.normcase(LEGACY_DB_PATH) == os.path.normcase(PRIMARY_DB_PATH):
        return

    try:
        primary_conn = get_db_connection(PRIMARY_DB_PATH)
        primary_cursor = primary_conn.cursor()
        legacy_conn = get_db_connection(LEGACY_DB_PATH)
        legacy_cursor = legacy_conn.cursor()

        legacy_columns = get_users_table_columns(legacy_cursor)
        legacy_select = build_users_select(
            legacy_columns,
            [
                ("nome", "''"),
                ("email", "''"),
                ("senha", "''"),
                ("is_pro", "0"),
                ("is_academy_pro", "0"),
                ("is_coach", "0"),
                ("pagamento", "'nenhum'"),
                ("bio", "''"),
                ("academia", "''"),
                ("cidade", "''"),
                ("modalidade", "''"),
                ("faixa", "''"),
                ("estilo", "''"),
            ],
        )

        legacy_cursor.execute(f"SELECT {legacy_select} FROM users")
        rows = legacy_cursor.fetchall()

        for row in rows:
            primary_cursor.execute(
                """
                INSERT OR IGNORE INTO users
                (nome, email, senha, is_pro, is_academy_pro, is_coach, pagamento, bio, academia, cidade, modalidade, faixa, estilo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                row,
            )

        primary_conn.commit()
        legacy_conn.close()
        primary_conn.close()
    except Exception:
        return


def find_user_for_login(email: str):
    normalized_email = (email or "").strip().lower()
    if not normalized_email:
        return None, None, None

    for source, db_path in iter_user_sources():
        if not os.path.exists(db_path):
            continue

        try:
            conn = get_db_connection(db_path)
            cursor = conn.cursor()
            user_columns = get_users_table_columns(cursor)
            user_select = build_users_select(
                user_columns,
                [
                    ("id", "NULL"),
                    ("nome", "''"),
                    ("email", "''"),
                    ("senha", "''"),
                    ("is_pro", "0"),
                    ("is_academy_pro", "0"),
                    ("is_coach", "0"),
                    ("bio", "''"),
                    ("academia", "''"),
                    ("cidade", "''"),
                    ("modalidade", "''"),
                    ("faixa", "''"),
                    ("estilo", "''"),
                ],
            )
            cursor.execute(f"SELECT {user_select} FROM users WHERE lower(email) = ? LIMIT 1", (normalized_email,))
            row = cursor.fetchone()
            conn.close()
            if row:
                return source, db_path, row
        except Exception:
            continue

    return None, None, None


def sync_authenticated_user_to_primary(user_row):
    if not user_row:
        return None

    try:
        conn = get_db_connection(PRIMARY_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users
            (nome, email, senha, is_pro, is_academy_pro, is_coach, bio, academia, cidade, modalidade, faixa, estilo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                nome = excluded.nome,
                senha = excluded.senha,
                is_pro = excluded.is_pro,
                is_academy_pro = excluded.is_academy_pro,
                is_coach = excluded.is_coach,
                bio = excluded.bio,
                academia = excluded.academia,
                cidade = excluded.cidade,
                modalidade = excluded.modalidade,
                faixa = excluded.faixa,
                estilo = excluded.estilo
            """,
            (
                user_row[1],
                user_row[2],
                user_row[3],
                int(bool(user_row[4])),
                int(bool(user_row[5])),
                int(bool(user_row[6])),
                user_row[7] or "",
                user_row[8] or "",
                user_row[9] or "",
                user_row[10] or "",
                user_row[11] or "",
                user_row[12] or "",
            ),
        )
        conn.commit()
        cursor.execute("SELECT id, nome, is_pro, is_academy_pro, is_coach, bio FROM users WHERE lower(email) = ?", ((user_row[2] or "").strip().lower(),))
        synced = cursor.fetchone()
        conn.close()
        return synced
    except Exception:
        return None


def build_user_payload(row):
    coach_raw = row[4] if len(row) > 4 else 0
    try:
        is_coach = int(coach_raw) == 1
    except Exception:
        is_coach = str(coach_raw).strip().lower() in {"true", "yes", "sim"}

    return {
        "id": row[0],
        "nome": row[1],
        "is_pro": bool(row[2]),
        "is_academy_pro": bool(row[3]),
        "is_coach": is_coach,
    }


def is_authorized_coach(conn, coach_id):
    cursor = conn.cursor()
    cursor.execute("SELECT is_coach FROM users WHERE id = ?", (coach_id,))
    row = cursor.fetchone()
    if not row:
        return False
    try:
        return int(row[0] or 0) == 1
    except Exception:
        return str(row[0]).strip().lower() in {"true", "yes", "sim"}


def is_admin_requester(conn, requester_user_id):
    if not requester_user_id:
        return False

    try:
        requester_id = int(requester_user_id)
    except Exception:
        return False

    admin_ids_raw = os.getenv("ADMIN_USER_IDS", "").strip()
    if admin_ids_raw:
        allowed_ids = set()
        for part in admin_ids_raw.split(","):
            part = part.strip()
            if not part:
                continue
            try:
                allowed_ids.add(int(part))
            except Exception:
                continue
        if allowed_ids and requester_id in allowed_ids:
            return True

    cursor = conn.cursor()

    # Bootstrap fallback for local/dev setups:
    # if no ADMIN_USER_IDS is configured and no account contains "admin" in email,
    # allow the first registered user to access the admin panel.
    if not admin_ids_raw:
        cursor.execute("SELECT COUNT(*) FROM users WHERE lower(email) LIKE '%admin%'")
        admin_like_count = int(cursor.fetchone()[0] or 0)
        if admin_like_count == 0:
            cursor.execute("SELECT id FROM users ORDER BY id ASC LIMIT 1")
            first_row = cursor.fetchone()
            if first_row and int(first_row[0]) == requester_id:
                return True

    cursor.execute("SELECT email FROM users WHERE id = ?", (requester_id,))
    row = cursor.fetchone()
    if not row:
        return False

    email = (row[0] or "").strip().lower()
    return "admin" in email


def apply_plan_to_user(user_id, plan_code):
    if plan_code not in PLAN_PRICES:
        return None, ("plano invalido", 400)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, nome, is_pro, is_academy_pro, is_coach FROM users WHERE id = ?", (user_id,))
    existing = cursor.fetchone()

    if not existing:
        conn.close()
        return None, ("usuario nao encontrado", 404)

    if plan_code == "athlete_pro":
        cursor.execute("UPDATE users SET is_pro = 1, pagamento = ? WHERE id = ?", ("athlete_pro", user_id))
    elif plan_code == "academy_premium":
        cursor.execute("UPDATE users SET is_academy_pro = 1, pagamento = ? WHERE id = ?", ("academy_premium", user_id))

    conn.commit()
    cursor.execute("SELECT id, nome, is_pro, is_academy_pro, is_coach FROM users WHERE id = ?", (user_id,))
    updated = cursor.fetchone()
    conn.close()

    return build_user_payload(updated), None


def parse_external_reference(reference):
    if not reference or ":" not in str(reference):
        return None, None

    left, right = str(reference).split(":", 1)
    try:
        user_id = int(left)
    except Exception:
        return None, None

    plan_code = right.strip()
    if plan_code not in PLAN_PRICES:
        return None, None

    return user_id, plan_code


def get_mercado_pago_access_token():
    return os.getenv("MERCADO_PAGO_ACCESS_TOKEN", "").strip()


def fetch_mercado_pago_payment(payment_id, access_token):
    res = requests.get(
        f"https://api.mercadopago.com/v1/payments/{payment_id}",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )

    try:
        payload = res.json()
    except Exception:
        payload = {"raw": res.text}

    if res.status_code >= 400:
        return None, ("erro ao consultar pagamento no Mercado Pago", 502, payload)

    return payload, None


def save_payment_transaction(payment_payload, user_id, plan_code):
    payment_id = str(payment_payload.get("id") or "").strip()
    if not payment_id:
        return

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO payment_transactions
        (provider, provider_payment_id, user_id, plan_code, external_reference, status, status_detail, amount, currency_id, raw_payload, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider_payment_id) DO UPDATE SET
            user_id = excluded.user_id,
            plan_code = excluded.plan_code,
            external_reference = excluded.external_reference,
            status = excluded.status,
            status_detail = excluded.status_detail,
            amount = excluded.amount,
            currency_id = excluded.currency_id,
            raw_payload = excluded.raw_payload,
            updated_at = excluded.updated_at
        """,
        (
            "mercado_pago",
            payment_id,
            user_id,
            plan_code,
            str(payment_payload.get("external_reference") or ""),
            str(payment_payload.get("status") or ""),
            str(payment_payload.get("status_detail") or ""),
            float(payment_payload.get("transaction_amount") or 0),
            str(payment_payload.get("currency_id") or "BRL"),
            json.dumps(payment_payload, ensure_ascii=True),
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def process_approved_payment(payment_payload):
    status = str(payment_payload.get("status") or "").lower()
    if status != "approved":
        return None, ("pagamento ainda nao aprovado", 409)

    external_reference = payment_payload.get("external_reference")
    user_id, plan_code = parse_external_reference(external_reference)
    if not user_id or not plan_code:
        return None, ("external_reference invalida no pagamento", 422)

    save_payment_transaction(payment_payload, user_id, plan_code)

    updated, err = apply_plan_to_user(user_id, plan_code)
    if err:
        return None, err

    return {
        "user": updated,
        "user_id": user_id,
        "plan_code": plan_code,
        "payment_id": str(payment_payload.get("id") or ""),
        "status": status,
    }, None


def collect_users_from_sources():
    users = []
    seen = set()
    source_counts = {}
    duplicates = 0

    for source, db_path in iter_user_sources():
        if not os.path.exists(db_path):
            source_counts[source] = 0
            continue

        conn = None
        try:
            conn = get_db_connection(db_path)
            cursor = conn.cursor()
            user_columns = get_users_table_columns(cursor)
            users_select = build_users_select(
                user_columns,
                [
                    ("id", "NULL"),
                    ("nome", "''"),
                    ("email", "''"),
                    ("is_pro", "0"),
                    ("cidade", "''"),
                    ("modalidade", "''"),
                    ("academia", "''"),
                    ("faixa", "''"),
                    ("avatar_url", "''"),
                ],
            )
            cursor.execute(f"SELECT {users_select} FROM users ORDER BY nome COLLATE NOCASE ASC")
            rows = cursor.fetchall()
        except Exception:
            if conn:
                conn.close()
            source_counts[source] = 0
            continue

        source_total = 0
        for row in rows:
            email = (row[2] or "").strip().lower()
            dedupe_key = email or f"{source}:{row[0]}:{(row[1] or '').strip().lower()}"
            if dedupe_key in seen:
                duplicates += 1
                continue

            user_stats = compute_user_combat_stats(conn, row[0])
            seen.add(dedupe_key)
            source_total += 1
            users.append(
                {
                    "id": row[0],
                    "unique_key": f"{source}-{row[0]}",
                    "nome": row[1],
                    "email": row[2] or "",
                    "is_pro": bool(row[3]),
                    "cidade": row[4] or "",
                    "modalidade": (row[5] or "").lower(),
                    "academia": row[6] or "Sem academia",
                    "faixa": (row[7] or "").strip().lower(),
                    "avatarUrl": row[8] or "",
                    "currentXP": user_stats["xp"],
                    "level": user_stats["level"],
                    "wins": user_stats["wins"],
                    "losses": user_stats["losses"],
                    "finishWins": user_stats["finish_wins"],
                    "officialWins": user_stats["official_wins"],
                    "verifiedFights": user_stats["verified_fights"],
                    "repeatedOpponentRate": user_stats["repeated_opponent_rate"],
                    "last30Activity": user_stats["last_30_activity"],
                    "lastFightDaysAgo": user_stats["last_fight_days_ago"],
                }
            )

        source_counts[source] = source_total
        conn.close()

    users.sort(key=lambda u: (u.get("nome") or "").lower())
    return users, source_counts, duplicates


def haversine(lat1, lng1, lat2, lng2):
    from math import radians, sin, cos, sqrt, atan2

    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c


def is_following(conn, follower_id, following_id):
    if not follower_id or not following_id:
        return False
    cursor = conn.cursor()
    cursor.execute(
        "SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1",
        (int(follower_id), int(following_id)),
    )
    return cursor.fetchone() is not None


def is_mutual_follow(conn, user_a_id, user_b_id):
    if not user_a_id or not user_b_id:
        return False
    return is_following(conn, user_a_id, user_b_id) and is_following(conn, user_b_id, user_a_id)


def create_notification(conn, user_id, notif_type, title, message, actor_id=None):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO user_notifications (user_id, actor_id, type, title, message, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
        """,
        (int(user_id), actor_id, notif_type, title, message, datetime.utcnow().isoformat()),
    )


def compute_user_progress(conn, user_id):
    stats = compute_user_combat_stats(conn, user_id)
    return stats["xp"], stats["level"]


def parse_date_yyyy_mm_dd(raw_value):
    if not raw_value:
        return None
    raw = str(raw_value).strip()
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw).date()
    except ValueError:
        try:
            return datetime.strptime(raw[:10], "%Y-%m-%d").date()
        except ValueError:
            return None


def estimate_training_xp(session_type, duration_seconds, distance_km, rounds_completed, abandoned):
    safe_duration = max(0, int(duration_seconds or 0))
    safe_distance = max(0.0, float(distance_km or 0.0))
    safe_rounds = max(0, int(rounds_completed or 0))

    duration_minutes = safe_duration / 60.0
    xp = min(120, int(round(duration_minutes * 1.2)))

    normalized_type = (session_type or "").strip().lower()
    if normalized_type in {"corrida", "caminhada", "cardio"}:
        xp += min(80, int(round(safe_distance * 12)))

    xp += min(40, safe_rounds * 4)

    if abandoned:
        xp = int(round(xp * 0.5))

    return max(5, xp)


def compute_user_combat_stats(conn, user_id):
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT result, method, is_official, opponent, date
            FROM user_fights
            WHERE user_id = ?
            """,
            (int(user_id),),
        )
        rows = cursor.fetchall()
    except Exception:
        rows = []

    xp = 0
    wins = 0
    losses = 0
    finish_wins = 0
    official_wins = 0
    verified_fights = 0
    last_30_activity = 0
    latest_activity_date = None
    opponent_counts = {}

    now = datetime.utcnow().date()

    for result, method, is_official, opponent, fight_date in rows:
        normalized_result = (result or "").strip().lower()
        normalized_method = (method or "").strip().lower()
        is_official_bool = bool(is_official)

        if normalized_result == "vitoria":
            xp += 80
            wins += 1
            if normalized_method in {"finalizacao", "ko/tko"}:
                xp += 20
                finish_wins += 1
            if is_official_bool:
                official_wins += 1
        elif normalized_result:
            xp += 25
            losses += 1

        if is_official_bool:
            xp += 40
            verified_fights += 1

        opponent_name = (opponent or "").strip().lower()
        if opponent_name:
            opponent_counts[opponent_name] = opponent_counts.get(opponent_name, 0) + 1

        parsed_date = parse_date_yyyy_mm_dd(fight_date)

        if parsed_date:
            if latest_activity_date is None or parsed_date > latest_activity_date:
                latest_activity_date = parsed_date
            if (now - parsed_date).days <= 30:
                last_30_activity += 1

    try:
        cursor.execute(
            """
            SELECT session_type, duration_seconds, distance_km, rounds_completed, abandoned, xp_awarded, ended_at
            FROM user_training_sessions
            WHERE user_id = ? AND status = 'Validado'
            """,
            (int(user_id),),
        )
        training_rows = cursor.fetchall()
    except Exception:
        training_rows = []

    for training_row in training_rows:
        session_type, duration_seconds, distance_km, rounds_completed, abandoned, xp_awarded, ended_at = training_row
        awarded = int(xp_awarded or 0)
        if awarded <= 0:
            awarded = estimate_training_xp(session_type, duration_seconds, distance_km, rounds_completed, bool(abandoned))
        xp += awarded

        parsed_date = parse_date_yyyy_mm_dd(ended_at)
        if parsed_date:
            if latest_activity_date is None or parsed_date > latest_activity_date:
                latest_activity_date = parsed_date
            if (now - parsed_date).days <= 30:
                last_30_activity += 1

    total_fights = len(rows)
    repeated_opponent_rate = 0
    if total_fights > 0 and opponent_counts:
        repeated_opponent_rate = max(opponent_counts.values()) / total_fights

    # Level curve: lvl 2 requires 100 XP, lvl 3 requires +125 XP, then +25 XP each level.
    remaining_xp = max(0, int(xp))
    level = 1
    xp_required_for_next_level = 100
    while remaining_xp >= xp_required_for_next_level:
        remaining_xp -= xp_required_for_next_level
        level += 1
        xp_required_for_next_level += 25
    last_fight_days_ago = 999
    if latest_activity_date:
        last_fight_days_ago = max(0, (now - latest_activity_date).days)

    return {
        "xp": xp,
        "level": level,
        "wins": wins,
        "losses": losses,
        "finish_wins": finish_wins,
        "official_wins": official_wins,
        "verified_fights": verified_fights,
        "repeated_opponent_rate": round(repeated_opponent_rate, 4),
        "last_30_activity": last_30_activity,
        "last_fight_days_ago": last_fight_days_ago,
    }


init_db()
sync_legacy_users_to_primary()


@app.route("/api/health", methods=["GET"])
def healthcheck():
    return jsonify(
        {
            "ok": True,
            "service": "selestialhub-backend",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    )


@app.route("/api/register", methods=["POST"])
@rate_limit("register", max_requests=20, window_seconds=60)
def register():
    data = request.get_json(silent=True) or {}
    nome = (data.get("nome") or "").strip()
    email = (data.get("email") or "").strip().lower()
    senha_raw = data.get("senha")

    if not nome or not email or not senha_raw:
        return jsonify({"error": "nome, email e senha obrigatorios"}), 400

    db_paths = [PRIMARY_DB_PATH]
    if os.path.exists(LEGACY_DB_PATH) and os.path.normcase(LEGACY_DB_PATH) != os.path.normcase(PRIMARY_DB_PATH):
        db_paths.append(LEGACY_DB_PATH)

    saw_locked_db = False

    for db_path in db_paths:
        conn = None
        try:
            conn = get_db_connection(db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)",
                (nome, email, generate_password_hash(senha_raw)),
            )
            conn.commit()
            return jsonify({"success": True, "message": "Usuario cadastrado"}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": "E-mail ja cadastrado"}), 400
        except sqlite3.OperationalError as exc:
            if "locked" in str(exc).lower():
                saw_locked_db = True
                continue
            return jsonify({"error": "Falha ao cadastrar usuario"}), 500
        except Exception:
            return jsonify({"error": "Falha ao cadastrar usuario"}), 500
        finally:
            if conn is not None:
                conn.close()

    if saw_locked_db:
        return jsonify({"error": "Banco temporariamente ocupado, tente novamente em instantes"}), 503

    return jsonify({"error": "Falha ao cadastrar usuario"}), 500


@app.route("/api/login", methods=["POST"])
@rate_limit("login", max_requests=30, window_seconds=60)
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = data.get("senha", "")
    source, db_path, user = find_user_for_login(email)

    if user and check_password_hash(user[3], password):
        resolved_user = None
        if os.path.normcase(db_path or "") != os.path.normcase(PRIMARY_DB_PATH):
            resolved_user = sync_authenticated_user_to_primary(user)

        if resolved_user:
            user_id = resolved_user[0]
            nome = resolved_user[1]
            is_pro = bool(resolved_user[2])
            is_academy_pro = bool(resolved_user[3])
            try:
                is_coach = int(resolved_user[4] or 0) == 1
            except Exception:
                is_coach = False
            bio = resolved_user[5] or ""
        else:
            user_id = user[0]
            nome = user[1]
            is_pro = bool(user[4])
            is_academy_pro = bool(user[5])
            try:
                is_coach = int(user[6] or 0) == 1
            except Exception:
                is_coach = False
            bio = user[7] or ""

        admin_conn = None
        try:
            admin_conn = get_db_connection()
            is_admin = bool(is_admin_requester(admin_conn, user_id))
        except Exception:
            is_admin = False
        finally:
            if admin_conn is not None:
                try:
                    admin_conn.close()
                except Exception:
                    pass

        return jsonify(
            {
                "success": True,
                "user": {
                    "id": user_id,
                    "nome": nome,
                    "is_pro": is_pro,
                    "is_academy_pro": is_academy_pro,
                    "is_coach": is_coach,
                    "is_admin": is_admin,
                    "bio": bio,
                    "source": source,
                },
            }
        )
    return jsonify({"error": "Credenciais invalidas"}), 401


@app.route("/api/ranking/users", methods=["GET"])
def ranking_users():
    users, _, _ = collect_users_from_sources()
    return jsonify({"users": users, "count": len(users)})


@app.route("/api/ranking/audit", methods=["GET"])
def ranking_audit():
    users, source_counts, duplicates = collect_users_from_sources()
    return jsonify(
        {
            "users_total": len(users),
            "source_counts": source_counts,
            "duplicates_filtered": duplicates,
            "db_primary": PRIMARY_DB_PATH,
            "db_legacy": LEGACY_DB_PATH if os.path.exists(LEGACY_DB_PATH) else None,
        }
    )


@app.route("/api/academies", methods=["GET"])
def get_academies():
    lat = request.args.get("lat", default=None, type=float)
    lng = request.args.get("lng", default=None, type=float)
    radius = request.args.get("radius", default=None, type=float)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, nome, endereco, cidade, modalidade, contato, created_by_user_id, lat, lng, is_sponsored FROM academies")
    rows = cursor.fetchall()
    conn.close()

    academies = []
    for r in rows:
        academy = {
            "id": r[0],
            "nome": r[1],
            "endereco": r[2],
            "cidade": r[3],
            "modalidade": r[4],
            "contato": r[5] or "",
            "created_by_user_id": r[6],
            "lat": r[7],
            "lng": r[8],
            "is_sponsored": bool(r[9]),
        }
        if lat is not None and lng is not None and radius is not None:
            academy["distance_km"] = haversine(lat, lng, academy["lat"], academy["lng"])
            if academy["distance_km"] > radius:
                continue
        academies.append(academy)

    if lat is not None and lng is not None:
        academies.sort(key=lambda x: x.get("distance_km", float("inf")))

    return jsonify({"academies": academies})


@app.route("/api/academies", methods=["POST"])
@rate_limit("create_academy", max_requests=30, window_seconds=60)
def create_academy():
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "usuario nao autenticado"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_academy_pro FROM users WHERE id = ?", (user_id,))
    owner = cursor.fetchone()
    if not owner:
        conn.close()
        return jsonify({"error": "usuario nao encontrado"}), 404
    if not bool(owner[0]):
        conn.close()
        return jsonify({"error": "cadastro liberado apenas para plano academia premium"}), 403

    cursor.execute("SELECT id FROM academies WHERE created_by_user_id = ? LIMIT 1", (user_id,))
    existing_academy = cursor.fetchone()
    if existing_academy:
        conn.close()
        return jsonify({"error": "limite atingido: cada usuario pode cadastrar apenas 1 academia"}), 409

    nome = (data.get("nome") or "").strip()
    endereco = (data.get("endereco") or "").strip()
    cidade = (data.get("cidade") or "").strip()
    modalidade = (data.get("modalidade") or "").strip()
    contato = (data.get("contato") or "").strip()
    lat_raw = data.get("lat", None)
    lng_raw = data.get("lng", None)
    is_sponsored = bool(data.get("is_sponsored", False))

    try:
        lat = float(lat_raw)
        lng = float(lng_raw)
    except (TypeError, ValueError):
        conn.close()
        return jsonify({"error": "localizacao invalida. informe latitude e longitude numericas"}), 400

    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        conn.close()
        return jsonify({"error": "localizacao fora do intervalo permitido"}), 400

    if not nome:
        nome = f"Academia ({lat:.4f}, {lng:.4f})"
    if not endereco:
        endereco = f"Localizacao aproximada ({lat:.4f}, {lng:.4f})"

    if not nome or not endereco:
        conn.close()
        return jsonify({"error": "nome e endereco obrigatorios"}), 400

    cursor.execute(
        "INSERT INTO academies (nome, endereco, cidade, modalidade, contato, created_by_user_id, lat, lng, is_sponsored) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (nome, endereco, cidade, modalidade, contato, user_id, lat, lng, int(is_sponsored)),
    )
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()

    return jsonify({"success": True, "id": inserted_id}), 201


@app.route("/api/academies/<int:academy_id>", methods=["DELETE"])
@rate_limit("delete_academy", max_requests=60, window_seconds=60)
def delete_academy(academy_id):
    data = request.json or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "usuario nao autenticado"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT created_by_user_id FROM academies WHERE id = ?", (academy_id,))
    academy = cursor.fetchone()

    if not academy:
        conn.close()
        return jsonify({"error": "academia nao encontrada"}), 404

    owner_id = academy[0]
    if owner_id is None or int(owner_id) != int(user_id):
        conn.close()
        return jsonify({"error": "apenas quem criou a academia pode exclui-la"}), 403

    cursor.execute("DELETE FROM academies WHERE id = ?", (academy_id,))
    conn.commit()
    conn.close()

    return jsonify({"success": True})


@app.route("/api/plans/academy/subscribe", methods=["POST"])
def subscribe_academy_plan():
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    updated, err = apply_plan_to_user(user_id, "academy_premium")
    if err:
        return jsonify({"error": err[0]}), err[1]

    return jsonify(
        {
            "success": True,
            "message": "Plano academia premium ativado",
            "plan": {"code": "academy_premium", "name": "Academia Premium", "price_monthly": PLAN_PRICES["academy_premium"]},
            "user": updated,
        }
    )


@app.route("/api/plans/athlete/subscribe", methods=["POST"])
def subscribe_athlete_plan():
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    updated, err = apply_plan_to_user(user_id, "athlete_pro")
    if err:
        return jsonify({"error": err[0]}), err[1]

    return jsonify(
        {
            "success": True,
            "message": "Plano atleta PRO ativado",
            "plan": {"code": "athlete_pro", "name": "Atleta PRO", "price_monthly": PLAN_PRICES["athlete_pro"]},
            "user": updated,
        }
    )


@app.route("/api/payments/checkout", methods=["POST"])
def create_checkout():
    data = request.json or {}
    user_id = data.get("user_id")
    plan_code = data.get("plan_code")

    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400
    if plan_code not in PLAN_PRICES:
        return jsonify({"error": "plan_code invalido"}), 400

    frontend_base = os.getenv("FRONTEND_BASE_URL", "https://selestialhub.com").rstrip("/")
    backend_base = os.getenv("BACKEND_BASE_URL", "https://selestialhub.com").rstrip("/")

    access_token = get_mercado_pago_access_token()
    if not access_token:
        if not simulated_checkout_enabled():
            return jsonify({"error": "checkout indisponivel: configure MERCADO_PAGO_ACCESS_TOKEN no backend"}), 503

        simulated_url = f"{frontend_base}/pagamento/sucesso?simulated=1&user_id={user_id}&plan={plan_code}"
        return jsonify(
            {
                "success": True,
                "checkout_url": simulated_url,
                "simulated": True,
                "message": "MERCADO_PAGO_ACCESS_TOKEN nao configurado. Checkout simulado.",
            }
        )

    preference_payload = {
        "items": [
            {
                "title": PLAN_TITLES[plan_code],
                "quantity": 1,
                "currency_id": "BRL",
                "unit_price": PLAN_PRICES[plan_code],
            }
        ],
        "external_reference": f"{user_id}:{plan_code}",
        "back_urls": {
            "success": f"{frontend_base}/pagamento/sucesso?user_id={user_id}&plan={plan_code}",
            "failure": f"{frontend_base}/pagamento/falha?user_id={user_id}&plan={plan_code}",
            "pending": f"{frontend_base}/pagamento/pendente?user_id={user_id}&plan={plan_code}",
        },
        "auto_return": "approved",
        "notification_url": f"{backend_base}/api/payments/webhook",
    }

    try:
        res = requests.post(
            "https://api.mercadopago.com/checkout/preferences",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json=preference_payload,
            timeout=15,
        )
        mp_data = res.json()
        if res.status_code >= 400:
            return jsonify({"error": "erro ao criar checkout no Mercado Pago", "details": mp_data}), 502

        checkout_url = mp_data.get("init_point") or mp_data.get("sandbox_init_point")
        return jsonify({"success": True, "checkout_url": checkout_url, "simulated": False})
    except Exception as exc:
        return jsonify({"error": "falha ao conectar no provedor de pagamento", "details": str(exc)}), 502


@app.route("/api/payments/confirm", methods=["POST"])
def confirm_payment():
    data = request.json or {}
    payment_id = str(data.get("payment_id") or "").strip()

    # Simulated confirmation is optional and only allowed when explicitly enabled.
    if data.get("simulated") is True:
        if not simulated_checkout_enabled():
            return jsonify({"error": "confirmacao simulada desabilitada"}), 403

        user_id = data.get("user_id")
        plan_code = data.get("plan_code")
        if not user_id or not plan_code:
            return jsonify({"error": "user_id e plan_code sao obrigatorios na simulacao"}), 400

        updated, err = apply_plan_to_user(user_id, plan_code)
        if err:
            return jsonify({"error": err[0]}), err[1]

        return jsonify({"success": True, "simulated": True, "message": "Pagamento simulado confirmado", "user": updated})

    if not payment_id:
        return jsonify({"error": "payment_id obrigatorio"}), 400

    access_token = get_mercado_pago_access_token()
    if not access_token:
        return jsonify({"error": "backend sem MERCADO_PAGO_ACCESS_TOKEN para validar pagamento"}), 503

    payment_payload, fetch_err = fetch_mercado_pago_payment(payment_id, access_token)
    if fetch_err:
        return jsonify({"error": fetch_err[0], "details": fetch_err[2]}), fetch_err[1]

    processed, process_err = process_approved_payment(payment_payload)
    if process_err:
        return jsonify({"error": process_err[0], "status": payment_payload.get("status")}), process_err[1]

    return jsonify(
        {
            "success": True,
            "message": "Pagamento confirmado e plano ativado",
            "user": processed["user"],
            "payment": {
                "id": processed["payment_id"],
                "status": processed["status"],
                "plan_code": processed["plan_code"],
            },
        }
    )


@app.route("/api/payments/webhook", methods=["POST"])
def payment_webhook():
    payload = request.json or {}
    payment_id = (
        request.args.get("data.id")
        or request.args.get("id")
        or (payload.get("data") or {}).get("id")
        or payload.get("id")
    )

    access_token = get_mercado_pago_access_token()
    if not access_token:
        return jsonify({"received": True, "processed": False, "message": "token nao configurado"}), 200

    if not payment_id:
        return jsonify({"received": True, "processed": False, "message": "evento sem payment_id"}), 200

    payment_payload, fetch_err = fetch_mercado_pago_payment(payment_id, access_token)
    if fetch_err:
        return jsonify({"received": True, "processed": False, "error": fetch_err[0]}), 200

    save_payment_transaction(payment_payload, None, None)
    if str(payment_payload.get("status") or "").lower() != "approved":
        return jsonify({"received": True, "processed": False, "status": payment_payload.get("status")}), 200

    processed, process_err = process_approved_payment(payment_payload)
    if process_err:
        return jsonify({"received": True, "processed": False, "error": process_err[0]}), 200

    return jsonify({"received": True, "processed": True, "user_id": processed["user_id"], "plan_code": processed["plan_code"]}), 200


@app.route("/api/payments/config", methods=["GET"])
def payment_config_status():
    frontend_base = os.getenv("FRONTEND_BASE_URL", "").strip()
    backend_base = os.getenv("BACKEND_BASE_URL", "").strip()
    token = get_mercado_pago_access_token()

    return jsonify(
        {
            "provider": "mercado_pago",
            "configured": bool(token),
            "simulated_checkout_enabled": simulated_checkout_enabled(),
            "frontend_base_url": frontend_base,
            "backend_base_url": backend_base,
            "webhook_url": f"{backend_base.rstrip('/')}/api/payments/webhook" if backend_base else "",
        }
    )


@app.route("/api/plans/catalog", methods=["GET"])
def plans_catalog():
    return jsonify(
        {
            "plans": [
                {
                    "code": "free",
                    "name": "Free",
                    "audience": "athlete",
                    "price_monthly": 0,
                    "features": ["3 desafios por dia", "Ranking basico", "Anuncios ativos"],
                },
                {
                    "code": "athlete_pro",
                    "name": "Atleta PRO",
                    "audience": "athlete",
                    "price_monthly": PLAN_PRICES["athlete_pro"],
                    "features": ["Desafios ilimitados", "Sem anuncios", "Destaque no ranking"],
                },
                {
                    "code": "academy_premium",
                    "name": "Academia Premium",
                    "audience": "academy",
                    "price_monthly": PLAN_PRICES["academy_premium"],
                    "features": ["Cadastro de academias", "Selo premium", "Prioridade na busca"],
                },
            ]
        }
    )


@app.route("/api/academies/batch", methods=["POST"])
def create_academies_batch():
    payload = request.json or {}
    academies = payload.get("academies", [])
    if not isinstance(academies, list):
        return jsonify({"error": "academies deve ser uma lista"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    inserted = 0
    for academy in academies:
        cursor.execute(
            "INSERT INTO academies (nome, endereco, cidade, modalidade, lat, lng, is_sponsored) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                academy.get("name", ""),
                academy.get("endereco", ""),
                academy.get("city", ""),
                academy.get("modalidade", ""),
                academy.get("lat", 0),
                academy.get("lng", 0),
                int(bool(academy.get("isSponsored", False))),
            ),
        )
        inserted += 1
    conn.commit()
    conn.close()

    return jsonify({"success": True, "inserted": inserted}), 201


@app.route("/api/chat", methods=["GET"])
def get_chat_messages():
    user_id = request.args.get("user_id", type=int)
    peer_id = request.args.get("peer_id", type=int)

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id and peer_id:
        cursor.execute(
            """
            SELECT id, user_id, recipient_id, user_name, message, created_at
            FROM messages
            WHERE (user_id = ? AND recipient_id = ?)
               OR (user_id = ? AND recipient_id = ?)
            ORDER BY id ASC
            """,
            (user_id, peer_id, peer_id, user_id),
        )
    elif user_id:
        cursor.execute(
            """
            SELECT id, user_id, recipient_id, user_name, message, created_at
            FROM messages
            WHERE recipient_id IS NULL OR user_id = ? OR recipient_id = ?
            ORDER BY id ASC
            """,
            (user_id, user_id),
        )
    else:
        cursor.execute(
            """
            SELECT id, user_id, recipient_id, user_name, message, created_at
            FROM messages
            WHERE recipient_id IS NULL
            ORDER BY id ASC
            """
        )

    rows = cursor.fetchall()
    conn.close()

    messages = [
        {
            "id": row[0],
            "user_id": row[1],
            "recipient_id": row[2],
            "user_name": row[3],
            "message": row[4],
            "created_at": row[5],
        }
        for row in rows
    ]
    return jsonify({"messages": messages})


@app.route("/api/chat/users", methods=["GET"])
def get_chat_users():
    exclude_id = request.args.get("exclude_id", type=int)

    conn = get_db_connection()
    cursor = conn.cursor()
    if exclude_id is not None:
        cursor.execute("SELECT id, nome, avatar_url FROM users WHERE id != ? ORDER BY nome COLLATE NOCASE ASC", (exclude_id,))
    else:
        cursor.execute("SELECT id, nome, avatar_url FROM users ORDER BY nome COLLATE NOCASE ASC")

    rows = cursor.fetchall()

    users = []
    for row in rows:
        profile_id = row[0]
        if exclude_id is not None:
            i_follow = is_following(conn, exclude_id, profile_id)
            follows_me = is_following(conn, profile_id, exclude_id)
            can_message = i_follow and follows_me
            if not can_message:
                continue
        else:
            i_follow = False
            follows_me = False
            can_message = False

        users.append(
            {
                "id": profile_id,
                "nome": row[1] or "Atleta",
                "avatarUrl": row[2] or "",
                "i_follow": i_follow,
                "follows_me": follows_me,
                "can_message": can_message,
            }
        )

    conn.close()
    return jsonify({"users": users})


@app.route("/api/chat", methods=["POST"])
@rate_limit("chat_post", max_requests=120, window_seconds=60)
def send_chat_message():
    data = request.json or {}
    user_id = data.get("user_id")
    recipient_id = data.get("recipient_id")
    user_name = (data.get("user_name") or "Atleta").strip()
    message = (data.get("message") or "").strip()

    if not message:
        return jsonify({"error": "Mensagem vazia"}), 400

    if recipient_id is not None:
        if not user_id:
            return jsonify({"error": "usuario nao autenticado"}), 401

        auth_conn = get_db_connection()
        if not is_mutual_follow(auth_conn, user_id, recipient_id):
            auth_conn.close()
            return jsonify({"error": "mensagens diretas exigem follow mutuo"}), 403
        auth_conn.close()

    created_at = datetime.utcnow().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (user_id, recipient_id, user_name, message, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, recipient_id, user_name, message, created_at),
    )
    conn.commit()
    inserted_id = cursor.lastrowid

    if recipient_id is not None and recipient_id != user_id:
        create_notification(
            conn,
            recipient_id,
            "chat",
            "Nova mensagem",
            f"{user_name} enviou uma mensagem para voce.",
            actor_id=user_id,
        )
        conn.commit()

    conn.close()

    return jsonify(
        {
            "id": inserted_id,
            "user_id": user_id,
            "recipient_id": recipient_id,
            "user_name": user_name,
            "message": message,
            "created_at": created_at,
        }
    ), 201


@app.route("/api/admin/stats", methods=["GET"])
def get_stats():
    requester_user_id = request.args.get("requester_user_id", type=int)
    conn = get_db_connection()
    if not is_admin_requester(conn, requester_user_id):
        conn.close()
        return jsonify({"error": "acesso negado: administrador nao autorizado"}), 403

    cursor = conn.cursor()
    total = cursor.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    pros = cursor.execute("SELECT COUNT(*) FROM users WHERE is_pro = 1").fetchone()[0]
    academy_pros = cursor.execute("SELECT COUNT(*) FROM users WHERE is_academy_pro = 1").fetchone()[0]
    conn.close()

    return jsonify(
        {
            "total_atletas": total,
            "atletas_pro": pros,
            "academias_pro": academy_pros,
            "faturamento_estimado": (pros * PLAN_PRICES["athlete_pro"]) + (academy_pros * PLAN_PRICES["academy_premium"]),
        }
    )


@app.route("/api/admin/users", methods=["GET"])
def get_admin_users():
    requester_user_id = request.args.get("requester_user_id", type=int)
    conn = get_db_connection()
    if not is_admin_requester(conn, requester_user_id):
        conn.close()
        return jsonify({"error": "acesso negado: administrador nao autorizado"}), 403

    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, nome, email, is_pro, is_academy_pro, is_coach
        FROM users
        ORDER BY id DESC
        LIMIT 500
        """
    )
    rows = cursor.fetchall()
    conn.close()

    users = [
        {
            "id": int(row[0]),
            "nome": row[1] or "Atleta",
            "email": row[2] or "",
            "is_pro": bool(row[3]),
            "is_academy_pro": bool(row[4]),
            "is_coach": bool(int(row[5] or 0)),
        }
        for row in rows
    ]
    return jsonify({"users": users})


@app.route("/api/admin/users/<int:target_user_id>/coach", methods=["POST"])
@rate_limit("admin_users_coach_post", max_requests=120, window_seconds=60)
def set_user_coach_authorization(target_user_id):
    data = request.json or {}
    requester_user_id = data.get("requester_user_id")
    is_coach = bool(data.get("is_coach", False))

    if not requester_user_id:
        return jsonify({"error": "requester_user_id obrigatorio"}), 400

    conn = get_db_connection()
    if not is_admin_requester(conn, int(requester_user_id)):
        conn.close()
        return jsonify({"error": "acesso negado: administrador nao autorizado"}), 403

    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE id = ?", (target_user_id,))
    target = cursor.fetchone()
    if not target:
        conn.close()
        return jsonify({"error": "usuario alvo nao encontrado"}), 404

    cursor.execute("UPDATE users SET is_coach = ? WHERE id = ?", (1 if is_coach else 0, target_user_id))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "target_user_id": target_user_id, "is_coach": is_coach})


@app.route("/api/user/settings", methods=["GET"])
def get_user_settings():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, nome, email, cidade, bio FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        return jsonify({"error": "usuario nao encontrado"}), 404

    cursor.execute(
        """
        SELECT theme, profile_public, show_weight, allow_challenges, allow_messages,
               notify_events, notify_ranking, notify_chat, notify_marketing
        FROM user_settings WHERE user_id = ?
        """,
        (user_id,),
    )
    settings_row = cursor.fetchone()
    conn.close()

    defaults = {
        "theme": "dark",
        "profilePublic": True,
        "showWeight": False,
        "allowChallenges": True,
        "allowMessages": True,
        "notifyEvents": True,
        "notifyRanking": True,
        "notifyChat": True,
        "notifyMarketing": False,
    }

    if settings_row:
        defaults.update(
            {
                "theme": settings_row[0] or "dark",
                "profilePublic": bool(settings_row[1]),
                "showWeight": bool(settings_row[2]),
                "allowChallenges": bool(settings_row[3]),
                "allowMessages": bool(settings_row[4]),
                "notifyEvents": bool(settings_row[5]),
                "notifyRanking": bool(settings_row[6]),
                "notifyChat": bool(settings_row[7]),
                "notifyMarketing": bool(settings_row[8]),
            }
        )

    return jsonify(
        {
            "fullName": user_row[1] or "",
            "email": user_row[2] or "",
            "city": user_row[3] or "",
            "bio": user_row[4] or "",
            **defaults,
        }
    )


@app.route("/api/user/settings", methods=["PUT"])
def update_user_settings():
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip()
    city = (data.get("city") or "").strip()
    bio = (data.get("bio") or "").strip()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET nome = ?, email = ?, cidade = ?, bio = ? WHERE id = ?", (full_name, email, city, bio, user_id))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"error": "usuario nao encontrado"}), 404

    cursor.execute(
        """
        INSERT INTO user_settings
        (user_id, theme, profile_public, show_weight, allow_challenges, allow_messages,
         notify_events, notify_ranking, notify_chat, notify_marketing, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
            theme = excluded.theme,
            profile_public = excluded.profile_public,
            show_weight = excluded.show_weight,
            allow_challenges = excluded.allow_challenges,
            allow_messages = excluded.allow_messages,
            notify_events = excluded.notify_events,
            notify_ranking = excluded.notify_ranking,
            notify_chat = excluded.notify_chat,
            notify_marketing = excluded.notify_marketing,
            updated_at = datetime('now')
        """,
        (
            user_id,
            data.get("theme") or "dark",
            int(bool(data.get("profilePublic", True))),
            int(bool(data.get("showWeight", False))),
            int(bool(data.get("allowChallenges", True))),
            int(bool(data.get("allowMessages", True))),
            int(bool(data.get("notifyEvents", True))),
            int(bool(data.get("notifyRanking", True))),
            int(bool(data.get("notifyChat", True))),
            int(bool(data.get("notifyMarketing", False))),
        ),
    )

    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/user/profile", methods=["PUT"])
def update_profile():
    data = request.json or {}
    user_id = data.get("user_id")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE users
        SET nome = ?, academia = ?, cidade = ?, modalidade = ?, estilo = ?, bio = ?
        WHERE id = ?
        """,
        (
            data.get("nome"),
            data.get("academia"),
            data.get("cidade"),
            data.get("modalidade"),
            data.get("estilo"),
            data.get("bio"),
            user_id,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Perfil atualizado"})


@app.route("/api/user/avatar", methods=["GET"])
def get_user_avatar():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT avatar_url FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "usuario nao encontrado"}), 404

    return jsonify({"avatarUrl": row[0] or ""})


@app.route("/api/user/avatar", methods=["PUT"])
@rate_limit("user_avatar_put", max_requests=20, window_seconds=60)
def update_user_avatar():
    data = request.json or {}
    user_id = data.get("user_id")
    avatar_url = (data.get("avatarUrl") or "").strip()

    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    if avatar_url and len(avatar_url) > 5_000_000:
        return jsonify({"error": "imagem muito grande"}), 413

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, int(user_id)))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"error": "usuario nao encontrado"}), 404

    conn.commit()
    conn.close()
    return jsonify({"success": True, "avatarUrl": avatar_url})


@app.route("/api/users/<int:profile_id>/public", methods=["GET"])
def get_public_profile(profile_id):
    viewer_id = request.args.get("viewer_id", type=int)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, nome, cidade, bio, academia, modalidade, faixa, estilo, avatar_url
        FROM users
        WHERE id = ?
        """,
        (profile_id,),
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "usuario nao encontrado"}), 404

    cursor.execute("SELECT COUNT(*) FROM user_follows WHERE following_id = ?", (profile_id,))
    followers_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM user_follows WHERE follower_id = ?", (profile_id,))
    following_count = cursor.fetchone()[0]
    current_xp, level = compute_user_progress(conn, profile_id)

    i_follow = False
    follows_me = False
    can_message = False
    if viewer_id and viewer_id != profile_id:
        i_follow = is_following(conn, viewer_id, profile_id)
        follows_me = is_following(conn, profile_id, viewer_id)
        can_message = i_follow and follows_me

    conn.close()

    return jsonify(
        {
            "profile": {
                "id": row[0],
                "nome": row[1] or "Atleta",
                "cidade": row[2] or "",
                "bio": row[3] or "",
                "academia": row[4] or "Sem academia",
                "modalidade": row[5] or "",
                "faixa": row[6] or "",
                "estilo": row[7] or "",
                "avatarUrl": row[8] or "",
                "followers": followers_count,
                "following": following_count,
                "currentXP": current_xp,
                "level": level,
                "i_follow": i_follow,
                "follows_me": follows_me,
                "can_message": can_message,
            }
        }
    )


@app.route("/api/follows", methods=["GET"])
def get_follow_summary():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM user_follows WHERE following_id = ?", (user_id,))
    followers_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM user_follows WHERE follower_id = ?", (user_id,))
    following_count = cursor.fetchone()[0]

    cursor.execute(
        """
        SELECT u.id, u.nome
        FROM user_follows f
        JOIN users u ON u.id = f.follower_id
        WHERE f.following_id = ?
        ORDER BY f.id DESC
        LIMIT 50
        """,
        (user_id,),
    )
    followers = [{"id": row[0], "nome": row[1] or "Atleta"} for row in cursor.fetchall()]

    cursor.execute(
        """
        SELECT u.id, u.nome
        FROM user_follows f
        JOIN users u ON u.id = f.following_id
        WHERE f.follower_id = ?
        ORDER BY f.id DESC
        LIMIT 50
        """,
        (user_id,),
    )
    following = [{"id": row[0], "nome": row[1] or "Atleta"} for row in cursor.fetchall()]

    conn.close()
    return jsonify(
        {
            "user_id": user_id,
            "followers_count": followers_count,
            "following_count": following_count,
            "followers": followers,
            "following": following,
        }
    )


@app.route("/api/follows/status", methods=["GET"])
def get_follow_status():
    user_id = request.args.get("user_id", type=int)
    target_id = request.args.get("target_id", type=int)
    if not user_id or not target_id:
        return jsonify({"error": "user_id e target_id obrigatorios"}), 400

    conn = get_db_connection()
    i_follow = is_following(conn, user_id, target_id)
    follows_me = is_following(conn, target_id, user_id)
    can_message = i_follow and follows_me
    conn.close()

    return jsonify(
        {
            "user_id": user_id,
            "target_id": target_id,
            "i_follow": i_follow,
            "follows_me": follows_me,
            "can_message": can_message,
        }
    )


@app.route("/api/follows/toggle", methods=["POST"])
@rate_limit("toggle_follow", max_requests=80, window_seconds=60)
def toggle_follow():
    data = request.json or {}
    user_id = data.get("user_id")
    target_id = data.get("target_id")

    if not user_id or not target_id:
        return jsonify({"error": "user_id e target_id obrigatorios"}), 400

    user_id = int(user_id)
    target_id = int(target_id)

    if user_id == target_id:
        return jsonify({"error": "nao pode seguir a si mesmo"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT nome FROM users WHERE id = ?", (user_id,))
    me = cursor.fetchone()
    cursor.execute("SELECT nome FROM users WHERE id = ?", (target_id,))
    target = cursor.fetchone()
    if not me or not target:
        conn.close()
        return jsonify({"error": "usuario nao encontrado"}), 404

    cursor.execute(
        "SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?",
        (user_id, target_id),
    )
    current = cursor.fetchone()

    if current:
        cursor.execute(
            "DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?",
            (user_id, target_id),
        )
        is_following_now = False
    else:
        cursor.execute(
            "INSERT INTO user_follows (follower_id, following_id, created_at) VALUES (?, ?, ?)",
            (user_id, target_id, datetime.utcnow().isoformat()),
        )
        is_following_now = True

        create_notification(
            conn,
            target_id,
            "follow",
            "Novo seguidor",
            f"{me[0] or 'Atleta'} comecou a seguir voce.",
            actor_id=user_id,
        )

        if is_following(conn, target_id, user_id):
            create_notification(
                conn,
                user_id,
                "mutual_follow",
                "Follow mutuo",
                f"Voce e {target[0] or 'Atleta'} agora podem conversar no chat.",
                actor_id=target_id,
            )
            create_notification(
                conn,
                target_id,
                "mutual_follow",
                "Follow mutuo",
                f"Voce e {me[0] or 'Atleta'} agora podem conversar no chat.",
                actor_id=user_id,
            )

    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM user_follows WHERE following_id = ?", (target_id,))
    followers_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM user_follows WHERE follower_id = ?", (target_id,))
    following_count = cursor.fetchone()[0]
    follows_me = is_following(conn, target_id, user_id)
    can_message = is_following_now and follows_me
    conn.close()

    return jsonify(
        {
            "success": True,
            "is_following": is_following_now,
            "follows_me": follows_me,
            "can_message": can_message,
            "target_followers": followers_count,
            "target_following": following_count,
        }
    )


@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT n.id, n.type, n.title, n.message, n.created_at, n.is_read, n.actor_id,
               COALESCE(u.nome, 'Atleta')
        FROM user_notifications n
        LEFT JOIN users u ON u.id = n.actor_id
        WHERE n.user_id = ?
        ORDER BY n.id DESC
        LIMIT 100
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    unread = sum(0 if row[5] else 1 for row in rows)
    conn.close()

    notifications = [
        {
            "id": row[0],
            "type": row[1],
            "title": row[2],
            "message": row[3],
            "createdAt": row[4],
            "isRead": bool(row[5]),
            "actorId": row[6],
            "actorName": row[7] or "Atleta",
        }
        for row in rows
    ]

    return jsonify({"notifications": notifications, "unread": unread})


@app.route("/api/notifications/read", methods=["POST"])
@rate_limit("notifications_read", max_requests=60, window_seconds=60)
def mark_notifications_read():
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE user_notifications SET is_read = 1 WHERE user_id = ?", (int(user_id),))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/user/training-sessions", methods=["GET"])
def get_user_training_sessions():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, modality, session_type, status, duration_seconds, distance_km, rounds_completed,
               notes, evidence_url, abandoned, xp_estimated, xp_awarded, review_notes, started_at, ended_at
        FROM user_training_sessions
        WHERE user_id = ?
        ORDER BY COALESCE(ended_at, created_at) DESC, id DESC
        LIMIT 60
        """,
        (int(user_id),),
    )
    rows = cursor.fetchall()
    conn.close()

    sessions = []
    for row in rows:
        sessions.append(
            {
                "id": int(row[0]),
                "title": row[1] or "Treino",
                "modality": row[2] or "",
                "sessionType": row[3] or "tecnico",
                "status": row[4] or "Pendente",
                "durationSeconds": int(row[5] or 0),
                "distanceKm": float(row[6] or 0.0),
                "roundsCompleted": int(row[7] or 0),
                "notes": row[8] or "",
                "evidenceUrl": row[9] or "",
                "abandoned": bool(row[10]),
                "xpEstimated": int(row[11] or 0),
                "xpAwarded": int(row[12] or 0),
                "reviewNotes": row[13] or "",
                "startedAt": row[14],
                "endedAt": row[15],
            }
        )

    today = datetime.utcnow().date()
    sessions_by_day = set()
    cardio_km_30 = 0.0
    validated_xp_30 = 0
    weekly_sessions = 0

    for s in sessions:
        activity_date = parse_date_yyyy_mm_dd(s.get("endedAt") or s.get("startedAt"))
        if not activity_date:
            continue
        days_ago = (today - activity_date).days
        if days_ago < 0:
            continue
        if days_ago <= 6:
            weekly_sessions += 1
        if days_ago <= 30:
            if s.get("status") == "Validado":
                validated_xp_30 += int(s.get("xpAwarded") or 0)
            if s.get("sessionType") in {"corrida", "caminhada", "cardio"}:
                cardio_km_30 += float(s.get("distanceKm") or 0.0)
        sessions_by_day.add(activity_date.isoformat())

    streak_days = 0
    cursor_date = today
    while cursor_date.isoformat() in sessions_by_day:
        streak_days += 1
        cursor_date = cursor_date.fromordinal(cursor_date.toordinal() - 1)

    return jsonify(
        {
            "sessions": sessions,
            "summary": {
                "weeklySessions": weekly_sessions,
                "validatedXP30": validated_xp_30,
                "cardioKm30": round(cardio_km_30, 2),
                "streakDays": streak_days,
            },
        }
    )


@app.route("/api/user/training-sessions", methods=["POST"])
@rate_limit("user_training_sessions_post", max_requests=80, window_seconds=60)
def create_user_training_session():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    title = (data.get("title") or "Treino").strip() or "Treino"
    modality = (data.get("modality") or "").strip()
    session_type = (data.get("sessionType") or "tecnico").strip().lower() or "tecnico"
    duration_seconds = max(0, int(data.get("durationSeconds") or 0))
    distance_km = max(0.0, float(data.get("distanceKm") or 0.0))
    rounds_completed = max(0, int(data.get("roundsCompleted") or 0))
    notes = (data.get("notes") or "").strip()
    evidence_url = (data.get("evidenceUrl") or "").strip()
    abandoned = bool(data.get("abandoned", False))

    started_at = (data.get("startedAt") or "").strip() or datetime.utcnow().isoformat()
    ended_at = (data.get("endedAt") or "").strip() or datetime.utcnow().isoformat()

    xp_estimated = estimate_training_xp(session_type, duration_seconds, distance_km, rounds_completed, abandoned)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO user_training_sessions
        (user_id, title, modality, session_type, status, duration_seconds, distance_km, rounds_completed,
         notes, evidence_url, abandoned, xp_estimated, xp_awarded, started_at, ended_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            int(user_id),
            title,
            modality,
            session_type,
            "Pendente",
            duration_seconds,
            distance_km,
            rounds_completed,
            notes,
            evidence_url,
            int(abandoned),
            xp_estimated,
            0,
            started_at,
            ended_at,
        ),
    )
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"id": int(session_id), "status": "Pendente", "xpEstimated": int(xp_estimated), "xpAwarded": 0}), 201


@app.route("/api/coach/reviews/training/<int:session_id>", methods=["POST"])
@rate_limit("coach_reviews_training_post", max_requests=120, window_seconds=60)
def review_training_session(session_id):
    data = request.get_json(silent=True) or {}
    coach_id = data.get("coach_id")
    status = (data.get("status") or "").strip() or "Ajustar"
    review_notes = (data.get("reviewNotes") or "").strip()

    if not coach_id:
        return jsonify({"error": "coach_id obrigatorio"}), 400
    if status not in {"Validado", "Ajustar", "Reprovado"}:
        return jsonify({"error": "status invalido"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, int(coach_id)):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403

    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT session_type, duration_seconds, distance_km, rounds_completed, abandoned
        FROM user_training_sessions
        WHERE id = ?
        """,
        (int(session_id),),
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "sessao nao encontrada"}), 404

    xp_awarded = 0
    if status == "Validado":
        xp_awarded = estimate_training_xp(row[0], row[1], row[2], row[3], bool(row[4]))

    cursor.execute(
        """
        UPDATE user_training_sessions
        SET status = ?, review_notes = ?, reviewed_by_coach_id = ?, reviewed_at = ?, xp_awarded = ?
        WHERE id = ?
        """,
        (status, review_notes, int(coach_id), datetime.utcnow().isoformat(), int(xp_awarded), int(session_id)),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "status": status, "xpAwarded": int(xp_awarded), "reviewNotes": review_notes})


@app.route("/api/user/fights", methods=["GET"])
def get_user_fights():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, date, event, opponent, result, method, round, time, is_official, video_url, review_status, review_notes
        FROM user_fights
        WHERE user_id = ?
        ORDER BY date DESC, id DESC
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    fights = [
        {
            "id": str(row[0]),
            "date": row[1],
            "event": row[2],
            "opponent": row[3],
            "result": row[4],
            "method": row[5],
            "round": int(row[6] or 1),
            "time": row[7] or "00:00",
            "isOfficial": bool(row[8]),
            "videoUrl": row[9] or "",
            "reviewStatus": row[10] or "Pendente",
            "reviewNotes": row[11] or "",
        }
        for row in rows
    ]
    return jsonify({"fights": fights})


@app.route("/api/user/fights", methods=["POST"])
@rate_limit("user_fights_post", max_requests=40, window_seconds=60)
def create_user_fight():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    allowed_results = {"Vitoria", "Derrota"}
    allowed_methods = {"Pontos", "Finalizacao", "KO/TKO", "Desqualificacao"}

    date = (data.get("date") or "").strip()
    event = (data.get("event") or "").strip()
    opponent = (data.get("opponent") or "").strip()
    result = (data.get("result") or "").strip()
    method = (data.get("method") or "").strip()
    round_number = int(data.get("round") or 1)
    fight_time = (data.get("time") or "00:00").strip()
    is_official = int(bool(data.get("isOfficial", True)))
    video_url = (data.get("videoUrl") or "").strip()

    if not date or not event or not opponent:
        return jsonify({"error": "date, event e opponent obrigatorios"}), 400
    if result not in allowed_results:
        return jsonify({"error": "result invalido"}), 400
    if method not in allowed_methods:
        return jsonify({"error": "method invalido"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_fights (user_id, date, event, opponent, result, method, round, time, is_official, video_url, review_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, date, event, opponent, result, method, round_number, fight_time, is_official, video_url, "Pendente"),
        )
        conn.commit()
        fight_id = cursor.lastrowid
        conn.close()
    except sqlite3.OperationalError as exc:
        try:
            conn.close()
        except Exception:
            pass
        if "locked" in str(exc).lower():
            return jsonify({"error": "banco ocupado, tente novamente em instantes"}), 503
        return jsonify({"error": "falha ao salvar luta"}), 500
    except Exception:
        try:
            conn.close()
        except Exception:
            pass
        return jsonify({"error": "falha ao salvar luta"}), 500

    return jsonify(
        {
            "id": str(fight_id),
            "date": date,
            "event": event,
            "opponent": opponent,
            "result": result,
            "method": method,
            "round": round_number,
            "time": fight_time,
            "isOfficial": bool(is_official),
            "videoUrl": video_url,
            "reviewStatus": "Pendente",
            "reviewNotes": "",
        }
    ), 201


@app.route("/api/user/certificates", methods=["GET"])
def get_user_certificates():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, issuer, date, status, category, evidence_url, review_notes
        FROM user_certificates
        WHERE user_id = ?
        ORDER BY date DESC, id DESC
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    certificates = [
        {
            "id": str(row[0]),
            "title": row[1],
            "issuer": row[2],
            "date": row[3],
            "status": row[4] or "Pendente",
            "category": row[5] or "Graduacao",
            "evidenceUrl": row[6] or "",
            "reviewNotes": row[7] or "",
        }
        for row in rows
    ]
    return jsonify({"certificates": certificates})


@app.route("/api/user/certificates", methods=["POST"])
@rate_limit("user_certificates_post", max_requests=40, window_seconds=60)
def create_user_certificate():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id obrigatorio"}), 400

    title = (data.get("title") or "").strip()
    issuer = (data.get("issuer") or "").strip()
    cert_date = (data.get("date") or "").strip()
    category = (data.get("category") or "Graduacao").strip() or "Graduacao"
    evidence_url = (data.get("evidenceUrl") or "").strip()
    status = (data.get("status") or "Pendente").strip() or "Pendente"

    if not title or not issuer or not cert_date:
        return jsonify({"error": "title, issuer e date obrigatorios"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_certificates (user_id, title, issuer, date, category, evidence_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, title, issuer, cert_date, category, evidence_url, status),
        )
        conn.commit()
        cert_id = cursor.lastrowid
        conn.close()
    except sqlite3.OperationalError as exc:
        try:
            conn.close()
        except Exception:
            pass
        if "locked" in str(exc).lower():
            return jsonify({"error": "banco ocupado, tente novamente em instantes"}), 503
        return jsonify({"error": "falha ao salvar certificado"}), 500
    except Exception:
        try:
            conn.close()
        except Exception:
            pass
        return jsonify({"error": "falha ao salvar certificado"}), 500

    return jsonify(
        {
            "id": str(cert_id),
            "title": title,
            "issuer": issuer,
            "date": cert_date,
            "status": status,
            "category": category,
            "evidenceUrl": evidence_url,
        }
    ), 201


@app.route("/api/coach/roster", methods=["GET"])
def get_coach_roster():
    coach_id = request.args.get("coach_id", type=int)
    if not coach_id:
        return jsonify({"error": "coach_id obrigatorio"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, coach_id):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()
    cursor.execute(
        "SELECT athlete_id FROM coach_athletes WHERE coach_id = ? ORDER BY id DESC",
        (coach_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    return jsonify({"athlete_ids": [int(row[0]) for row in rows]})


@app.route("/api/coach/roster", methods=["POST"])
@rate_limit("coach_roster_post", max_requests=80, window_seconds=60)
def add_coach_roster_athlete():
    data = request.json or {}
    coach_id = data.get("coach_id")
    athlete_id = data.get("athlete_id")
    if not coach_id or not athlete_id:
        return jsonify({"error": "coach_id e athlete_id obrigatorios"}), 400

    if int(coach_id) == int(athlete_id):
        return jsonify({"error": "o tecnico nao pode adicionar a si mesmo"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, int(coach_id)):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE id = ?", (coach_id,))
    coach = cursor.fetchone()
    cursor.execute("SELECT id FROM users WHERE id = ?", (athlete_id,))
    athlete = cursor.fetchone()
    if not coach or not athlete:
        conn.close()
        return jsonify({"error": "usuario nao encontrado"}), 404

    cursor.execute(
        "INSERT OR IGNORE INTO coach_athletes (coach_id, athlete_id) VALUES (?, ?)",
        (coach_id, athlete_id),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True})


@app.route("/api/coach/roster", methods=["DELETE"])
@rate_limit("coach_roster_delete", max_requests=80, window_seconds=60)
def remove_coach_roster_athlete():
    data = request.json or {}
    coach_id = data.get("coach_id")
    athlete_id = data.get("athlete_id")
    if not coach_id or not athlete_id:
        return jsonify({"error": "coach_id e athlete_id obrigatorios"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, int(coach_id)):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM coach_athletes WHERE coach_id = ? AND athlete_id = ?",
        (coach_id, athlete_id),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True})


@app.route("/api/coach/notes", methods=["GET"])
def get_coach_notes():
    coach_id = request.args.get("coach_id", type=int)
    athlete_id = request.args.get("athlete_id", type=int)
    if not coach_id or not athlete_id:
        return jsonify({"error": "coach_id e athlete_id obrigatorios"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, coach_id):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()
    cursor.execute(
        "SELECT notes, updated_at FROM coach_notes WHERE coach_id = ? AND athlete_id = ? LIMIT 1",
        (coach_id, athlete_id),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"notes": "", "updated_at": None})

    return jsonify({"notes": row[0] or "", "updated_at": row[1]})


@app.route("/api/coach/notes", methods=["POST"])
@rate_limit("coach_notes_post", max_requests=80, window_seconds=60)
def save_coach_notes():
    data = request.json or {}
    coach_id = data.get("coach_id")
    athlete_id = data.get("athlete_id")
    notes = (data.get("notes") or "").strip()
    if not coach_id or not athlete_id:
        return jsonify({"error": "coach_id e athlete_id obrigatorios"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, int(coach_id)):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO coach_notes (coach_id, athlete_id, notes, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(coach_id, athlete_id) DO UPDATE SET
            notes = excluded.notes,
            updated_at = CURRENT_TIMESTAMP
        """,
        (coach_id, athlete_id, notes),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "notes": notes})


@app.route("/api/coach/plans", methods=["GET"])
def get_coach_plans():
    coach_id = request.args.get("coach_id", type=int)
    athlete_id = request.args.get("athlete_id", type=int)
    if not coach_id or not athlete_id:
        return jsonify({"error": "coach_id e athlete_id obrigatorios"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, coach_id):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, focus, day_label, duration_minutes
        FROM coach_plans
        WHERE coach_id = ? AND athlete_id = ?
        ORDER BY id DESC
        """,
        (coach_id, athlete_id),
    )
    rows = cursor.fetchall()
    conn.close()

    plans = [
        {
            "id": str(row[0]),
            "title": row[1],
            "focus": row[2],
            "dayLabel": row[3] or "Seg",
            "durationMinutes": int(row[4] or 60),
        }
        for row in rows
    ]

    return jsonify({"plans": plans})


@app.route("/api/coach/plans", methods=["POST"])
@rate_limit("coach_plans_post", max_requests=120, window_seconds=60)
def create_coach_plan():
    data = request.json or {}
    coach_id = data.get("coach_id")
    athlete_id = data.get("athlete_id")
    title = (data.get("title") or "").strip()
    focus = (data.get("focus") or "").strip()
    day_label = (data.get("dayLabel") or "Seg").strip() or "Seg"
    duration_minutes = max(15, int(data.get("durationMinutes") or 60))

    if not coach_id or not athlete_id:
        return jsonify({"error": "coach_id e athlete_id obrigatorios"}), 400
    if not title or not focus:
        return jsonify({"error": "title e focus obrigatorios"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, int(coach_id)):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO coach_plans (coach_id, athlete_id, title, focus, day_label, duration_minutes)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (coach_id, athlete_id, title, focus, day_label, duration_minutes),
    )
    conn.commit()
    plan_id = cursor.lastrowid
    conn.close()

    return jsonify(
        {
            "id": str(plan_id),
            "title": title,
            "focus": focus,
            "dayLabel": day_label,
            "durationMinutes": duration_minutes,
        }
    ), 201


@app.route("/api/coach/plans/<int:plan_id>", methods=["DELETE"])
@rate_limit("coach_plans_delete", max_requests=120, window_seconds=60)
def delete_coach_plan(plan_id):
    coach_id = request.args.get("coach_id", type=int)
    if not coach_id:
        return jsonify({"error": "coach_id obrigatorio"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, coach_id):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()
    cursor.execute("DELETE FROM coach_plans WHERE id = ? AND coach_id = ?", (plan_id, coach_id))
    conn.commit()
    conn.close()

    return jsonify({"success": True})


@app.route("/api/coach/reviews", methods=["GET"])
def get_coach_reviews_queue():
    coach_id = request.args.get("coach_id", type=int)
    status = (request.args.get("status") or "pendente").strip().lower()
    if not coach_id:
        return jsonify({"error": "coach_id obrigatorio"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, coach_id):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()

    fight_query = """
        SELECT f.id, f.user_id, u.nome, f.date, f.event, f.opponent, f.result, f.method, f.time, f.video_url, f.review_status, f.review_notes
        FROM user_fights f
        JOIN users u ON u.id = f.user_id
        WHERE f.is_official = 1
    """
    cert_query = """
        SELECT c.id, c.user_id, u.nome, c.title, c.issuer, c.date, c.category, c.evidence_url, c.status, c.review_notes
        FROM user_certificates c
        JOIN users u ON u.id = c.user_id
        WHERE 1=1
    """

    params = []
    cert_params = []
    if status == "pendente":
        fight_query += " AND lower(f.review_status) = 'pendente'"
        cert_query += " AND lower(c.status) = 'pendente'"

    fight_query += " ORDER BY f.id DESC LIMIT 200"
    cert_query += " ORDER BY c.id DESC LIMIT 200"

    cursor.execute(fight_query, params)
    fight_rows = cursor.fetchall()
    cursor.execute(cert_query, cert_params)
    cert_rows = cursor.fetchall()
    conn.close()

    fights = [
        {
            "id": int(row[0]),
            "athleteId": int(row[1]),
            "athleteName": row[2] or "Atleta",
            "date": row[3],
            "event": row[4],
            "opponent": row[5],
            "result": row[6],
            "method": row[7],
            "time": row[8],
            "videoUrl": row[9] or "",
            "reviewStatus": row[10] or "Pendente",
            "reviewNotes": row[11] or "",
        }
        for row in fight_rows
    ]

    certificates = [
        {
            "id": int(row[0]),
            "athleteId": int(row[1]),
            "athleteName": row[2] or "Atleta",
            "title": row[3],
            "issuer": row[4],
            "date": row[5],
            "category": row[6] or "Graduacao",
            "evidenceUrl": row[7] or "",
            "status": row[8] or "Pendente",
            "reviewNotes": row[9] or "",
        }
        for row in cert_rows
    ]

    return jsonify({"fights": fights, "certificates": certificates})


@app.route("/api/coach/reviews/fights/<int:fight_id>", methods=["POST"])
@rate_limit("coach_reviews_fights_post", max_requests=120, window_seconds=60)
def review_official_fight(fight_id):
    data = request.json or {}
    coach_id = data.get("coach_id")
    action = (data.get("action") or "").strip().lower()
    notes = (data.get("notes") or "").strip()
    if not coach_id:
        return jsonify({"error": "coach_id obrigatorio"}), 400
    if action not in {"aprovar", "rejeitar"}:
        return jsonify({"error": "acao invalida"}), 400

    status = "Aprovado" if action == "aprovar" else "Rejeitado"

    conn = get_db_connection()
    if not is_authorized_coach(conn, int(coach_id)):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM user_fights WHERE id = ?", (fight_id,))
    fight = cursor.fetchone()
    if not fight:
        conn.close()
        return jsonify({"error": "luta nao encontrada"}), 404

    cursor.execute(
        """
        UPDATE user_fights
        SET review_status = ?, review_notes = ?, reviewed_by_coach_id = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (status, notes, coach_id, fight_id),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "reviewStatus": status, "reviewNotes": notes})


@app.route("/api/coach/reviews/certificates/<int:certificate_id>", methods=["POST"])
@rate_limit("coach_reviews_certificates_post", max_requests=120, window_seconds=60)
def review_certificate(certificate_id):
    data = request.json or {}
    coach_id = data.get("coach_id")
    action = (data.get("action") or "").strip().lower()
    notes = (data.get("notes") or "").strip()
    if not coach_id:
        return jsonify({"error": "coach_id obrigatorio"}), 400
    if action not in {"aprovar", "rejeitar"}:
        return jsonify({"error": "acao invalida"}), 400

    status = "Verificado" if action == "aprovar" else "Rejeitado"

    conn = get_db_connection()
    if not is_authorized_coach(conn, int(coach_id)):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM user_certificates WHERE id = ?", (certificate_id,))
    cert = cursor.fetchone()
    if not cert:
        conn.close()
        return jsonify({"error": "certificado nao encontrado"}), 404

    cursor.execute(
        """
        UPDATE user_certificates
        SET status = ?, review_notes = ?, reviewed_by_coach_id = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (status, notes, coach_id, certificate_id),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "status": status, "reviewNotes": notes})


try:
    from .routes_events import register_event_routes
except ImportError:
    from routes_events import register_event_routes


# ---------------------------------------------------------------------------
# Athlete radar endpoints
# ---------------------------------------------------------------------------

@app.route("/api/users/<int:athlete_id>/radar", methods=["GET"])
def get_athlete_radar(athlete_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT agressividade, velocidade, forca, resistencia, stamina FROM athlete_radar WHERE athlete_id = ?",
        (athlete_id,),
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        raciocinio = row[0]
        return jsonify({
            "raciocinio": raciocinio,
            "agressividade": raciocinio,
            "velocidade": row[1], "forca": row[2],
            "resistencia": row[3], "stamina": row[4],
        })
    return jsonify({
        "raciocinio": 0,
        "agressividade": 0,
        "velocidade": 0, "forca": 0,
        "resistencia": 0, "stamina": 0,
    })


@app.route("/api/coach/radar/<int:athlete_id>", methods=["POST"])
@rate_limit("coach_radar_post", max_requests=60, window_seconds=60)
def set_athlete_radar(athlete_id):
    data = request.get_json(silent=True) or {}
    coach_id = data.get("coach_id")
    if not coach_id:
        return jsonify({"error": "coach_id obrigatorio"}), 400

    conn = get_db_connection()
    if not is_authorized_coach(conn, int(coach_id)):
        conn.close()
        return jsonify({"error": "acesso negado: tecnico nao autorizado"}), 403

    def clamp(v):
        try:
            return max(0, min(100, int(v)))
        except (TypeError, ValueError):
            return 50

    raciocinio = clamp(data.get("raciocinio", data.get("agressividade", 50)))
    velocidade = clamp(data.get("velocidade", 50))
    forca = clamp(data.get("forca", 50))
    resistencia = clamp(data.get("resistencia", 50))
    stamina = clamp(data.get("stamina", 50))

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO athlete_radar (athlete_id, coach_id, agressividade, velocidade, forca, resistencia, stamina, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(athlete_id) DO UPDATE SET
            coach_id = excluded.coach_id,
            agressividade = excluded.agressividade,
            velocidade = excluded.velocidade,
            forca = excluded.forca,
            resistencia = excluded.resistencia,
            stamina = excluded.stamina,
            updated_at = CURRENT_TIMESTAMP
        """,
        (athlete_id, coach_id, raciocinio, velocidade, forca, resistencia, stamina),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "raciocinio": raciocinio, "agressividade": raciocinio, "velocidade": velocidade,
                    "forca": forca, "resistencia": resistencia, "stamina": stamina})


register_event_routes(app)


if __name__ == "__main__":
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "5001"))
    debug_mode = os.getenv("BACKEND_DEBUG", "false").strip().lower() == "true"
    app.run(host=host, port=port, debug=debug_mode)

