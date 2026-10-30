"""Shared helpers for 星泽 CMS SCF handlers (ap-hongkong)."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any

# CORS: public site origin only (personal COS custom domain).
ALLOW_ORIGIN = os.environ.get("CORS_ORIGIN", "https://www.xingzestore.com")

# Session HMAC secret (Tyrone sets in SCF env). Placeholder until console unlock.
SESSION_SECRET = os.environ.get("SESSION_SECRET", "REPLACE_SESSION_SECRET")
# PBKDF2 hash of admin password: salt$hash_hex (see CMS-DEV-NOTES.md to generate).
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH", "REPLACE_ADMIN_PASSWORD_HASH")
# CAM role ARN for STS AssumeRole (Tyrone creates).
CMS_STS_ROLE_ARN = os.environ.get("CMS_STS_ROLE_ARN", "REPLACE_CMS_STS_ROLE_ARN")
# Optional: SCF uses its own role; SecretId/Key only if not using instance role.
TENCENT_SECRET_ID = os.environ.get("TENCENT_SECRET_ID", "")
TENCENT_SECRET_KEY = os.environ.get("TENCENT_SECRET_KEY", "")
COS_BUCKET = os.environ.get("COS_BUCKET", "xingze-1520303651")
COS_REGION = os.environ.get("COS_REGION", "ap-hongkong")
STS_DURATION = int(os.environ.get("STS_DURATION_SECONDS", "900"))  # 15 min
SESSION_TTL = int(os.environ.get("SESSION_TTL_SECONDS", "3600"))


def cors_headers() -> dict[str, str]:
    return {
        "Access-Control-Allow-Origin": ALLOW_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "600",
        "Content-Type": "application/json; charset=utf-8",
    }


def response(status: int, body: dict[str, Any]) -> dict:
    return {
        "statusCode": status,
        "headers": cors_headers(),
        "body": json.dumps(body, ensure_ascii=False),
    }


def options_ok() -> dict:
    return {"statusCode": 204, "headers": cors_headers(), "body": ""}


def parse_body(event: dict) -> dict:
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        import base64

        raw = base64.b64decode(raw).decode("utf-8")
    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode("utf-8")
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        return {}


def verify_password(password: str) -> bool:
    """Verify against ADMIN_PASSWORD_HASH = salt_hex$iterations$hash_hex (PBKDF2-SHA256)."""
    stored = ADMIN_PASSWORD_HASH.strip()
    if not stored or stored.startswith("REPLACE_"):
        return False
    try:
        salt_hex, iter_s, hash_hex = stored.split("$", 2)
        iterations = int(iter_s)
        salt = bytes.fromhex(salt_hex)
        expect = bytes.fromhex(hash_hex)
    except (ValueError, TypeError):
        return False
    got = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations, dklen=32
    )
    return hmac.compare_digest(got, expect)


def make_session_token(sub: str = "leanne") -> str:
    """Unsigned-looking token: base64(payload).hmac — stub until real JWT if needed."""
    import base64

    exp = int(time.time()) + SESSION_TTL
    payload = json.dumps({"sub": sub, "exp": exp}, separators=(",", ":")).encode()
    b64 = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    sig = hmac.new(
        SESSION_SECRET.encode("utf-8"), b64.encode("utf-8"), hashlib.sha256
    ).hexdigest()[:32]
    return f"{b64}.{sig}"


def verify_session_token(token: str | None) -> bool:
    import base64

    if not token or SESSION_SECRET.startswith("REPLACE_"):
        return False
    try:
        b64, sig = token.split(".", 1)
    except ValueError:
        return False
    expect = hmac.new(
        SESSION_SECRET.encode("utf-8"), b64.encode("utf-8"), hashlib.sha256
    ).hexdigest()[:32]
    if not hmac.compare_digest(sig, expect):
        return False
    pad = "=" * (-len(b64) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(b64 + pad))
    except (ValueError, json.JSONDecodeError):
        return False
    return int(payload.get("exp", 0)) >= int(time.time())


def bearer_token(event: dict) -> str | None:
    headers = event.get("headers") or {}
    # API Gateway / Function URL may lower-case headers
    auth = headers.get("Authorization") or headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    body = parse_body(event)
    return body.get("token")


def hash_password_cli(password: str, iterations: int = 200_000) -> str:
    """Helper for Tyrone: print salt$iterations$hash for SCF env."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations, dklen=32
    )
    return f"{salt.hex()}${iterations}${digest.hex()}"
