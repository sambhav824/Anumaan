import os
import sys
import asyncio
import asyncpg
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

async def run_migrations():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    # asyncpg expects postgresql:// scheme
    dsn = database_url.replace("postgresql+asyncpg://", "postgresql://")

    # Connect to PostgreSQL / Supabase
    try:
        conn = await asyncpg.connect(dsn, ssl="require")
    except Exception as e:
        print(f"ERROR: Failed to connect to database: {e}", file=sys.stderr)
        sys.exit(1)

    print("Connected to database successfully.")

    try:
        # Create schema migrations tracking table if not exists
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS public.schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        """)

        migrations_dir = Path(__file__).parent / "supabase" / "migrations"
        if not migrations_dir.is_dir():
            print(f"ERROR: Migrations directory not found: {migrations_dir}", file=sys.stderr)
            sys.exit(1)

        migration_files = sorted(migrations_dir.glob("*.sql"), key=lambda p: p.name)
        if not migration_files:
            print("No migration files found.")
            return

        # Fetch already applied versions
        applied_rows = await conn.fetch("SELECT version FROM public.schema_migrations;")
        applied_versions = {r["version"] for r in applied_rows}

        for migration_file in migration_files:
            version_name = migration_file.name
            if version_name in applied_versions:
                print(f"Skipping already applied migration: {version_name}")
                continue

            print(f"Applying migration: {version_name} ...")
            with open(migration_file, "r", encoding="utf-8") as f:
                sql_content = f.read()

            # Execute transactionally: stop on first failure
            async with conn.transaction():
                await conn.execute(sql_content)
                await conn.execute(
                    "INSERT INTO public.schema_migrations (version) VALUES ($1);",
                    version_name
                )
            print(f"Migration {version_name} applied successfully.")

        print("All migrations completed successfully.")
    except Exception as e:
        print(f"ERROR: Migration failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migrations())
