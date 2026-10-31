"""POST /sts — after session auth → short-lived COS STS via AssumeRole.

Env: CMS_STS_ROLE_ARN, TENCENT_SECRET_ID/KEY (optional), COS_BUCKET, COS_REGION
Credentials: explicit env secrets, else DefaultCredentialProvider / SCF execution role.
Policy prefixes: data/*.json, images/products|finds|wechat/*
"""
from __future__ import annotations

import json

from common import (
    CMS_STS_ROLE_ARN,
    COS_BUCKET,
    COS_REGION,
    STS_DURATION,
    bearer_token,
    options_ok,
    response,
    tencent_credential,
    verify_session_token,
)

# Paths Leanne may write (must match CAM policy Tyrone attaches).
ALLOWED_PREFIXES = [
    "data/products.json",
    "data/finds.json",
    "data/hk-agent.json",
    "images/products/",
    "images/finds/",
    "images/wechat/",
]


def _resource_arns() -> list[str]:
    # COS CAM resource format for object prefixes
    arns = []
    for p in ALLOWED_PREFIXES:
        if p.endswith("/"):
            arns.append(f"qcs::cos:{COS_REGION}:uid/*:{COS_BUCKET}/{p}*")
        else:
            arns.append(f"qcs::cos:{COS_REGION}:uid/*:{COS_BUCKET}/{p}")
    return arns


def main_handler(event, context):
    method = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method") or "POST").upper()
    if method == "OPTIONS":
        return options_ok()
    if method != "POST":
        return response(405, {"ok": False, "error": "method_not_allowed"})

    token = bearer_token(event)
    if not verify_session_token(token):
        return response(401, {"ok": False, "error": "unauthorized"})

    if CMS_STS_ROLE_ARN.startswith("REPLACE_") or not CMS_STS_ROLE_ARN:
        return response(
            501,
            {
                "ok": False,
                "error": "sts_not_configured",
                "hint": "Set CMS_STS_ROLE_ARN after Tyrone creates CAM role (see CMS-TYRONE-CONSOLE.md)",
                "allowedPrefixes": ALLOWED_PREFIXES,
            },
        )

    # Live AssumeRole path — role ARN required; creds from env or SCF execution role.
    try:
        from tencentcloud.common.profile.client_profile import ClientProfile
        from tencentcloud.common.profile.http_profile import HttpProfile
        from tencentcloud.sts.v20180813 import models, sts_client
    except ImportError:
        return response(500, {"ok": False, "error": "sdk_missing", "hint": "pip install tencentcloud-sdk-python"})

    cred = tencent_credential()
    if cred is None:
        return response(
            501,
            {
                "ok": False,
                "error": "sts_credentials_missing",
                "hint": "Bind SCF execution role that can sts:AssumeRole on CMS_STS_ROLE_ARN (DefaultCredentialProvider), or set TENCENT_SECRET_ID/KEY in env (prefer role).",
            },
        )

    policy = {
        "version": "2.0",
        "statement": [
            {
                "effect": "allow",
                "action": [
                    "name/cos:PutObject",
                    "name/cos:PostObject",
                    "name/cos:GetObject",
                    "name/cos:HeadObject",
                    "name/cos:DeleteObject",
                ],
                "resource": _resource_arns(),
            }
        ],
    }

    try:
        httpProfile = HttpProfile(endpoint="sts.tencentcloudapi.com")
        clientProfile = ClientProfile(httpProfile=httpProfile)
        client = sts_client.StsClient(cred, COS_REGION, clientProfile)
        req = models.AssumeRoleRequest()
        params = {
            "RoleArn": CMS_STS_ROLE_ARN,
            "RoleSessionName": "xingze-cms-admin",
            "DurationSeconds": STS_DURATION,
            "Policy": json.dumps(policy, ensure_ascii=False),
        }
        req.from_json_string(json.dumps(params))
        resp = client.AssumeRole(req)
        creds = resp.Credentials
        return response(
            200,
            {
                "ok": True,
                "bucket": COS_BUCKET,
                "region": COS_REGION,
                "expiredTime": resp.ExpiredTime,
                "startTime": resp.StartTime,
                "credentials": {
                    "tmpSecretId": creds.TmpSecretId,
                    "tmpSecretKey": creds.TmpSecretKey,
                    "sessionToken": creds.Token,
                },
                "allowedPrefixes": ALLOWED_PREFIXES,
            },
        )
    except Exception as e:
        return response(502, {"ok": False, "error": "assume_role_failed", "detail": str(e)[:300]})
