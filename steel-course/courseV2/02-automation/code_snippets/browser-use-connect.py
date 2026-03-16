# browser-use-connect.py — code_snippets
# Connect Browser-use agent to a Steel session via CDP URL.
# Run: pip install browser-use langchain-google-genai
#      python browser-use-connect.py

import asyncio
import os
from dotenv import load_dotenv
from browser_use import Agent, BrowserSession
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv(dotenv_path='../.env')

STEEL_API_KEY = os.environ['STEEL_API_KEY']
GOOGLE_API_KEY = os.environ['GOOGLE_API_KEY']
SESSION_ID = 'YOUR_SESSION_ID'  # create a session first and put the ID here

CDP_URL = f'wss://connect.steel.dev?apiKey={STEEL_API_KEY}&sessionId={SESSION_ID}'

async def main():
    llm = ChatGoogleGenerativeAI(model='gemini-2.0-flash', google_api_key=GOOGLE_API_KEY)
    browser_session = BrowserSession(cdp_url=CDP_URL)
    agent = Agent(
        task='Summarize what Steel does in one sentence from steel.dev',
        llm=llm,
        browser_session=browser_session,
    )
    result = await agent.run()
    print('Result:', result)

if __name__ == '__main__':
    asyncio.run(main())
