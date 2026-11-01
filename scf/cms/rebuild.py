"""POST /rebuild — download data from COS, bake static HTML, upload slim dist to COS.

Hard: always bake HTML + titles/meta/og. Never leave public site as client-fetch shells.
Gate: XZ_GATE default ON (env).
Credentials: TENCENT_SECRET_ID/KEY or DefaultCredentialProvider / SCF execution role.

MVP speed: prefer packaged site/images; do NOT download/re-upload product/finds/mood
image trees (browser PUTs already land images on COS; bake only needs JSON path strings).
"""
from __future__ import annotations

import os
import shutil
import sys
import tempfile
import time
from pathlib import Path

from common import (
    COS_BUCKET,
    COS_REGION,
    bearer_token,
    cloud_credential,
    options_ok,
    response,
    verify_session_token,
)

DATA_KEYS = ["data/products.json", "data/finds.json", "data/hk-agent.json"]
# Bake templates + static assets must live in the function package under site/
SITE_PACKAGE = Path(__file__).resolve().parent / "site"

# Upload allowlist relative to dist/ (skip images/mood, images/products, … every rebuild)
UPLOAD_DIR_PREFIXES = ("css/", "js/", "admin/", "data/", "products/", "finds/", "hk-agent/", "about/")
UPLOAD_ROOT_FILES = {
    "index.html",
    "404.html",
    "robots.txt",
    "favicon.ico",
    "favicon-32.png",
    "apple-touch-icon.png",
    "icon-192.png",
    "share.jpg",
    "share-wide.jpg",
}


def _cos_client():
    from qcloud_cos import CosConfig, CosS3Client

    cred = cloud_credential()
    if cred is None:
        return None

    secret_id = getattr(cred, "secret_id", None) or getattr(cred, "secretId", None)
    secret_key = getattr(cred, "secret_key", None) or getattr(cred, "secretKey", None)
    token = getattr(cred, "token", None)
    if not secret_id or not secret_key:
        return None

    config = CosConfig(
        Region=COS_REGION,
        SecretId=secret_id,
        SecretKey=secret_key,
        Token=token,
        Scheme="https",
    )
    return CosS3Client(config)


def _ms(since: float) -> int:
    return int((time.monotonic() - since) * 1000)


def _should_upload(rel: str) -> bool:
    """Lean allowlist: baked HTML trees + css/js/admin/data + small root assets.
    Skip images/** (mood/wechat/products/finds) — already on COS from site deploy / browser PUT.
    """
    if "__pycache__" in rel or rel.endswith(".pyc"):
        return False
    if rel.startswith("images/") or rel == "images":
        return False
    if rel in UPLOAD_ROOT_FILES:
        return True
    for prefix in UPLOAD_DIR_PREFIXES:
        if rel.startswith(prefix):
            return True
    return False


def _upload_slim(client, local_root: Path) -> int:
    """Upload allowlisted dist files only. Returns count uploaded."""
    n = 0
    for path in local_root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(local_root).as_posix()
        if not _should_upload(rel):
            continue
        ct = None
        if rel.endswith(".html"):
            ct = "text/html; charset=utf-8"
        elif rel.endswith(".css"):
            ct = "text/css; charset=utf-8"
        elif rel.endswith(".js"):
            ct = "application/javascript; charset=utf-8"
        elif rel.endswith(".json"):
            ct = "application/json; charset=utf-8"
        extra = {"ContentType": ct} if ct else {}
        client.upload_file(
            Bucket=COS_BUCKET,
            Key=rel,
            LocalFilePath=str(path),
            **extra,
        )
        n += 1
    return n


def main_handler(event, context):
    method = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method") or "POST").upper()
    if method == "OPTIONS":
        return options_ok()
    if method != "POST":
        return response(405, {"ok": False, "error": "method_not_allowed"})

    token = bearer_token(event)
    if not verify_session_token(token):
        return response(401, {"ok": False, "error": "unauthorized"})

    client = _cos_client()
    if client is None:
        return response(
            501,
            {
                "ok": False,
                "error": "rebuild_not_configured",
                "hint": "Bind SCF execution role with cos:GetObject/PutObject (DefaultCredentialProvider / SCF role), or set TENCENT_SECRET_ID/KEY; package site/ templates into function zip (see README).",
            },
        )

    if not SITE_PACKAGE.is_dir():
        return response(
            501,
            {
                "ok": False,
                "error": "site_package_missing",
                "hint": "Deploy zip must include scf/cms/site/ (css, js, admin, scripts/bake.py, data stubs, images). See scf/cms/README.md pack script.",
            },
        )

    t_all = time.monotonic()
    timings: dict[str, int] = {}
    work = Path(tempfile.mkdtemp(prefix="xz-rebuild-"))
    try:
        # Seed work tree from packaged site templates (includes site/images when packed)
        t = time.monotonic()
        shutil.copytree(SITE_PACKAGE, work, dirs_exist_ok=True)
        timings["seed_ms"] = _ms(t)

        # Overlay live CMS JSON only — bake embeds image *paths* from JSON; binaries
        # stay on COS (browser PUT / prior deploy). Skip COS image prefix walks.
        t = time.monotonic()
        for key in DATA_KEYS:
            dest = work / key
            dest.parent.mkdir(parents=True, exist_ok=True)
            try:
                client.download_file(COS_BUCKET, key, str(dest))
            except Exception as e:
                return response(
                    502,
                    {
                        "ok": False,
                        "error": "download_data_failed",
                        "key": key,
                        "detail": str(e)[:200],
                        "timings": timings,
                    },
                )
        timings["download_data_ms"] = _ms(t)

        # Import bake from packaged scripts/
        scripts_dir = work / "scripts"
        if not (scripts_dir / "bake.py").exists():
            pkg_scripts = Path(__file__).resolve().parent.parent.parent / "scripts"
            if (pkg_scripts / "bake.py").exists():
                scripts_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(pkg_scripts / "bake.py", scripts_dir / "bake.py")

        sys.path.insert(0, str(scripts_dir))
        import bake  # type: ignore

        gate_raw = os.environ.get("XZ_GATE", "1").strip().lower()
        gate = gate_raw not in ("0", "false", "off", "no")
        dist = work / "dist"

        t = time.monotonic()
        bake.build(root=work, dist=dist, gate=gate)
        timings["bake_ms"] = _ms(t)

        # Slim upload: HTML/css/js/admin/data only — not images/**
        t = time.monotonic()
        uploaded = _upload_slim(client, dist)
        timings["upload_ms"] = _ms(t)
        timings["total_ms"] = _ms(t_all)

        return response(
            200,
            {
                "ok": True,
                "gate": gate,
                "bucket": COS_BUCKET,
                "uploaded": uploaded,
                "slim": True,
                "message": "rebuild baked and uploaded (slim: no images/ re-upload)",
                "timings": timings,
            },
        )
    except Exception as e:
        timings["total_ms"] = _ms(t_all)
        return response(
            500,
            {"ok": False, "error": "rebuild_failed", "detail": str(e)[:400], "timings": timings},
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)
