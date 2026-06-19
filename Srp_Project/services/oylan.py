from __future__ import annotations
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('OYLAN_API_KEY')
ASSISTANT_ID = os.getenv('OYLAN_ASSISTANT_ID')
BASE_URL = os.getenv('OYLAN_BASE_URL', 'https://oylan.nu.edu.kz/api/v1')

HEADERS = {
    'Authorization': f'Api-Key {API_KEY}',
    'accept': 'application/json',
}

async def send_message(content: str,
                        history: list[dict] | None = None) -> str:
    url = f'{BASE_URL}/assistant/{ASSISTANT_ID}/interactions/'
    context = ''
    if history:
        for msg in history:
            prefix = 'User' if msg['role'] == 'user' else 'Assistant'
            context += f"{prefix}: {msg['content']}\n"
    full_content = context + f'User: {content}' if context else content
    data = {'content': full_content, 'stream': False}
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(url, headers=HEADERS, data=data)
        r.raise_for_status()
        return r.json()['response']['content']