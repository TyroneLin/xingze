#!/usr/bin/env python3
"""Build-time render: bake data/*.json into complete static HTML under dist/.

Source of truth:
  - data/*.json  → list content (products, finds, hk-agent)
  - css/style.css, js/render.js (chip filters ONLY) → copied to dist/
  - SEO titles/descriptions locked in this file (see SEO-META-LOCKED.md)
  - root assets (favicon*, share*.jpg, apple-touch-icon, icon-192) → copied to dist/

No runtime fetch of JSON. Pages are complete with JS disabled.
Run: python3 scripts/build.py
"""
from __future__ import annotations
import html, json, os, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
E = html.escape
PH = "待 Leanne 素材"

# --- Locked v3 SEO (temporary copy until SEO Specialist revises) ---
SEO = {
    "home": {
        "title": "星泽 · Leanne 工作室｜水晶文玩 一物一图 私信询价",
        "desc": "星泽是 Leanne 的个人工作室，分享水晶、南红、和田玉、沉香等文玩好物，一物一图，香港代购可选。本站仅介绍，不在线收款，微信咨询。",
        "path": "/",
    },
    "products": {
        "title": "产品展厅｜星泽 · 水晶文玩一物一图",
        "desc": "星泽产品展厅：水晶、文玩手串与摆件，每件实物一物一图，私信询价。本站仅介绍，不在线收款。",
        "path": "/products/",
    },
    "finds": {
        "title": "好物分享｜星泽 Leanne 精选",
        "desc": "Leanne 日常挑选的文玩与身心好物分享，附选购心得与保养小贴士。",
        "path": "/finds/",
    },
    "hk-agent": {
        "title": "香港代购｜星泽 · 港货正品 微信咨询",
        "desc": "星泽香港代购：流程透明，先沟通后下单。具体服务请微信咨询，本站不在线收款。",
        "path": "/hk-agent/",
    },
    "about": {
        "title": "关于星泽｜Leanne 个人工作室",
        "desc": "了解星泽与 Leanne：选品理念、品质与信任承诺，以及微信咨询方式。",
        "path": "/about/",
    },
    "404": {
        "title": "页面未找到｜星泽",
        "desc": "",
        "path": "/",
    },
}

NAV = [
    ("", "首页"),
    ("products/", "产品"),
    ("finds/", "好物分享"),
    ("hk-agent/", "香港代购"),
    ("about/", "关于星泽"),
]


def load_json(name: str):
    return json.loads((ROOT / "data" / f"{name}.json").read_text(encoding="utf-8"))


def origin_span(name: str) -> str:
    return f'<span class="swap" data-swap="origin" title="产地名待 Leanne 确认">{E(name)}</span>'


def swap_span(text: str, kind: str, title: str = "文案待 Leanne 确认") -> str:
    return f'<span class="swap" data-swap="{kind}" title="{E(title)}">{E(text)}</span>'


def apply_origins(text: str, origins: dict) -> str:
    def repl(m):
        return origin_span(origins[m.group(1)])

    return re.sub(r"\{(o\d)\}", repl, E(text))


def ph(cap: str = "", extra_class: str = "") -> str:
    cls = "ph" + (f" {extra_class}" if extra_class else "")
    cap_html = f'<span class="ph-c">{E(cap)}</span>' if cap else ""
    return (
        f'<div class="{cls}" role="img" aria-label="{PH}">'
        f'<span class="ph-t">{PH}</span>{cap_html}</div>'
    )


def chips(categories: dict, label: str) -> str:
    bits = []
    for k, v in categories.items():
        on = " on" if k == "all" else ""
        bits.append(
            f'<button type="button" class="chip{on}" data-filter="{E(k)}">{E(v)}</button>'
        )
    return f'<div class="chips" role="tablist" aria-label="{E(label)}">{"".join(bits)}</div>'


