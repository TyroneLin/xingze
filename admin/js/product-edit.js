(function () {
  var XZ = window.XZ;
  var pj = null;
  var idx = -1;
  var imagePath = null; // current or null
  var pendingFile = null;
  var cleared = false;
  var tagCtl = null;

  function renderUpload() {
    var box = document.getElementById("uploadBox");
    var showPath = cleared ? null : (pendingFile ? null : imagePath);
    if (pendingFile) {
      var url = URL.createObjectURL(pendingFile);
      box.className = "upload preview";
      box.innerHTML =
        "<img alt=\"预览\" src=\"" + url + "\"/>" +
        "<div style=\"padding:10px\" class=\"file-row\">" +
        "<label class=\"btn sm\" for=\"file\">更换</label>" +
        "<button type=\"button\" class=\"btn sm ghost\" id=\"clearImg\">清除</button></div>" +
        "<div class=\"progress\" id=\"prog\" hidden><span></span></div>" +
        "<p class=\"tiny\" id=\"progLabel\" hidden style=\"padding:0 10px 10px\">上传中…</p>";
    } else if (showPath) {
      box.className = "upload preview";
      box.innerHTML =
        "<img alt=\"\" src=\"" + XZ.escapeHtml(showPath) + "\"/>" +
        "<div style=\"padding:10px\" class=\"file-row\">" +
        "<label class=\"btn sm\" for=\"file\">更换</label>" +
        "<button type=\"button\" class=\"btn sm ghost\" id=\"clearImg\">清除</button></div>" +
        "<div class=\"progress\" id=\"prog\" hidden><span></span></div>" +
        "<p class=\"tiny\" id=\"progLabel\" hidden style=\"padding:0 10px 10px\">上传中…</p>";
    } else {
      box.className = "upload";
      box.innerHTML =
        "<span class=\"ph-t\">待 Leanne 素材</span>" +
        "<span class=\"ph-s\">image 为 null 时前台显示占位</span>" +
        "<div class=\"file-row\">" +
        "<label class=\"btn sm\" for=\"file\">选择图片</label>" +
        "<button type=\"button\" class=\"btn sm ghost\" id=\"clearImg\">清除</button></div>" +
        "<div class=\"progress\" id=\"prog\" hidden><span></span></div>" +
        "<p class=\"tiny\" id=\"progLabel\" hidden>上传中…</p>";
    }
    document.getElementById("clearImg").onclick = function () {
      pendingFile = null;
      cleared = true;
      imagePath = null;
      document.getElementById("file").value = "";
      renderUpload();
    };
  }

  function fill(it) {
    document.getElementById("top-id").textContent = it.id;
    document.getElementById("id").value = it.id;
    document.getElementById("category").value = it.category || "crystal";
    document.getElementById("title").value = it.title || "";
    document.getElementById("spec").value = it.spec || "";
    document.getElementById("desc").value = it.desc || "";
    document.getElementById("cta").value = it.cta || "";
    document.getElementById("imageAlt").value = it.imageAlt || "";
    document.getElementById("lead").textContent =
      it.title + " · 保存写入 products.json → items[]";
    document.title = "编辑 " + it.id + " · 星泽后台";
    imagePath = it.image || null;
    cleared = false;
    pendingFile = null;
    tagCtl = XZ.initTagInput(document.getElementById("tags"), it.tags || []);
    document.getElementById("form").hidden = false;
    renderUpload();
  }

  async function save() {
    XZ.setBanner("");
    if (idx < 0 || !pj) return;
    var it = pj.items[idx];
    it.category = document.getElementById("category").value;
    it.title = document.getElementById("title").value.trim();
    it.spec = document.getElementById("spec").value.trim();
    it.desc = document.getElementById("desc").value.trim();
    it.cta = document.getElementById("cta").value.trim();
    it.imageAlt = document.getElementById("imageAlt").value.trim();
    it.tags = tagCtl.get();
    var btn = document.getElementById("saveBtn");
    btn.disabled = true;
    var prog = document.getElementById("prog");
    var progLabel = document.getElementById("progLabel");
    try {
      if (!XZ.scfConfigured()) throw new Error("SCF 未配置，无法保存");
      var jobs = [];
      if (pendingFile) {
        var ext = XZ.extFromFile(pendingFile);
        var key = "images/products/" + it.id + "-" + Date.now() + "." + ext;
        jobs.push({ key: key, file: pendingFile });
        it.image = "/" + key;
        if (prog) prog.hidden = false;
        if (progLabel) { progLabel.hidden = false; progLabel.textContent = "上传图片中…"; }
      } else if (cleared) {
        it.image = null;
      }
      await XZ.saveAndRebuild("data/products.json", pj, jobs);
      imagePath = it.image;
      pendingFile = null;
      cleared = false;
      renderUpload();
      XZ.showToast("ok", "已保存");
    } catch (ex) {
      XZ.setBanner("保存失败：" + (ex.message || ex) + "。文案未丢失，可重试。");
      XZ.showToast("err", "保存失败");
    } finally {
      if (prog) prog.hidden = true;
      if (progLabel) progLabel.hidden = true;
      btn.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!XZ.requireAuth()) return;
    XZ.bindLogout();
    XZ.showScfNotice();
    var id = XZ.queryParam("id");
    if (!id) {
      document.getElementById("lead").textContent = "缺少 id 参数";
      return;
    }
    document.getElementById("file").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      pendingFile = f;
      cleared = false;
      renderUpload();
    });
    document.getElementById("saveBtn").addEventListener("click", save);
    XZ.loadJson("/data/products.json").then(function (data) {
      pj = data;
      idx = (pj.items || []).findIndex(function (x) { return x.id === id; });
      if (idx < 0) {
        document.getElementById("lead").textContent = "未找到 " + id;
        return;
      }
      fill(pj.items[idx]);
    }).catch(function (e) {
      document.getElementById("lead").textContent = String(e.message || e);
    });
  });
})();
