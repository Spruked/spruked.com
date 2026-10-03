"""
CALI tool registry - the actuator layer CALI's cognition can reach for.

Tools:
  tesseract_ocr           built-in, local, tier "read"
  <manifest>.<endpoint>   HTTP research APIs declared in cali_skg/tools/manifests/*.json
  mcp:<server>.<tool>     MCP servers (stdio) declared in the same manifests

Rules (ORBS whitepaper section 19: least-privilege tools per deployment):
  * Only the admin caller can use tools. Website visitors never reach this layer.
  * A tool must be enabled in its manifest AND its tier must be granted (CALI_TOOL_TIERS,
    default "read,research"). Tier "admin" is never granted by default.
  * API calls stay on the manifest's host. No redirects, no shell, size-capped responses.
  * MCP calls only reach tools on the manifest's explicit allowlist.
  * Every call is logged (tool_calls) so reliability can be measured and degraded tools flagged.
"""

from __future__ import annotations

import json
import os
import re
import select
import shutil
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote
from typing import Any, Callable, Dict, List, Optional

try:
    import httpx
except Exception:  # pragma: no cover
    httpx = None  # type: ignore

TIERS = ("read", "research", "admin")
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif", ".webp"}
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
_NAME_RE = re.compile(r"^[a-z0-9_\-]{1,40}$")


class ToolError(Exception):
    pass


