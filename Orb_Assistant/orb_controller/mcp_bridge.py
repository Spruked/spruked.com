import asyncio
import json
import subprocess

class MCPClient:
    def __init__(self, cmd=["python", "orb_mcp_server.py"], cwd=None):
        self.process = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )

    async def call(self, method, params=None):
        req = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or {}
        }
        self.process.stdin.write(json.dumps(req) + "\n")
        self.process.stdin.flush()

        line = await asyncio.get_event_loop().run_in_executor(
            None, self.process.stdout.readline
        )
        return json.loads(line)
