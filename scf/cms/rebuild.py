"""POST /rebuild — download data(+assets) from COS, bake static HTML, upload to COS.

Hard: always bake HTML + titles/meta/og. Never leave public site as client-fetch shells.
Gate: XZ_GATE default ON (env).
Credentials: TENCENT_SECRET_ID/KEY or DefaultCredentialProvider / SCF execution role.
"""
from __future__ import annotations

import os
import shutil
import sys
import tempfile
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


def _download_prefix(client, prefix: str, dest: Path):
    marker = ""
    while True:
        resp = client.list_objects(Bucket=COS_BUCKET, Prefix=prefix, Marker=marker, MaxKeys=200)
        for obj in resp.get("Contents") or []:
            key = obj["Key"]
            if key.endswith("/"):
                continue
            local = dest / key
            local.parent.mkdir(parents=True, exist_ok=True)
            client.download_file(COS_BUCKET, key, str(local))
        if not resp.get("IsTruncated"):
            break
        marker = resp.get("NextMarker") or (resp.get("Contents") or [{}])[-1].get("Key", "")


def _upload_tree(client, local_root: Path, key_prefix: str = ""):
    for path in local_root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(local_root).as_posix()
        key = f"{key_prefix}{rel}" if key_prefix else rel
        # Skip baking workdirs / pyc
        if "__pycache__" in rel or rel.endswith(".pyc"):
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
            Key=key,
            LocalFilePath=str(path),
            **extra,
        )


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

    work = Path(tempfile.mkdtemp(prefix="xz-rebuild-"))
    try:
        # Seed work tree from packaged site templates
        shutil.copytree(SITE_PACKAGE, work, dirs_exist_ok=True)
        # Overlay live CMS data (+ optional new images) from COS
        for key in DATA_KEYS:
            dest = work / key
            dest.parent.mkdir(parents=True, exist_ok=True)
            try:
                client.download_file(COS_BUCKET, key, str(dest))
            except Exception as e:
                return response(502, {"ok": False, "error": "download_data_failed", "key": key, "detail": str(e)[:200]})

        for prefix in ("images/products/", "images/finds/", "images/wechat/"):
            try:
                _download_prefix(client, prefix, work)
            except Exception:
                pass  # empty prefixes OK

        # Import bake from packaged scripts/
        scripts_dir = work / "scripts"
        if not (scripts_dir / "bake.py").exists():
            # fallback: copy bake from package sibling
            pkg_scripts = Path(__file__).resolve().parent.parent.parent / "scripts"
            if (pkg_scripts / "bake.py").exists():
                scripts_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(pkg_scripts / "bake.py", scripts_dir / "bake.py")

        sys.path.insert(0, str(scripts_dir))
        import bake  # type: ignore

        gate_raw = os.environ.get("XZ_GATE", "1").strip().lower()
        gate = gate_raw not in ("0", "false", "off", "no")
        dist = work / "dist"
        bake.build(root=work, dist=dist, gate=gate)

        # Upload baked HTML/css/js/admin/data (not necessarily re-upload all mood images)
        upload_roots = [
            ("", dist),  # full dist → bucket root
        ]
        for _, local in upload_roots:
            _upload_tree(client, local)

        return response(
            200,
            {
                "ok": True,
                "gate": gate,
                "bucket": COS_BUCKET,
                "message": "rebuild baked and uploaded",
            },
        )
    except Exception as e:
        return response(500, {"ok": False, "error": "rebuild_failed", "detail": str(e)[:400]})
    finally:
        shutil.rmtree(work, ignore_errors=True)
