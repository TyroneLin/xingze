# 星泽 Phase-2 CMS — approach (2026-10-30)

**PO:** CMS now; soft-launch postponed. Personal Tencent only · Mainland / WeChat OK · near-zero ¥.

## Goal
Leanne (Shenzhen) uploads product images and edits `products` / `finds` / `hk-agent` without a developer. Preview gate stays until real soft-launch.

## Architecture (recommended)

### Write path
1. **Static admin** at `https://www.xingzestore.com/admin/` (zh-Hans, system fonts, WeChat WebView OK).
2. **SCF (ap-hongkong)** HTTP:
   - `POST /login` — check admin password (hash in SCF env) → session token (short JWT or signed cookie).
   - `POST /sts` — after auth → temporary **STS** credentials scoped to:
     - `data/products.json`, `data/finds.json`, `data/hk-agent.json`
     - `images/products/*`, `images/finds/*`, `images/wechat/*` (and mood if needed)
   - **No permanent SecretId/Key in the browser.**
3. Admin browser uses STS to **PUT** JSON + images straight to COS HK `xingze-1520303651`.

### Read / public site (why not “JSON only”)
Today `build.py` **bakes** all list/PDP HTML; `render.js` is chips only. Writing JSON alone would **not** update www.

**Chosen for MVP (LOCKED):** Admin save → SCF **`rebuild`** (shared `scripts/bake.py`) re-uploads `dist` HTML (+ JSON as source of truth on COS).  
Keeps `/products/<id>/` shareable URLs, Moments-friendly HTML, and current gate.

**Hard — NO client-fetch JSON** for public lists/PDP (SEO + Tester would FAIL empty shells for Baidu/Moments). Scaffold commits stubs under `scf/cms/` + `admin/`; Tyrone console unlocks Day-1 (see `CMS-TYRONE-CONSOLE.md`).

### Auth model (Leanne)
- **MVP:** one shared admin password (Tyrone sets; Leanne only). Rate-limit + lockout on SCF.
- Not Google / GitHub / T8. Optional later: WeChat QR login (out of MVP).
- Admin UI `noindex`; still behind preview gate until soft-launch **or** separate stronger admin path password (recommend both gate + admin password while gated).

### Cost
Pay-as-you-go SCF + STS + COS PUT ≈ **¥0–few / month** at Leanne edit volume. No CDN pack required for admin.

## Out of scope (MVP)
- 繁體, real payment, multi-user RBAC, phone OTP, full WYSIWYG
- Merging page-to-page motion
- Removing preview gate

## Calendar estimate
| Slice | Days | Notes |
|---|---|---|
| SCF login + STS + CAM role smoke | 1 | Needs Tyrone console enable |
| `/admin` scaffold + products edit + image upload | 2 | Parallel Design light mock |
| finds + hk-agent editors | 1 | Same patterns |
| SCF rebuild bake → COS HTML | 1–2 | Critical for live pages |
| Buffer / WeChat smoke / gate check | 1 | |
| **Total to Leanne-usable** | **~5–7 working days** | After Tyrone unlocks SCF/CAM |

Soft-launch re-date ≈ **CMS ready + Leanne content fill + Tester Mainland gate** → plan **CMS + ~1–2 weeks content**, not the old 11-18 fixed day.

## Need from Tyrone (unblock Day 1)
1. **Enable SCF** on personal account, region **ap-hongkong** (HTTP trigger / function URL OK).
2. **CAM:** role for SCF + policy for STS AssumeRole limited to bucket prefixes above (no `*` write on whole account).
3. **Admin password** (Tyrone chooses; Dev stores hash in SCF env only — never chat plaintext long-term).
4. Confirm **Leanne = sole editor** for MVP (shared password OK).
5. Approve **Design light admin mock** before polish (PM/Designer track).

## Scaffolding order
1. ✅ SCF stubs + `/admin` scaffold + shared `bake.py` (this commit) — smoke waits Tyrone unlock
2. STS + COS PUT wire + image upload after console
3. Rebuild hook live test on www (gate ON)
4. finds / hk-agent editors
5. Designer UI polish wire

## Hard rules
Personal only (`tyronehoi` / TyroneLin / personal Tencent). Never tmwinno / T8. No invented WeChat IDs in CMS defaults.