class CaliToolRegistry:
    def __init__(self, base_path: Path, connect: Callable[[], Any],
                 granted_tiers: Optional[List[str]] = None, file_roots: Optional[List[Path]] = None):
        self.base_path = Path(base_path)
        self._connect = connect
        raw = os.getenv("CALI_TOOL_TIERS", "read,research") if granted_tiers is None else ",".join(granted_tiers)
        self.granted_tiers = {t.strip() for t in raw.split(",") if t.strip() in TIERS}
        env_roots = [Path(p) for p in os.getenv("CALI_TOOL_FILE_ROOTS", "").split(os.pathsep) if p.strip()]
        orb_vision_root = Path("/home/bryan/substrate/orb_vision")
        self.file_roots = [p.resolve() for p in (file_roots or [self.base_path / "temp", orb_vision_root]) + env_roots]
        configured_tesseract = str(os.getenv("CALI_TESSERACT_BIN", "")).strip()
        bundled_tesseract = orb_vision_root / "tesseract" / "bin" / "tesseract"
        self.tesseract_binary = configured_tesseract or (str(bundled_tesseract) if bundled_tesseract.exists() else shutil.which("tesseract"))
        self.manifest_dir = self.base_path / "tools" / "manifests"
        self.manifests: Dict[str, Dict[str, Any]] = {}
        self.manifest_errors: List[str] = []
        self._init_table()
        self.reload_manifests()

    # ------------------------------------------------------------------ setup
    def _init_table(self) -> None:
        with self._connect() as conn:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS tool_calls (id INTEGER PRIMARY KEY AUTOINCREMENT, tool TEXT, ok INTEGER, "
                "duration_ms INTEGER, error TEXT, created_at TEXT)"
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_tool_calls_tool ON tool_calls(tool, created_at)")
            conn.commit()

    def reload_manifests(self) -> None:
        self.manifests, self.manifest_errors = {}, []
        if not self.manifest_dir.exists():
            return
        for path in sorted(self.manifest_dir.glob("*.json")):
            if path.name.endswith(".example.json"):
                continue
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                self._validate_manifest(data)
                self.manifests[data["name"]] = data
            except Exception as exc:
                self.manifest_errors.append(f"{path.name}: {exc}")

    @staticmethod
    def _validate_manifest(data: Dict[str, Any]) -> None:
        if not isinstance(data, dict) or not _NAME_RE.match(str(data.get("name", ""))):
            raise ValueError("invalid or missing name")
        if data.get("kind") not in ("api", "mcp"):
            raise ValueError("kind must be 'api' or 'mcp'")
        if data.get("tier", "research") not in TIERS:
            raise ValueError("invalid tier")
        if data["kind"] == "api":
            base = str(data.get("base_url", ""))
            host = re.sub(r"^https?://", "", base).split("/")[0].split(":")[0]
            if not (base.startswith("https://") or (base.startswith("http://") and host in LOCAL_HOSTS)):
                raise ValueError("base_url must be https (http only for localhost)")
            if not isinstance(data.get("endpoints"), dict) or not data["endpoints"]:
                raise ValueError("endpoints required")
        else:
            if not isinstance(data.get("command"), list) or not data["command"]:
                raise ValueError("command list required")
            if not isinstance(data.get("tools_allowlist"), list) or not data["tools_allowlist"]:
                raise ValueError("tools_allowlist required (least privilege)")

    # ---------------------------------------------------------------- catalog
    def _granted(self, tier: str) -> bool:
        return tier in self.granted_tiers

    def list_tools(self) -> List[Dict[str, Any]]:
        tools = [{"name": "tesseract_ocr", "kind": "builtin", "tier": "read", "enabled": bool(self.tesseract_binary),
                  "granted": self._granted("read"), "description": "Read text from an image file with local Tesseract OCR."}]
        for m in self.manifests.values():
            tier = m.get("tier", "research")
            enabled = bool(m.get("enabled", True))
            if m["kind"] == "api":
                for ep, spec in m["endpoints"].items():
                    tools.append({"name": f"{m['name']}.{ep}", "kind": "api", "tier": tier, "enabled": enabled,
                                  "granted": self._granted(tier),
                                  "description": spec.get("description") or m.get("description", "")})
            else:
                for tool in m["tools_allowlist"]:
                    tools.append({"name": f"mcp:{m['name']}.{tool}", "kind": "mcp", "tier": tier, "enabled": enabled,
                                  "granted": self._granted(tier), "description": m.get("description", "")})
        stats = self.stats()
        for t in tools:
            t["stats"] = stats.get(t["name"], {"calls": 0, "ok_rate": None})
        return tools

    def describe_for_prompt(self) -> str:
        """Compact tool list for configured-provider prompts: only tools callable right now."""
        usable = [t for t in self.list_tools() if t["enabled"] and t["granted"]]
        return "\n".join(f"- {t['name']}: {t['description']}" for t in usable) or "(no tools available)"

    # ------------------------------------------------------------------- call
    def call_tool(self, name: str, args: Optional[Dict[str, Any]] = None, caller: str = "admin") -> Dict[str, Any]:
        args = dict(args or {})
        started = time.monotonic()
        try:
            if caller != "admin":
                raise ToolError("Tools are only available to the admin caller.")
            result = self._dispatch(str(name or ""), args)
            ok, error = True, None
        except ToolError as exc:
            result, ok, error = None, False, str(exc)
        except Exception as exc:  # tool failures must not escape into the answer path
            result, ok, error = None, False, f"{type(exc).__name__}: {exc}"
        duration_ms = int((time.monotonic() - started) * 1000)
        self._log_call(str(name)[:120], ok, duration_ms, error)
        return {"ok": ok, "tool": name, "result": result, "error": error, "duration_ms": duration_ms}

    def _dispatch(self, name: str, args: Dict[str, Any]) -> Any:
        if name == "tesseract_ocr":
            if not self._granted("read"):
                raise ToolError("Tier 'read' not granted.")
            return self._tesseract(args)
        if name.startswith("mcp:"):
            server, _, tool = name[4:].partition(".")
            manifest = self._manifest(server, "mcp")
            self._check_manifest(manifest)
            if tool not in manifest["tools_allowlist"]:
                raise ToolError(f"MCP tool '{tool}' is not on the allowlist for '{server}'.")
            return self._mcp_call(manifest, tool, args)
        api, _, endpoint = name.partition(".")
        manifest = self._manifest(api, "api")
        self._check_manifest(manifest)
        if endpoint not in manifest["endpoints"]:
            raise ToolError(f"Unknown endpoint '{endpoint}' for '{api}'.")
        return self._api_call(manifest, manifest["endpoints"][endpoint], args)

    def _manifest(self, name: str, kind: str) -> Dict[str, Any]:
        m = self.manifests.get(name)
        if not m or m["kind"] != kind:
            raise ToolError(f"Unknown {kind} tool source '{name}'.")
        return m

    def _check_manifest(self, manifest: Dict[str, Any]) -> None:
        if not manifest.get("enabled", True):
            raise ToolError(f"'{manifest['name']}' is disabled in its manifest.")
        tier = manifest.get("tier", "research")
        if not self._granted(tier):
            raise ToolError(f"Tier '{tier}' is not granted (CALI_TOOL_TIERS).")

    # ------------------------------------------------------------- tesseract
    def _tesseract(self, args: Dict[str, Any]) -> Dict[str, Any]:
        binary = self.tesseract_binary
        if not binary:
            raise ToolError("tesseract is not installed.")
        path = Path(str(args.get("path", ""))).expanduser()
        try:
            resolved = path.resolve(strict=True)
        except (OSError, RuntimeError):
            raise ToolError("Image file not found.")
        if resolved.suffix.lower() not in IMAGE_SUFFIXES:
            raise ToolError("Unsupported file type for OCR.")
        if not any(root == resolved or root in resolved.parents for root in self.file_roots):
            raise ToolError("Path is outside the allowed tool file roots.")
        lang = str(args.get("lang") or "eng")
        if not re.match(r"^[A-Za-z_+]{2,24}$", lang):
            raise ToolError("Invalid language code.")
        command = [binary, str(resolved), "stdout", "-l", lang]
        if args.get("psm") is not None:
            psm = int(args["psm"])
            if not 0 <= psm <= 13:
                raise ToolError("psm must be 0-13.")
            command += ["--psm", str(psm)]
        proc = subprocess.run(command, capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            raise ToolError(f"tesseract failed: {proc.stderr.strip()[:200]}")
        text = proc.stdout.strip()
        return {"text": text[:20000], "truncated": len(text) > 20000, "file": resolved.name}

    # ------------------------------------------------------------ API manifests
    def _api_call(self, manifest: Dict[str, Any], spec: Dict[str, Any], args: Dict[str, Any]) -> Dict[str, Any]:
        if httpx is None:
            raise ToolError("httpx not installed.")
        base = manifest["base_url"].rstrip("/")
        path = str(spec.get("path", ""))
        for field in re.findall(r"\{(\w+)\}", path):
            if field not in args:
                raise ToolError(f"Missing path parameter '{field}'.")
            path = path.replace("{" + field + "}", quote(str(args[field]), safe=""))
        allowed_query = set(spec.get("params", []))
        allowed_body = set(spec.get("body_params", []))
        query = {k: v for k, v in args.items() if k in allowed_query}
        body = {k: v for k, v in args.items() if k in allowed_body}
        headers = {"User-Agent": manifest.get("user_agent", "CALI-research/1.0 (spruked.com)")}
        auth = manifest.get("auth") or {"type": "none"}
        if auth.get("type") != "none":
            secret = os.getenv(str(auth.get("env", "")), "")
            if not secret:
                raise ToolError(f"Auth env var {auth.get('env')} is not set.")
            if auth["type"] == "bearer_env":
                headers["Authorization"] = f"Bearer {secret}"
            elif auth["type"] == "header_env":
                headers[str(auth.get("header", "X-API-Key"))] = secret
            elif auth["type"] == "query_env":
                query[str(auth.get("param", "api_key"))] = secret
        url = base + path
        method = str(spec.get("method", "GET")).upper()
        if method not in ("GET", "POST"):
            raise ToolError("Only GET and POST are supported.")
        response = httpx.request(method, url, params=query or None, json=body or None, headers=headers,
                                 timeout=float(manifest.get("timeout", 15)), follow_redirects=False)
        if response.is_redirect:
            raise ToolError("Redirects are not followed.")
        max_bytes = int(manifest.get("max_bytes", 200_000))
        raw = response.content[:max_bytes]
        truncated = len(response.content) > max_bytes
        try:
            data: Any = json.loads(raw) if not truncated else raw.decode("utf-8", "replace")
        except ValueError:
            data = raw.decode("utf-8", "replace")
        if response.status_code >= 400:
            raise ToolError(f"{manifest['name']} returned HTTP {response.status_code}")
        return {"status": response.status_code, "data": data, "truncated": truncated, "source": manifest["name"]}

    # -------------------------------------------------------------------- MCP
    def _mcp_session(self, manifest: Dict[str, Any], method: str, params: Dict[str, Any]) -> Any:
        """One short-lived stdio session: initialize, one request, shut down. POSIX/WSL only (uses select)."""
        env = {k: os.environ[k] for k in ("PATH", "HOME", "LANG") if k in os.environ}
        for key in manifest.get("env_passthrough", []):
            if key in os.environ:
                env[key] = os.environ[key]
        timeout = float(manifest.get("timeout", 30))
        proc = subprocess.Popen(manifest["command"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.DEVNULL, env=env, text=True, bufsize=1)
        deadline = time.monotonic() + timeout

        def send(message: Dict[str, Any]) -> None:
            proc.stdin.write(json.dumps(message) + "\n")  # type: ignore[union-attr]
            proc.stdin.flush()  # type: ignore[union-attr]

        def read_response(request_id: int) -> Dict[str, Any]:
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise ToolError("MCP server timed out.")
                ready, _, _ = select.select([proc.stdout], [], [], remaining)
                if not ready:
                    raise ToolError("MCP server timed out.")
                line = proc.stdout.readline()  # type: ignore[union-attr]
                if not line:
                    raise ToolError("MCP server closed unexpectedly.")
                try:
                    message = json.loads(line)
                except ValueError:
                    continue
                if message.get("id") == request_id:
                    if "error" in message:
                        raise ToolError(f"MCP error: {str(message['error'])[:300]}")
                    return message.get("result", {})

        try:
            send({"jsonrpc": "2.0", "id": 1, "method": "initialize",
                  "params": {"protocolVersion": "2024-11-05", "capabilities": {},
                             "clientInfo": {"name": "cali", "version": "1.0"}}})
            read_response(1)
            send({"jsonrpc": "2.0", "method": "notifications/initialized"})
            send({"jsonrpc": "2.0", "id": 2, "method": method, "params": params})
            return read_response(2)
        finally:
            try:
                proc.stdin.close()  # type: ignore[union-attr]
            except Exception:
                pass
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()

    def _mcp_call(self, manifest: Dict[str, Any], tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
        result = self._mcp_session(manifest, "tools/call", {"name": tool, "arguments": args})
        text = "\n".join(p.get("text", "") for p in result.get("content", []) if isinstance(p, dict) and p.get("type") == "text")
        if result.get("isError"):
            raise ToolError(f"MCP tool error: {text[:300]}")
        return {"text": text[:50000], "raw_keys": sorted(result.keys()), "source": f"mcp:{manifest['name']}"}

    # ------------------------------------------------------------- log / health
    def _log_call(self, tool: str, ok: bool, duration_ms: int, error: Optional[str]) -> None:
        try:
            with self._connect() as conn:
                conn.execute("INSERT INTO tool_calls (tool, ok, duration_ms, error, created_at) VALUES (?, ?, ?, ?, ?)",
                             (tool, int(ok), duration_ms, (error or "")[:300], datetime.utcnow().isoformat()))
                conn.commit()
        except Exception:
            pass

    def stats(self, window_days: int = 30) -> Dict[str, Dict[str, Any]]:
        cutoff = (datetime.utcnow() - timedelta(days=window_days)).isoformat()
        with self._connect() as conn:
            rows = conn.execute("SELECT tool, COUNT(*), SUM(ok) FROM tool_calls WHERE created_at > ? GROUP BY tool", (cutoff,)).fetchall()
        return {r[0]: {"calls": r[1], "ok_rate": round((r[2] or 0) / r[1], 3)} for r in rows}

    def health(self) -> Dict[str, Any]:
        degraded = []
        for tool, s in self.stats().items():
            if s["calls"] >= 5 and s["ok_rate"] is not None and s["ok_rate"] < 0.5:
                degraded.append({"tool": tool, **s})
        mcp_missing = [m["name"] for m in self.manifests.values()
                       if m["kind"] == "mcp" and m.get("enabled", True) and not shutil.which(m["command"][0])]
        return {
            "tesseract": bool(self.tesseract_binary),
            "tesseract_binary": self.tesseract_binary,
            "manifests_loaded": sorted(self.manifests),
            "manifest_errors": list(self.manifest_errors),
            "mcp_commands_missing": mcp_missing,
            "degraded_tools": degraded,
            "granted_tiers": sorted(self.granted_tiers),
        }

    def prune_log(self, retention_days: int = 90) -> int:
        cutoff = (datetime.utcnow() - timedelta(days=retention_days)).isoformat()
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM tool_calls WHERE created_at < ?", (cutoff,))
            conn.commit()
            return cur.rowcount


class CaliToolsMixin:
    tools: Optional[CaliToolRegistry] = None

    def _init_tools(self) -> None:
        self.tools = CaliToolRegistry(self.base_path, self._connect)

    def use_tool(self, name: str, args: Optional[Dict[str, Any]] = None, caller: str = "admin") -> Dict[str, Any]:
        return self.tools.call_tool(name, args, caller=caller)  # type: ignore[union-attr]

    def list_tools(self) -> List[Dict[str, Any]]:
        return self.tools.list_tools()  # type: ignore[union-attr]
