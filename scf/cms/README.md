# 星泽 CMS — SCF (ap-hongkong) stubs

Personal Tencent only · bucket `xingze-1520303651` · site `https://www.xingzestore.com`.

## Handlers (single function router)

| Path | Module | Purpose |
|------|--------|---------|
| `POST /login` | `login.py` | PBKDF2 password → session token |
| `POST /sts` | `sts.py` | session → short STS for data/ + images/ prefixes |
| `POST /rebuild` | `rebuild.py` | download JSON → **bake HTML** → slim upload (no `images/` re-upload); needs SCF timeout ≥180s / 512MB |
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
| `COS_APPID` | optional; derived from bucket suffix (`1520303651`). STS policy ARNs use `uid/{AppId}`, never `uid/*` |
| `CORS_ORIGIN` | `https://www.xingzestore.com` |
| `XZ_GATE` | `1` (default) |
| `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY` | prefer **SCF execution role** instead |
| `STS_DURATION_SECONDS` | `900` |

Generate password hash (local, never commit plaintext):

```bash
python3 -c "from common import hash_password_cli; print(hash_password_cli('YOUR_PASSWORD'))"
```

## Pack & deploy (raw zip)

SCF runtime is **Python 3.9**. `requirements.txt` pins `urllib3<2` + `requests<2.32` so SDK imports do not hit PEP604 (`X | Y`) TypeErrors on 3.9.

Preferred (prunes unused `tencentcloud` products, copies to `xingze-cms-scf.zip` + `dist-artifacts/`):

```bash
# from repo root — uses python3.9 / uv pip when available
bash scripts/pack_scf_cms.sh
# then console-upload zip (see CMS-SCF-REUPLOAD.md); do not git-commit the zip
```

Console: SCF → region **香港** → function **xingze-cms** (Python **3.9**) → upload zip → handler `index.main_handler` → Function URL Auth NONE → env vars → CORS for `https://www.xingzestore.com` only.

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
