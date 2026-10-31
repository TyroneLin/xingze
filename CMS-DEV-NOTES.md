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

## Admin UI (Design pack wired)

Routes under `/admin/` (noindex, zh-Hans, jade/ivory):

| Path | Page |
|------|------|
| `/admin/login/` | Password gate |
| `/admin/` | Hub 四入口 |
| `/admin/products/` | List → `/admin/products/edit.html?id=` |
| `/admin/finds/` | List → edit |
| `/admin/hk-agent/` | Whole-page editor |
| `/admin/origins/` | o1/o2/o3 |

- sessionStorage token; redirect to login if missing
- login → POST `/login`; save → STS → browser COS PUT (q-sign sha1 in `js/core.js`, no CDN) → POST `/rebuild`
- `config.js` `scfBase` → live SCF Function URL (Day-1 stub)
- MVP: edit existing items only (create/delete stubbed/disabled)
- Toasts 已保存 / 保存失败; top error banner

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
