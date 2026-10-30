# 星泽 CMS — SCF (ap-hongkong) stubs

Personal Tencent only · bucket `xingze-1520303651` · site `https://www.xingzestore.com`.

## Handlers (single function router)

| Path | Module | Purpose |
|------|--------|---------|
| `POST /login` | `login.py` | PBKDF2 password → session token |
| `POST /sts` | `sts.py` | session → short STS for data/ + images/ prefixes |
| `POST /rebuild` | `rebuild.py` | download JSON → **bake HTML** → upload COS |
| `GET /health` | `index.py` | smoke |

Entry: `index.main_handler` (Function URL or API Gateway).

## Hard rules

- Public site **must** be baked HTML (titles/meta/og). **No** client-fetch JSON lists/PDP.
- Preview gate default **ON** (`XZ_GATE=1`).
- No permanent SecretId/Key in browser — STS only after login.
- CORS origin: `https://www.xingzestore.com` only.

## Env vars (set in SCF console — see CMS-TYRONE-CONSOLE.md)

| Var | Example / notes |
|-----|-----------------|
| `ADMIN_PASSWORD_HASH` | `salt_hex$200000$hash_hex` (PBKDF2-SHA256) |
| `SESSION_SECRET` | long random string |
| `CMS_STS_ROLE_ARN` | `qcs::cam::uin/…:roleName/xingze-cms-sts` |
| `COS_BUCKET` | `xingze-1520303651` |
| `COS_REGION` | `ap-hongkong` |
| `CORS_ORIGIN` | `https://www.xingzestore.com` |
| `XZ_GATE` | `1` (default) |
| `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY` | prefer **SCF execution role** instead |
| `STS_DURATION_SECONDS` | `900` |

Generate password hash (local, never commit plaintext):

```bash
python3 -c "from common import hash_password_cli; print(hash_password_cli('YOUR_PASSWORD'))"
```

## Pack & deploy (raw zip)

From repo root after `python3 scripts/build.py` is not required for pack — pack **source** templates:

```bash
# from repo root
rm -rf /tmp/xz-cms-pack && mkdir -p /tmp/xz-cms-pack
cp scf/cms/*.py scf/cms/requirements.txt /tmp/xz-cms-pack/
# site templates for rebuild bake
mkdir -p /tmp/xz-cms-pack/site
cp -R css js data admin scripts/bake.py /tmp/xz-cms-pack/site/
mkdir -p /tmp/xz-cms-pack/site/scripts
mv /tmp/xz-cms-pack/site/bake.py /tmp/xz-cms-pack/site/scripts/bake.py
# optional: mood/images subset so bake has placeholders
cp -R images /tmp/xz-cms-pack/site/ 2>/dev/null || true
# root assets used by bake
cp favicon.ico favicon-32.png apple-touch-icon.png icon-192.png share.jpg share-wide.jpg robots.txt /tmp/xz-cms-pack/site/ 2>/dev/null || true
# deps into package (SCF Python)
pip3 install -r scf/cms/requirements.txt -t /tmp/xz-cms-pack/
cd /tmp/xz-cms-pack && zip -r /tmp/xingze-cms-scf.zip . -x '*.pyc' -x '*/__pycache__/*'
```

Console: SCF → region **香港** → create function (Python 3.9+) → upload zip → handler `index.main_handler` → enable **函数URL** (Auth: NONE + rely on admin password) or API Gateway → set env vars → CORS on URL/Gateway for `https://www.xingzestore.com`.

## Serverless Framework (optional later)

Not required for MVP. Raw zip + console is enough for near-zero cost personal account.

## Local smoke (no Tencent)

```bash
cd scf/cms
python3 -c "from index import main_handler; print(main_handler({'httpMethod':'GET','path':'/health'}, None))"
# login returns 401 until ADMIN_PASSWORD_HASH is set
```

## Blocked on Tyrone

Enable SCF HK, CAM role + STS policy, admin password hash, Function URL. Until then handlers return **501** / **401** by design — stubs are safe to commit.
