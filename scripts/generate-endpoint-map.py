#!/usr/bin/env python3

from pathlib import Path
from datetime import datetime, timezone
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "ENDPOINTS_FULL_MAP.txt"

HTTP_METHODS = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS"


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""


def next_api_route(path: Path) -> str:
    rel = path.relative_to(ROOT / "app" / "api")
    parts = list(rel.parts[:-1])

    converted = []
    for part in parts:
        if part.startswith("[...") and part.endswith("]"):
            converted.append(":" + part[4:-1] + "*")
        elif part.startswith("[") and part.endswith("]"):
            converted.append(":" + part[1:-1])
        else:
            converted.append(part)

    return "/api" + ("/" + "/".join(converted) if converted else "")


def next_page_route(path: Path) -> str:
    rel = path.relative_to(ROOT / "app")
    parts = list(rel.parts[:-1])

    converted = []
    for part in parts:
        if part.startswith("(") and part.endswith(")"):
            continue
        if part.startswith("[...") and part.endswith("]"):
            converted.append(":" + part[4:-1] + "*")
        elif part.startswith("[") and part.endswith("]"):
            converted.append(":" + part[1:-1])
        else:
            converted.append(part)

    return "/" + "/".join(converted) if converted else "/"


def ts_methods(text: str):
    methods = set(
        re.findall(
            rf"export\s+(?:async\s+)?function\s+({HTTP_METHODS})\b",
            text,
        )
    )

    methods.update(
        re.findall(
            rf"export\s+const\s+({HTTP_METHODS})\b",
            text,
        )
    )

    return sorted(methods)


def auth_note(text: str) -> str:
    if "ADMIN_ACCESS_TOKEN" in text:
        return "Bearer ADMIN_ACCESS_TOKEN"
    if "authorization" in text.lower():
        return "authorization logic present"
    return "none visible in route"


def python_routes():
    results = []

    active_roots = [
        ROOT / "Orb_Assistant" / "api",
        ROOT / "Orb_Assistant" / "cali_skg",
        ROOT / "Orb_Assistant" / "orb_controller",
    ]

    decorator = re.compile(
        r"""@\s*(?:app|router|bp|blueprint)\."""
        r"""(get|post|put|patch|delete|route)\s*"""
        r"""\(\s*["']([^"']+)["']""",
        re.IGNORECASE,
    )

    for base in active_roots:
        if not base.exists():
            continue

        for path in sorted(base.rglob("*.py")):
            lowered = {p.lower() for p in path.parts}

            if "archive" in lowered or "__pycache__" in lowered:
                continue

            text = read_text(path)

            for match in decorator.finditer(text):
                method = match.group(1).upper()
                route = match.group(2)

                results.append(
                    (
                        method,
                        route,
                        str(path.relative_to(ROOT)),
                    )
                )

    return results


def vault_openapi_routes():
    path = ROOT / "spruked_Vault" / "interfaces" / "api" / "openapi.yaml"

    if not path.exists():
        return []

    results = []
    current = None

    for line in read_text(path).splitlines():
        route_match = re.match(r"^\s{2}(/[^:]+):\s*$", line)

        if route_match:
            current = route_match.group(1)
            continue

        method_match = re.match(
            r"^\s{4}(get|post|put|patch|delete|head|options):\s*$",
            line,
            re.IGNORECASE,
        )

        if current and method_match:
            results.append(
                (
                    method_match.group(1).upper(),
                    current,
                    str(path.relative_to(ROOT)),
                )
            )

    return results


def runtime_dependencies():
    roots = [
        ROOT / "app" / "api",
        ROOT / "lib",
        ROOT / "Orb_Assistant" / "api",
        ROOT / "Orb_Assistant" / "cali_skg",
    ]

    urls = set()
    envs = set()

    url_pattern = re.compile(
        r"""https?://[A-Za-z0-9._:\-/{}?=&%]+"""
    )

    env_patterns = [
        re.compile(r"process\.env\.([A-Z][A-Z0-9_]*)"),
        re.compile(r"""os\.getenv\(\s*["']([A-Z][A-Z0-9_]*)["']"""),
        re.compile(r"""os\.environ\.get\(\s*["']([A-Z][A-Z0-9_]*)["']"""),
        re.compile(r"""os\.environ\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]"""),
    ]

    for base in roots:
        if not base.exists():
            continue

        for path in base.rglob("*"):
            if not path.is_file():
                continue

            if path.suffix.lower() not in {
                ".ts", ".tsx", ".js", ".jsx", ".py"
            }:
                continue

            if "archive" in {p.lower() for p in path.parts}:
                continue

            text = read_text(path)

            for url in url_pattern.findall(text):
                urls.add(url.rstrip(".,;"))

            for pattern in env_patterns:
                envs.update(pattern.findall(text))

    return sorted(urls), sorted(envs)


