import asyncio
import websockets
import json
from old.command_factory import CommandFactory
from multiprocessing import freeze_support


async def handle_command(ws):
    command = CommandFactory().deserialize(json.loads(await ws.recv()))

    command_answer = await command.execute(None)
    await ws.send(json.dumps(command_answer.serialize()))


async def agent():
    async with websockets.connect('ws://127.0.0.1:8000/agent') as ws:
        print('Agent ID:', json.loads(await ws.recv())['agentId'])

        while True:
            await handle_command(ws)

if __name__ == '__main__':
    freeze_support()
    asyncio.get_event_loop().run_until_complete(agent())