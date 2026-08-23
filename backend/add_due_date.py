import asyncio
from database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE complaints ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;'))
            print('Column due_date added.')
        except Exception as e:
            print(f'Error (maybe already exists?): {e}')

asyncio.run(main())