def main():
    lines = []

    lines.append("SPRUKED.COM — COMPLETE ENDPOINT MAP")
    lines.append("=" * 78)
    lines.append(
        "Generated: "
        + datetime.now(timezone.utc).isoformat()
    )
    lines.append("Repository root: " + str(ROOT))
    lines.append("")
    lines.append(
        "Scope: active application/runtime source only."
    )
    lines.append(
        "Excluded from endpoint discovery: .next*, build output, "
        "ORB_PRIMARY_WEBSITE_INSTALLATION_REVIEW, artifacts, "
        "archive trees, public templates, caches and node_modules."
    )

    lines.append("")
    lines.append("")
    lines.append("1. LIVE NEXT.JS API ENDPOINTS")
    lines.append("-" * 78)

    api_root = ROOT / "app" / "api"

    api_count = 0

    if api_root.exists():
        for path in sorted(api_root.rglob("route.ts")):
            text = read_text(path)
            methods = ts_methods(text)

            if not methods:
                methods = ["UNKNOWN"]

            route = next_api_route(path)

            for method in methods:
                api_count += 1
                lines.append(
                    f"{method:<8} {route:<45} "
                    f"{path.relative_to(ROOT)}"
                )

            lines.append(
                f"         auth: {auth_note(text)}"
            )

    lines.append("")
    lines.append(f"Next.js API method mappings: {api_count}")

    lines.append("")
    lines.append("")
    lines.append("2. PUBLIC / APPLICATION PAGE ROUTES")
    lines.append("-" * 78)

    page_count = 0

    app_root = ROOT / "app"

    if app_root.exists():
        for path in sorted(app_root.rglob("page.tsx")):
            if "api" in path.relative_to(app_root).parts:
                continue

            page_count += 1
            lines.append(
                f"{next_page_route(path):<48} "
                f"{path.relative_to(ROOT)}"
            )

    lines.append("")
    lines.append(f"Page routes: {page_count}")

    lines.append("")
    lines.append("")
    lines.append("3. PYTHON SERVICE ROUTE DECLARATIONS")
    lines.append("-" * 78)

    py = python_routes()

    if py:
        for method, route, source in py:
            lines.append(
                f"{method:<8} {route:<45} {source}"
            )
    else:
        lines.append("No Python route decorators found in active roots.")

    lines.append("")
    lines.append(f"Python route declarations: {len(py)}")

    lines.append("")
    lines.append("")
    lines.append("4. SPRUKED VAULT API CONTRACT")
    lines.append("-" * 78)

    vault = vault_openapi_routes()

    if vault:
        for method, route, source in vault:
            lines.append(
                f"{method:<8} {route:<45} {source}"
            )
    else:
        lines.append("No Vault OpenAPI routes found.")

    lines.append("")
    lines.append(f"Vault API operations: {len(vault)}")

    urls, envs = runtime_dependencies()

    lines.append("")
    lines.append("")
    lines.append("5. RUNTIME / UPSTREAM SERVICE URLS")
    lines.append("-" * 78)

    if urls:
        for url in urls:
            lines.append(url)
    else:
        lines.append("No literal HTTP service URLs discovered.")

    lines.append("")
    lines.append("")
    lines.append("6. ENDPOINT / RUNTIME ENVIRONMENT VARIABLES")
    lines.append("-" * 78)

    if envs:
        for env in envs:
            lines.append(env)
    else:
        lines.append("No environment variables discovered.")

    lines.append("")
    lines.append("")
    lines.append("7. DISCOVERY BOUNDARIES")
    lines.append("-" * 78)
    lines.append(
        "Canonical live Next.js APIs: app/api/**/route.ts"
    )
    lines.append(
        "Canonical application pages: app/**/page.tsx"
    )
    lines.append(
        "Active local service source: Orb_Assistant/api, "
        "Orb_Assistant/cali_skg, Orb_Assistant/orb_controller"
    )
    lines.append(
        "Vault API contract: "
        "spruked_Vault/interfaces/api/openapi.yaml"
    )
    lines.append("")
    lines.append(
        "Historical/review/build copies are intentionally not counted "
        "as production endpoints."
    )

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Wrote {OUT}")
    print(f"Next.js mappings: {api_count}")
    print(f"Page routes: {page_count}")
    print(f"Python declarations: {len(py)}")
    print(f"Vault operations: {len(vault)}")
    print(f"Runtime URLs: {len(urls)}")
    print(f"Environment keys: {len(envs)}")


if __name__ == "__main__":
    main()
