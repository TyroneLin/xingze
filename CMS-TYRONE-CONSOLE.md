# 星泽 CMS — Tyrone Day-1 控制台步骤（个人腾讯云）

**Account:** personal only（Tyrone / tyronehoi）· **禁止** T8 / tmwinno / 公司账号  
**Region:** `ap-hongkong`  
**Bucket:** `xingze-1520303651`（已有 www）  
**Site:** `https://www.xingzestore.com`

完成后把 Function URL + 是否设好 env 发回 Dev / PM。**不要**把明文密码长期贴在群聊。

---

## 1. 开通 SCF（香港）

1. 控制台 → **云函数 SCF** → 地域选 **香港**。
2. 若提示开通服务 → 同意开通（按量计费即可）。
3. **新建函数**
   - 名称：`xingze-cms`（可改）
   - 运行环境：**Python 3.9**（或 3.10）
   - 提交方法：本地上传 zip（Dev 按 `scf/cms/README.md` 打包）或先建空函数稍后传包
   - 执行方法：`index.main_handler`
   - 内存：256MB 起；超时：**60–120s**（rebuild bake 需要）
4. **触发器：函数 URL**（推荐 MVP）
   - 开启函数 URL
   - 鉴权：**免鉴权**（靠 admin 密码 + 后续可加 IP/频率限制）
   - CORS：允许来源 `https://www.xingzestore.com`；方法 GET,POST,OPTIONS；Headers `Content-Type, Authorization`
5. 或用 **API 网关** 同等 CORS（二选一即可）。

记下 URL，例如：`https://xxxxx-xxxxxx.hk-scf.tencentcs.com`  
→ Dev 写入 `admin/config.js` 的 `scfBase`（无尾斜杠）。

---

## 2. CAM：执行角色 + STS 角色

### 2a. SCF 执行角色（函数自己读/写 COS、AssumeRole）

1. 访问管理 → 角色 → 新建 → **云函数** 服务
2. 角色名：`xingze-cms-scf-exec`
3. 策略（可建自定义策略 `xingze-cms-exec`）需至少：
   - `cos:GetObject` / `cos:PutObject` / `cos:HeadObject` / `cos:DeleteObject` / `cos:ListParts`… 在 bucket `xingze-1520303651`（rebuild 上传 HTML）
   - `sts:AssumeRole` 对下方 STS 角色
4. 在 SCF 函数配置 → **角色** → 绑定此执行角色（优先于在环境变量塞永久密钥）。

### 2b. STS 临时密钥角色（给浏览器上传 data/images）

1. 新建角色 → 自定义 → 可被 **云函数 / 本账号** 扮演  
   角色名：`xingze-cms-sts`
2. 信任策略：允许 `xingze-cms-scf-exec`（或本账号 UIN）`sts:AssumeRole`
3. 权限策略 **收紧前缀**（不要 `*` 写整个账号），对象示例：

```text
resource 前缀（COS）：
  data/products.json
  data/finds.json
  data/hk-agent.json
  images/products/*
  images/finds/*
  images/wechat/*
```

**CAM resource ARN 必须带本账号 AppId**（不要 `uid/*`，AssumeRole 会报 `InvalidParameter.GrantOtherResource`）：

```text
格式：qcs::cos:{region}:uid/{AppId}:{bucket}/{object}
AppId：1520303651（来自 bucket `xingze-1520303651`）

示例：
  qcs::cos:ap-hongkong:uid/1520303651:xingze-1520303651/data/products.json
  qcs::cos:ap-hongkong:uid/1520303651:xingze-1520303651/images/products/*
```

Action 示例：`cos:PutObject`, `cos:PostObject`, `cos:GetObject`, `cos:HeadObject`, `cos:DeleteObject`（仅上述前缀）。

4. 复制角色 ARN → SCF 环境变量 `CMS_STS_ROLE_ARN`。

---

## 3. 环境变量（函数配置）

| 变量 | 值 |
|------|-----|
| `ADMIN_PASSWORD_HASH` | 见下方生成；**不要**明文密码 |
| `SESSION_SECRET` | 长随机串（密码管理器生成） |
| `CMS_STS_ROLE_ARN` | 上一步 ARN |
| `COS_BUCKET` | `xingze-1520303651` |
| `COS_REGION` | `ap-hongkong` |
| `COS_APPID` | 可选；默认从 bucket 尾部推导 `1520303651`。STS 会话策略 ARN 用 `uid/{AppId}`，勿用 `uid/*` |
| `CORS_ORIGIN` | `https://www.xingzestore.com` |
| `XZ_GATE` | `1`（软发前保持） |
| `TENCENT_SECRET_ID` / `KEY` | **尽量不设**；用执行角色。若暂时无角色，仅作过渡 |

### 生成 `ADMIN_PASSWORD_HASH`

本机（勿提交密码到 git）：

```bash
cd scf/cms
python3 -c "from common import hash_password_cli; print(hash_password_cli('此处换成你设的密码'))"
```

把打印的 `salt$iterations$hash` 贴进环境变量。  
密码口头或 1:1 交给 Leanne；群里只说「已设置」。

---

## 4. 冒烟

```bash
curl -sS "$SCF_URL/health"
curl -sS -X POST "$SCF_URL/login" -H 'Content-Type: application/json' \
  -d '{"password":"..."}' 
# → {"ok":true,"token":"..."}
```

浏览器：`https://www.xingzestore.com/admin/`（需先 bake 含 admin 并上传 COS；仍受预览 gate）。

---

## 5. 回传给 Dev / PM 的清单

- [ ] SCF HK 已开通，函数名 _______
- [ ] Function URL：_______
- [ ] 执行角色 + STS 角色 ARN：_______
- [ ] `ADMIN_PASSWORD_HASH` + `SESSION_SECRET` 已设（密码已给 Leanne）
- [ ] CORS 来源仅 www
- [ ] 确认 **Leanne = 唯一编辑**（共享密码 OK）

---

## Out of scope（本页不做）

- 公司云、Google/GitHub 登录、支付、繁体、去掉预览 gate
