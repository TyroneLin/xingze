"""Single-function router for 星泽 CMS (Function URL or API Gateway).

Routes:
  OPTIONS *          → CORS preflight
  POST /login        → login.main_handler
  POST /sts          → sts.main_handler
  POST /rebuild      → rebuild.main_handler
  GET  /health       → ok stub
"""
from __future__ import annotations

from common import options_ok, response


def _path(event: dict) -> str:
    # Function URL: requestContext.http.path; API GW: path / rawPath
    p = (
        event.get("rawPath")
        or event.get("path")
        or (event.get("requestContext") or {}).get("http", {}).get("path")
        or "/"
    )
    return p.rstrip("/") or "/"


def main_handler(event, context):
    method = (
        event.get("httpMethod")
        or (event.get("requestContext") or {}).get("http", {}).get("method")
        or "GET"
    ).upper()
    if method == "OPTIONS":
        return options_ok()

    path = _path(event)
    # Accept /login or /cms/login etc.
    leaf = path.split("/")[-1]

    if leaf == "health" and method == "GET":
        return response(200, {"ok": True, "service": "xingze-cms", "stub": True})

    if leaf == "login":
        from login import main_handler as h

        return h(event, context)
    if leaf == "sts":
        from sts import main_handler as h

        return h(event, context)
    if leaf == "rebuild":
        from rebuild import main_handler as h

        return h(event, context)

    return response(404, {"ok": False, "error": "not_found", "path": path})
