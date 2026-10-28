# Locked SEO meta — v3 (temporary copy)

Titles / descriptions for soft-launch. Marked temporary until SEO Specialist revises.
`lang="zh-Hans"`. No `深圳` in home meta. No origin place names (`港区仓储` / `新会核心产区` / `梅江`) in any meta.

| Page | `<title>` / `og:title` | `description` / `og:description` |
|------|------------------------|----------------------------------|
| `/` | 星泽 · Leanne 工作室｜水晶文玩 一物一图 私信询价 | 星泽是 Leanne 的个人工作室，分享水晶、南红、和田玉、沉香等文玩好物，一物一图，香港代购可选。本站仅介绍，不在线收款，微信咨询。 |
| `/products/` | 产品展厅｜星泽 · 水晶文玩一物一图 | 星泽产品展厅：水晶、文玩手串与摆件，每件实物一物一图，私信询价。本站仅介绍，不在线收款。 |
| `/finds/` | 好物分享｜星泽 Leanne 精选 | Leanne 日常挑选的文玩与身心好物分享，附选购心得与保养小贴士。 |
| `/hk-agent/` | 香港代购｜星泽 · 港货正品 微信咨询 | 星泽香港代购：港货正品，流程透明，先沟通后下单。具体服务请微信咨询，本站不在线收款。 |
| `/about/` | 关于星泽｜Leanne 个人工作室 | 了解星泽与 Leanne：选品理念、品质与信任承诺，以及微信咨询方式。 |

## Deploy TODOs
- Leave `hreflang` href and `og:url` **empty** until the live COS / custom-domain URL is known.
- `og:image` = relative `share-wide.jpg` (1200×630) for now. **Moments / WeChat share needs the absolute URL** `https://<domain>/share-wide.jpg` once COS/custom domain is live — do not invent a fake host.
- Favicon set: `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`.

## Build
```
python3 scripts/build.py   # writes complete static site → dist/
```
Upload **`dist/`** contents to COS (see COS-HK-DEPLOY-CHECKLIST.md).
