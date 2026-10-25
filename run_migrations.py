import asyncio, asyncpg, os

async def run():
    conn = await asyncpg.connect(
        host='aws-0-ap-south-1.pooler.supabase.com',
        port=5432,
        user='postgres.knwinlllqjmgzqcjrrio',
        password='4v3#8Ye$!E9B&tL',
        database='postgres',
        ssl='require'
    )
    print('Connected to Supabase PostgreSQL')
    
    # Run migration 1
    try:
        with open('supabase/migrations/00001_initial_schema.sql', encoding='utf-8') as f:
            await conn.execute(f.read())
        print('Migration 00001 applied OK')
    except Exception as e:
        print(f'Migration 00001 note: {e}')
    
    # Run migration 2
    try:
        with open('supabase/migrations/00002_storage_buckets.sql', encoding='utf-8') as f:
            await conn.execute(f.read())
        print('Migration 00002 applied OK')
    except Exception as e:
        print(f'Migration 00002 note: {e}')
    
    await conn.close()
    print('Done.')

asyncio.run(run())