def product_card(it: dict, origins: dict) -> str:
    tags = "".join(
        f'<span class="tag">{apply_origins(t, origins)}</span>' for t in it["tags"]
    )
    return (
        f'<article class="card" data-cat="{E(it["category"])}">'
        f'{ph(it.get("imageAlt") if it.get("imageAlt") and it.get("imageAlt") != PH else "")}'
        f'<div class="card-b"><div class="tags">{tags}</div>'
        f'<p class="meta">{apply_origins(it["spec"], origins)} · 编号 {E(it["id"])}</p>'
        f'<h3>{E(it["title"])}</h3><p>{E(it["desc"])}</p>'
        f'<div class="card-f"><span class="muted">纯私域交流 · 无线上标价</span>'
        f'<a class="btn sm" href="#wechat">{E(it["cta"])} →</a></div></div></article>'
    )


def find_card(it: dict) -> str:
    ims = "".join(ph(i.get("alt") or "") for i in it["images"])
    tags = "".join(f'<span class="tag">{E(t)}</span>' for t in it["tags"])
    return (
        f'<article class="post" data-cat="{E(it["category"])}">'
        f'<header><span class="avatar" aria-hidden="true">泽</span>'
        f'<div><strong>Leanne @星泽</strong> <span class="tag">主理人</span>'
        f'<p class="meta">{E(it["location"])} · {E(it["time"])}</p></div></header>'
        f'<p>{E(it["text"])}</p>'
        f'<div class="post-im n{len(it["images"])}">{ims}</div>'
        f'<div class="tags">{tags}</div>'
        f'<a class="btn ghost sm" href="#wechat">与 Leanne 聊聊</a></article>'
    )


def head(key: str, pre: str) -> str:
    s = SEO[key]
    fav = f"{pre}favicon.ico"
    fav32 = f"{pre}favicon-32.png"
    touch = f"{pre}apple-touch-icon.png"
    share = f"{pre}share-wide.jpg"  # 1200×630 og image (temporary)
    css = f"{pre}css/style.css"
    meta_desc = ""
    if s["desc"]:
        meta_desc = (
            f'\n  <meta name="description" content="{E(s["desc"])}">'
            f'\n  <meta property="og:title" content="{E(s["title"])}">'
            f'\n  <meta property="og:description" content="{E(s["desc"])}">'
        )
    else:
        meta_desc = '\n  <meta name="robots" content="noindex">'
    return f"""<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- TODO(deploy): set hreflang + og:url to the live COS / custom-domain absolute URL (e.g. https://www.example.com{s["path"]}). Leave empty until then. -->
  <link rel="alternate" hreflang="zh-Hans" href="">
  <!-- zh-Hant TBD · SEO copy temporary until Specialist revises -->
  <title>{E(s["title"])}</title>{meta_desc}
  <meta property="og:type" content="website">
  <!-- TODO(deploy): og:url absolute live URL -->
  <meta property="og:url" content="">
  <!-- TODO(deploy): og:image absolute live URL ending in /share-wide.jpg -->
  <meta property="og:image" content="{share}">
  <link rel="icon" href="{fav}" type="image/x-icon">
  <link rel="icon" href="{fav32}" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="{touch}">
  <link rel="stylesheet" href="{css}">
</head>"""


def shell(key: str, pre: str, cur: str, main: str) -> str:
    navs = "".join(
        f'<a href="{pre}{h}"{" aria-current=page" if h == cur else ""}>{t}</a>'
        for h, t in NAV
    )
    brand = pre or "./"
    return f"""{head(key, pre)}
<body>
<header class="top"><div class="wrap top-in"><a class="brand" href="{brand}"><b>星泽</b><span>天然晶石 · 东方文玩 · 港澳专柜代采</span></a><nav class="nav" aria-label="主导航">{navs}</nav><a class="btn sm top-cta" href="#wechat">微信咨询</a></div></header>
<main>{main}</main>
<section id="wechat" class="wrap wx-note"><h2>微信咨询</h2><p>主理人 Leanne 一对一亲复。微信号 / 二维码：<strong>待 CTA</strong>（待 Leanne 提供，本站不展示虚构微信号）。</p></section>
<footer class="foot"><div class="wrap foot-g"><div><b>星泽 Xingze Studio</b><p class="muted">主理人 · Leanne</p><p>深港两地往返巡鉴，专注文玩晶石真品品鉴与港澳正品专柜买手直采。一物一图，宁缺毋滥。</p></div><div><p>深圳 · 香港（地址待 Leanne 确认）</p><p class="muted">全站藏品仅供美学品鉴与定向预约，微信点对点发图。</p></div><div><p class="foot-lock">本站仅介绍，不在线收款</p><p class="muted">© 2026 星泽 Xingze Studio</p></div></div></footer>
<a class="sticky-cta" href="#wechat" aria-label="微信咨询（待 CTA）">微信咨询</a>
<script src="{pre}js/render.js" defer></script>
</body>
</html>
"""


