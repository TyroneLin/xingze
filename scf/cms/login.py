"""POST /login — verify admin password → short session token.

Env: ADMIN_PASSWORD_HASH, SESSION_SECRET, CORS_ORIGIN
Stub: returns 503 until hashes are set (no real password in repo).
"""
from __future__ import annotations

from common import (
    make_session_token,
    options_ok,
    parse_body,
    response,
    verify_password,
)


def main_handler(event, context):
    method = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method") or "POST").upper()
    if method == "OPTIONS":
        return options_ok()
    if method != "POST":
        return response(405, {"ok": False, "error": "method_not_allowed"})

    body = parse_body(event)
    password = (body.get("password") or "").strip()
    if not password:
        return response(400, {"ok": False, "error": "password_required"})

    if not verify_password(password):
        # Same message whether unset hash or wrong password (avoid leaking stub state loudly)
        return response(401, {"ok": False, "error": "unauthorized"})

    token = make_session_token("leanne")
    return response(200, {"ok": True, "token": token, "expiresIn": 3600})
