# 星泽 CMS — Dev notes

## Architecture

```
Leanne browser  →  /admin/ (static on COS www)
                 →  SCF POST /login  → session token
                 →  SCF POST /sts    → temp COS keys (prefixes only)
                 →  COS PUT data/*.json + images/{products,finds,wechat}/*
                 →  SCF POST /rebuild → download JSON → bake.py → upload HTML/css/js/admin
Visitor         →  baked static HTML only (gate ON until soft-launch)
```

**Hard:** public lists/PDP are **never** client-fetch JSON. SEO/Tester require complete HTML + title/description/og.

Personal stack only: COS HK `xingze-1520303651`, SCF `ap-hongkong`, domain `www.xingzestore.com`.

## Repo layout

| Path | Role |
|------|------|
| `scripts/bake.py` | Shared bake (CLI + SCF). `build(root=, dist=, gate=)` |
| `scripts/build.py` | Thin CLI → `bake.build()` |
| `admin/` | Static CMS UI → copied to `dist/admin/` |
| `scf/cms/` | Python handlers: `index` / `login` / `sts` / `rebuild` |
| `CMS-PHASE2-APPROACH.md` | Product approach + calendar |
| `CMS-TYRONE-CONSOLE.md` | Day-1 console clicks |
| `data/*.json` | CMS source of truth (also on COS) |

## Env vars

See `CMS-TYRONE-CONSOLE.md` and `scf/cms/README.md`. Placeholders `REPLACE_*` mean not live yet.

## Local bake

```bash
cd /path/to/leanne-website   # or xingze clone
XZ_GATE=1 python3 scripts/build.py
# → dist/ including dist/admin/
```

Gate default ON. `XZ_GATE=0` only when soft-launch approved.

### Hash helper

```bash
cd scf/cms && python3 -c "from common import hash_password_cli; print(hash_password_cli('secret'))"
```

### SCF local health

```bash
cd scf/cms
python3 -c "from index import main_handler; print(main_handler({'httpMethod':'GET','path':'/health'}, None))"
```

## Admin JS status

- Login / sessionStorage token / products list from `/data/products.json` — scaffolded
- STS call shape — ready; returns 501 until `CMS_STS_ROLE_ARN`
- Browser COS PUT — **TODO**: vendor `cos-js-sdk-v5` under `admin/js/vendor/` (no CDN) or small AWS-sign-v4 helper; until then Save shows a clear error after STS
- finds / hk-agent editors — next slice (same patterns)
- Design light mock — polish before Leanne handoff

## Rebuild package

`rebuild.py` expects `scf/cms/site/` inside the deployed zip (css, js, admin, scripts/bake.py, data, images…). Pack steps in `scf/cms/README.md`.

## Motion

Base in-page motion (`1c03fde`) stays. Do **not** merge page-to-page leave/enter pack.

## Security notes

- Preview gate + admin password while gated
- CORS allowlist www only
- STS policy prefixes only — no bucket-wide `*`
- `noindex` on admin pages
- Never invent WeChat IDs in CMS defaults