def sh(eyebrow: str, title: str, sub: str = "") -> str:
    sub_h = f'<p class="muted">{sub}</p>' if sub else ""
    return f'<div class="sh"><span class="eyebrow">{eyebrow}</span><h2>{title}</h2>{sub_h}</div>'


TRUST = [
    ("实体工作室质检", "每一件发货前均经 Leanne 亲自验货打理。", "01 / STUDIO"),
    ("港澳专柜正品", "坚持专柜采购原装小票，链路清晰透明。", "02 / HK TRACEABILITY"),
    ("一物一拍呈现", "拒绝滤镜，微距多角度，所见即所得。", "03 / REAL VIEW"),
    ("私密专属顾问", "一对一沟通佩戴心境与日常盘玩养护。", "04 / ADVISORY"),
]


def trust_html() -> str:
    return (
        '<div class="g4">'
        + "".join(
            f'<div class="box"><h3>{a}</h3><p>{b}</p><span class="meta">{c}</span></div>'
            for a, b, c in TRUST
        )
        + "</div>"
    )


def write(rel: str, content: str):
    path = DIST / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print("wrote", rel)


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    pj, fj, hj = load_json("products"), load_json("finds"), load_json("hk-agent")
    origins = pj.get("origins", {})

    # --- home ---
    home_cards = "".join(product_card(i, origins) for i in pj["items"][:6])
    home = f"""<section class="wrap hero"><div class="hero-t"><span class="eyebrow">私域品鉴 · Shenzhen &amp; Hong Kong Atelier</span><h1>星泽 · Leanne 工作室</h1><p class="meta">精选工坊（地点待 Leanne 确认） / 港澳常驻代采</p><p>专注天然能量晶石、传世文玩雅件与身心调养好物。坚持实物一物一图、实体工坊现货品控、港澳专柜源头采买。纯私域交流与品鉴，无线上购物车。</p><div class="hero-k"><div class="box"><b>一物一图</b><span class="muted">实体工作室现货</span></div><div class="box"><b>港澳小票</b><span class="muted">专柜采买溯源小票</span></div></div></div><div class="hero-v">{ph("陈列空间 · 港澳专柜选品动态（地点待 Leanne 确认）","hero-ph")}<p class="muted sm">宁缺毋滥，每期私享仅呈精粹 · 支持预约同城上手品赏</p></div></section>
<section class="wrap sec">{sh("Curation Showcase","精选雅蓄 · 藏品展席","静心筛选 · 寻觅心仪眼缘")}{chips(pj["categories"],"藏品分类")}<div class="grid" data-filter-target="products">{home_cards}</div><p class="more"><a class="btn ghost" href="products/">查看全部产品 →</a></p></section>
<section class="band"><div class="wrap sec">{sh("Bespoke Journey","定制与交流流程","以文人会友的从容态度，通过一对一私享交流完成鉴赏与托付。")}<div class="g3"><div class="box step"><span class="num">01</span><h3>咨询沟通</h3><p>沟通心仪品类、预算或香港代购需求。</p></div><div class="box step"><span class="num">02</span><h3>细节确认</h3><p>一物一视频、自然光无滤镜细节，核对尺寸重量。</p></div><div class="box step"><span class="num">03</span><h3>安心发货</h3><p>顺丰保价，防震包装，港澳直邮附专柜小票。</p></div></div></div></section>
<section class="wrap sec">{sh("Authenticity &amp; Sincerity","品质与信任背书","四大承诺为每一份相遇护航。")}{trust_html()}<div class="notice"><b>鉴赏提示与温馨约定</b><p>本站仅作好物收录与交流展示，所有选购咨询请通过微信与 Leanne 沟通。</p></div></section>"""
    write("index.html", shell("home", "", "", home))

    # --- products ---
    all_cards = "".join(product_card(i, origins) for i in pj["items"])
    prod = f"""<section class="wrap phead"><span class="eyebrow">Xingze Curated Collection / 现物鉴赏库</span><h1>产品</h1><p class="lead">深港双城私藏 · 一物一相 · 静待有缘人品鉴</p><p>水晶、文玩与健康好物信息展示。星泽不设购物车，所有展出之器皆由主理人 Leanne 亲采挑验，一物一图；价格请通过微信咨询确认。</p></section>
<section class="wrap sec">{chips(pj["categories"],"藏品分类")}<div class="grid g-4" data-filter-target="products">{all_cards}</div></section>
<section class="band"><div class="wrap sec">{sh("鉴赏与信任守则","为何坚持私信咨询，而非直接标价付款？","天然物华独一无二，克重、纹理与成色皆需在自然光下细审。")}{trust_html()}</div></section>"""
    write("products/index.html", shell("products", "../", "products/", prod))

    # --- finds ---
    feed = "".join(find_card(i) for i in fj["items"])
    finds = f"""<section class="wrap phead"><span class="eyebrow">主理人手记 · Curator's Journal</span><h1>好物分享</h1><p class="lead">随笔 · 结缘 · 巡鉴手札</p><p>主理人随笔、藏品日常与选品心境。每一帧皆是工坊自然光下的真实触感。</p></section>
<section class="wrap sec split"><div>{chips(fj["categories"],"动态分类")}<div class="feed" data-filter-target="finds">{feed}</div><p class="muted c">更多私藏可在微信与主理人交流</p></div><aside class="side"><div class="box"><h2>Leanne 主理人</h2><p class="muted">深港双城巡鉴买手 · 晶石文玩品赏人</p><p>“坚持一物一相、真品实测，宁缺毋滥。”</p><a class="btn sm" href="#wechat">微信咨询主理人</a></div><div class="box"><h3>热门随笔话题</h3><ul class="list"><li>#极光23 能量解析</li><li>#雕件把玩指南</li><li>#香港专柜周度采买</li></ul></div></aside></section>"""
    write("finds/index.html", shell("finds", "../", "finds/", finds))

    # --- hk-agent (fully baked) ---
    badges = "".join(f'<span class="tag">{E(b)}</span>' for b in hj["badges"])
    steps = "".join(
        f'<div class="box step"><span class="num">{E(s["n"])}</span>'
        f'<h3>{swap_span(s["title"], "hk-step-title")}</h3>'
        f'<p>{E(s["text"])}</p></div>'
        for s in hj["steps"]
    )
    standards = "".join(
        f'<div class="box"><h3>{E(s["title"])}</h3><p>{E(s["text"])}</p>'
        f'<span class="meta">{E(s["tag"])}</span></div>'
        for s in hj["standards"]
    )
    faq = "".join(
        f'<details><summary>{E(f["q"])}</summary><p>{E(f["a"])}</p></details>'
        for f in hj["faq"]
    )
    hk = f"""<section class="wrap phead hk-hero"><div><span class="eyebrow">深港专线 · 专柜正品</span><h1>香港代购</h1><p class="lead">深港每周往返直采 · 专柜原装小票 · 一对一私域寻物</p><p><a class="btn" href="#wechat">发起专柜寻物咨询</a> <a class="btn ghost" href="#flow">浏览采买流程 ↓</a></p><div class="tags">{badges}</div></div>{ph("香港专柜现场采买纪实预留位")}</section>
<section class="wrap sec">{sh("Curator's Notes","诚意受托，如己所买")}<p>我是 Leanne，常年定居深圳并规律往返深港，受同频知己所托代理采购香港专柜名品。每一份委托均附 <strong>专柜现场打印小票原件随箱交付</strong>，绝不经由未知拼单或水货渠道。</p></section>
<section class="band" id="flow"><div class="wrap sec">{sh("Sourcing Workflow","标准代采流程 · 5步安心托付")}<div class="g5">{steps}</div></div></section>
<section class="wrap sec">{sh("Standard &amp; Timeline","费用与时效标准","具体品类代购费用与排期请以微信沟通确认为主。")}<div class="g4">{standards}</div></section>
<section class="wrap sec">{sh("FAQ","常见疑问与须知")}<div class="faq">{faq}</div></section>"""
    write("hk-agent/index.html", shell("hk-agent", "../", "hk-agent/", hk))

    # --- about ---
    P4 = [
        ("天然真物 · 宁缺毋滥", "严选天然原矿与陈化老料，高阶藏品可复检。"),
        ("诚意受托 · 如己所买", "代采保留专柜机打原件凭证，随原盒交付。"),
        ("一物一拍 · 真实克重", "晴日自然光一物一拍，提供尺寸克重视频，瑕疵明示。"),
        ("私域结缘 · 慢盘相伴", "不设购物车，每一桩结缘源于微信详尽沟通。"),
    ]
    about = f"""<section class="wrap phead"><span class="eyebrow">主理人手记 · 品牌初心</span><h1>关于星泽</h1><p class="lead">深港双城寻石问器 · 慢盘静赏 · 诚意受托，如己所买</p></section>
<section class="wrap sec split2">{ph("主理人工作台席与矿石自然光实拍")}<div><span class="eyebrow">Chapter 01 · 执念与缘起</span><p>创立「星泽」，源于一段漫长的随心寻石之旅。因喜好天然矿石的温润与老料文玩的沉静，最初仅为自己与同好挚友寻觅称心雅物。</p><p>市面流水线化泛滥，我们愈发坚持“慢下来”，专注“一物一图、宁缺毋滥”的双城私域工作室。</p><blockquote>“器物寻到了懂它的人，便是最好的归宿。”<cite>— 星泽主理人 Leanne</cite></blockquote></div></section>
<section class="band"><div class="wrap sec split2"><div><span class="eyebrow">Chapter 02 · 实体空间</span><h2>深圳工坊 · 品鉴茶室</h2><p class="meta">深圳工作室（地点待 Leanne 确认）</p><p>实体工作空间是代采藏品的分拣复验落脚点，也是可预约到访的茶室，常备自然光照台与放大镜。</p></div>{ph("工坊采光角、选品茶席（待 Leanne 素材）")}</div></section>
<section class="wrap sec">{sh("Principles","立业之本 · 核心守则")}<div class="g4">{"".join(f'<div class="box"><span class="meta">Principle 0{i+1}</span><h3>{a}</h3><p>{b}</p></div>' for i,(a,b) in enumerate(P4))}</div></section>
<section class="wrap sec c"><h2>结缘与沟通</h2><p>如需鉴赏藏品、了解深港代买排期或预约工坊，欢迎与主理人交流。</p><a class="btn" href="#wechat">微信咨询主理人</a><p class="muted sm">工作时段：待 Leanne 确认</p></section>"""
    write("about/index.html", shell("about", "../", "about/", about))

    # --- 404 ---
    nf = '<section class="wrap phead c"><h1>页面未找到</h1><p>您访问的页面不存在或已移动。</p><p><a class="btn" href="/">返回首页</a> <a class="btn ghost" href="/products/">看看产品</a></p></section>'
    write("404.html", shell("404", "/", "", nf))

    # --- static assets ---
    (DIST / "css").mkdir(parents=True, exist_ok=True)
    (DIST / "js").mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "css" / "style.css", DIST / "css" / "style.css")
    shutil.copy2(ROOT / "js" / "render.js", DIST / "js" / "render.js")
    # data/ optional for CMS later
    shutil.copytree(ROOT / "data", DIST / "data")
    if (ROOT / "images").exists():
        shutil.copytree(ROOT / "images", DIST / "images")
    else:
        (DIST / "images").mkdir()

    assets_src = Path("/workspace/xingze-v3-assets")
    for name in [
        "favicon.ico",
        "favicon-32.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "share.jpg",
        "share-wide.jpg",
    ]:
        src = assets_src / name
        if not src.exists():
            src = ROOT / name
        if src.exists():
            shutil.copy2(src, DIST / name)
            print("asset", name)
        else:
            print("MISSING asset", name)

    robots = ROOT / "robots.txt"
    if robots.exists():
        shutil.copy2(robots, DIST / "robots.txt")

    print("BUILD OK →", DIST)


if __name__ == "__main__":
    build()
