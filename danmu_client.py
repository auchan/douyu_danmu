#!/usr/bin/env python

import asyncio
import websockets

isExit = False
async def client(uri):
    global isExit
    async with websockets.connect(uri) as websocket:
        while True:
            content = await websocket.recv()
            print(content)
            await asyncio.sleep(0.1)
            if isExit:
                break

try:
    asyncio.get_event_loop().run_until_complete(client('ws://localhost:8765'))
except KeyboardInterrupt as e:
    print("KeyboardInterrupt")
    isExit = True