#!/usr/bin/env bash
# Pack 星泽 CMS SCF deploy zip (includes pruned tencentcloud STS + cos SDK).
# Usage: from repo root → bash scripts/pack_scf_cms.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACK="${PACK_DIR:-/tmp/xz-cms-pack}"
OUT_TMP="${OUT_TMP:-/tmp/xingze-cms-scf.zip}"
OUT_ART="$ROOT/dist-artifacts/xingze-cms-scf.zip"
OUT_ROOT="$ROOT/xingze-cms-scf.zip"
PIP="${PIP:-python3 -m pip}"

rm -rf "$PACK"
mkdir -p "$PACK/site/scripts" "$ROOT/dist-artifacts"

cp "$ROOT"/scf/cms/*.py "$ROOT"/scf/cms/requirements.txt "$PACK/"
cp -R "$ROOT"/css "$ROOT"/js "$ROOT"/data "$ROOT"/admin "$PACK/site/"
cp "$ROOT"/scripts/bake.py "$PACK/site/scripts/bake.py"
cp -R "$ROOT"/images "$PACK/site/" 2>/dev/null || true
cp "$ROOT"/favicon.ico "$ROOT"/favicon-32.png "$ROOT"/apple-touch-icon.png \
   "$ROOT"/icon-192.png "$ROOT"/share.jpg "$ROOT"/share-wide.jpg \
   "$ROOT"/robots.txt "$PACK/site/" 2>/dev/null || true

# Install into pack (full SDK then prune unused products — SCF size limits)
$PIP install -r "$ROOT/scf/cms/requirements.txt" -t "$PACK/"
# Keep only tencentcloud.common + tencentcloud.sts
if [[ -d "$PACK/tencentcloud" ]]; then
  find "$PACK/tencentcloud" -mindepth 1 -maxdepth 1 -type d ! -name common ! -name sts -exec rm -rf {} +
fi
rm -rf "$PACK"/bin "$PACK"/*.dist-info
find "$PACK" -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
find "$PACK" -name '*.pyc' -delete 2>/dev/null || true

python3 - "$PACK" "$OUT_TMP" <<'PY'
import os, sys, zipfile
src, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d != "__pycache__"]
        for f in files:
            if f.endswith(".pyc"):
                continue
            path = os.path.join(root, f)
            zf.write(path, os.path.relpath(path, src))
print("wrote", out, os.path.getsize(out), "bytes")
PY

cp -f "$OUT_TMP" "$OUT_ART" "$OUT_ROOT"
python3 - "$OUT_TMP" <<'PY'
import sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
names = set(z.namelist())
for n in ["index.py", "sts.py", "site/scripts/bake.py", "tencentcloud/__init__.py", "qcloud_cos/__init__.py",
          "tencentcloud/sts/v20180813/sts_client.py"]:
    assert n in names, f"missing {n}"
print("verify_ok files=", len(names))
PY
ls -lh "$OUT_TMP" "$OUT_ART" "$OUT_ROOT"
echo "Pack ready. Upload via console (see CMS-SCF-REUPLOAD.md) — do not git-commit the zip."
