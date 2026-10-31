# 星泽 CMS — SCF zip 重传（修 `sdk_missing`）

**为何：** 线上 `POST /sts` 在登录后返回 `500 sdk_missing`，因为已上传的函数包里没有 `tencentcloud-sdk-python`（`from tencentcloud…` ImportError）。

**不要改：** `ADMIN_PASSWORD_HASH` / 其它环境变量 / Function URL。只换代码包。

## 现成 zip（本机已打好）

| 路径 | 说明 |
|------|------|
| `/tmp/xingze-cms-scf.zip` | 临时副本 |
| `dist-artifacts/xingze-cms-scf.zip` | 仓库旁产物（已 gitignore） |
| `xingze-cms-scf.zip`（repo 根） | 同上，`*.zip` 已忽略，勿 commit |

约 **6.1 MB**。内含：`index.py` / `sts.py` / `site/scripts/bake.py`、裁剪后的 `tencentcloud/`（仅 `common` + `sts`）、完整 `qcloud_cos`（cos-python-sdk-v5）。

重打：`bash scripts/pack_scf_cms.sh`（见 `scf/cms/README.md` Pack & deploy；脚本会装依赖再裁掉无用产品模块以过 SCF 体积限制）。

## Tyrone：控制台上传（香港）

1. 腾讯云控制台 → **云函数 SCF** → 地域 **香港 (ap-hongkong)**。
2. 打开函数 **`xingze-cms`**（名称以控制台为准；API 探测对该名返回权限拒绝而非「不存在」）。
3. **函数代码** → **上传** → 选择 zip → 提交 `xingze-cms-scf.zip`。
4. 执行方法保持：`index.main_handler`。
5. 保存并等发布完成（无需改 env）。

## 上传后冒烟

```bash
curl -sS https://1520303651-4helfnlerb.ap-hongkong.tencentscf.com/health
# 期望：{"ok": true, "service": "xingze-cms", ...}

# 无 token → 应 401 unauthorized（不是 sdk_missing）
curl -sS -X POST https://1520303651-4helfnlerb.ap-hongkong.tencentscf.com/sts \
  -H 'Content-Type: application/json' -H 'Origin: https://www.xingzestore.com' -d '{}'
```

然后在 https://www.xingzestore.com/admin/ 再跑一次 **登录 → STS → 保存 → rebuild**。  
若 STS 仍失败，看返回是否变成 CAM/role 类错误（不再是 `sdk_missing`）→ 再查执行角色 / `CMS_STS_ROLE_ARN`。

## 为何 Dev 不能 API 热更

本机 `COS_SECRET_ID` / `COS_SECRET_KEY` 对 `scf:ListFunctions` / `UpdateFunctionCode` 为 **UnauthorizedOperation**。需要控制台账号或另开带 `scf:*`（香港）的密钥才能 API 更新。

