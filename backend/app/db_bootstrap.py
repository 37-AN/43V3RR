from sqlalchemy import text
from sqlalchemy.engine import Engine


SCHEMA_SQL = [
    """
    CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER NOT NULL REFERENCES brands(id),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        stage TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER NOT NULL REFERENCES brands(id),
        project_id INTEGER REFERENCES projects(id),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        source TEXT NOT NULL,
        due_date TIMESTAMPTZ,
        created_by TEXT NOT NULL,
        assigned_to TEXT NOT NULL,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS ideas (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER NOT NULL REFERENCES brands(id),
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS content_items (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER NOT NULL REFERENCES brands(id),
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        source TEXT NOT NULL,
        scheduled_at TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS ai_runs (
        id SERIAL PRIMARY KEY,
        agent_name TEXT NOT NULL,
        input_summary TEXT,
        output_summary TEXT,
        success BOOLEAN NOT NULL DEFAULT TRUE,
        error_message TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        actor_type TEXT NOT NULL,
        actor_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
    );
    """,
]


def create_schema_if_needed(engine: Engine) -> None:
    with engine.begin() as connection:
        for statement in SCHEMA_SQL:
            connection.execute(text(statement))

        connection.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage TEXT;"))
        connection.execute(text("ALTER TABLE ideas ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;"))
        connection.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;"))
        connection.execute(text("ALTER TABLE content_items ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;"))
        connection.execute(text("ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;"))
        connection.execute(text("ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;"))

        connection.execute(
            text(
                """
                INSERT INTO brands (name, slug)
                SELECT '43v3r Technology', 'tech'
                WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'tech');
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE brands
                SET slug = 'tech'
                WHERE slug = '43v3r_technology';
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO brands (name, slug)
                SELECT '43v3r Records', 'records'
                WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'records');
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE brands
                SET slug = 'records'
                WHERE slug = '43v3r_records';
                """
            )
        )
