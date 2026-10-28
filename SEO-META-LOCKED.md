# Locked SEO meta (do not invent)

Titles / descriptions owned by SEO Specialist. Dev only fills absolute URLs at deploy.

| Page | title | description |
|------|-------|-------------|
| / | 星泽｜水晶·文玩·健康好物·香港代购 | 深圳星泽分享水晶、文玩与健康好物，并可协助香港代购。本站仅介绍，微信线下沟通，不在线收款。 |
| /products/ | 产品｜星泽 | 水晶、文玩与健康好物信息展示；下单请微信沟通。 |
| /finds/ | 好物分享｜星泽 | 近期好物与发现，方便微信转发。 |
| /hk-agent/ | 香港代购｜星泽 | 代购范围与委托说明；微信沟通，本站不收款。 |
| /about/ | 关于 / 联系｜星泽 | 认识星泽，微信咨询产品与香港代购。 |

At deploy: set `hreflang`, `og:url`, and absolute `og:image` (…/share.jpg). Until then leave `og:url` / `hreflang` href empty with TODO(deploy) comments — no fake hostnames.
