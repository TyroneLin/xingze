(function () {
  var XZ = window.XZ;
  var pj = null;
  var idx = -1;
  var isNew = false;
  var imagePath = null; // current or null
  var pendingFile = null;
  var cleared = false;
  var tagCtl = null;

  var CAT_PREFIX = { crystal: "XZ-C", wenwan: "XZ-W", wellness: "XZ-Y" };
  var ID_RE = /^XZ-[A-Z]+\d+$/i;

  function normalizeId(raw) {
    var s = String(raw || "").trim().toUpperCase();
    // Keep letters after XZ- uppercase; digits as-is
    var m = s.match(/^XZ-([A-Z]+)(\d+)$/);
    if (!m) return s;
    return "XZ-" + m[1] + m[2];
  }

  function nextIdForCategory(cat) {
    var prefix = CAT_PREFIX[cat] || "XZ-C";
    var max = 0;
    (pj.items || []).forEach(function (it) {
      var id = String(it.id || "").toUpperCase();
      if (id.indexOf(prefix) !== 0) return;
      var num = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(num) && num > max) max = num;
    });
    var n = max + 1;
    var suf = n < 10 ? "0" + n : String(n);
    return prefix + suf;
  }

  function setCreateUi(on) {
    isNew = !!on;
    var titleEl = document.getElementById("page-title");
    var idInput = document.getElementById("id");
    var idLabel = document.getElementById("id-label");
    if (titleEl) titleEl.textContent = on ? "新增产品" : "编辑产品";
    if (idInput) {
      if (on) idInput.removeAttribute("readonly");
      else idInput.setAttribute("readonly", "readonly");
    }
    if (idLabel) idLabel.textContent = on ? "编号 id" : "编号 id（只读）";
  }

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
    document.getElementById("top-id").textContent = it.id || "";
    document.getElementById("id").value = it.id || "";
    document.getElementById("category").value = it.category || "crystal";
    document.getElementById("title").value = it.title || "";
    document.getElementById("spec").value = it.spec || "";
    document.getElementById("desc").value = it.desc || "";
    document.getElementById("cta").value = it.cta || "";
    document.getElementById("imageAlt").value = it.imageAlt || "";
    document.getElementById("lead").textContent = isNew
      ? "新建 · 保存写入 products.json → items[] 并 bake /products/<id>/"
      : (it.title || it.id) + " · 保存写入 products.json → items[]";
    document.title = (isNew ? "新增产品" : "编辑 " + it.id) + " · 星泽后台";
    imagePath = it.image || null;
    cleared = false;
    pendingFile = null;
    tagCtl = XZ.initTagInput(document.getElementById("tags"), it.tags || []);
    document.getElementById("form").hidden = false;
    renderUpload();
  }

  function suggestIdFromCategory() {
    if (!isNew || !pj) return;
    var cat = document.getElementById("category").value || "crystal";
    var suggested = nextIdForCategory(cat);
    document.getElementById("id").value = suggested;
    document.getElementById("top-id").textContent = suggested;
  }

  async function save() {
    XZ.setBanner("");
    if (!pj) return;
    var title = document.getElementById("title").value.trim();
    var cat = document.getElementById("category").value || "crystal";
    var rawId = document.getElementById("id").value;
    var id = isNew ? normalizeId(rawId) : (pj.items[idx] && pj.items[idx].id);

    if (isNew) {
      if (!id) {
        XZ.setBanner("请填写编号 id");
        return;
      }
      if (!ID_RE.test(id)) {
        XZ.setBanner("编号格式应为 XZ-字母+数字，例如 XZ-C13");
        return;
      }
      id = normalizeId(id);
      document.getElementById("id").value = id;
      var clash = (pj.items || []).some(function (x) {
        return String(x.id || "").toUpperCase() === id.toUpperCase();
      });
      if (clash) {
        XZ.setBanner("编号 " + id + " 已存在，请换一个");
        return;
      }
    } else if (idx < 0) {
      return;
    }

    if (!title) {
      XZ.setBanner("请填写标题 title");
      return;
    }

    var it;
    if (isNew) {
      it = {
        id: id,
        category: cat,
        title: title,
        spec: "",
        tags: [],
        desc: "",
        image: null,
        imageAlt: "待 Leanne 素材",
        cta: "私信结缘"
      };
      pj.items = pj.items || [];
      pj.items.push(it);
      idx = pj.items.length - 1;
    } else {
      it = pj.items[idx];
    }

    it.category = cat;
    it.title = title;
    it.spec = document.getElementById("spec").value.trim();
    it.desc = document.getElementById("desc").value.trim();
    it.cta = document.getElementById("cta").value.trim();
    it.imageAlt = document.getElementById("imageAlt").value.trim();
    it.tags = tagCtl.get();
    if (isNew) it.id = id;

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
      if (isNew) {
        setCreateUi(false);
        fill(it);
        try {
          history.replaceState(null, "", "edit.html?id=" + encodeURIComponent(it.id));
        } catch (e) { /* ignore */ }
      }
    } catch (ex) {
      // Roll back append on failed create so retry can re-append cleanly
      if (isNew && idx >= 0 && pj.items[idx] === it) {
        pj.items.splice(idx, 1);
        idx = -1;
      }
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
    var createMode = XZ.queryParam("new") === "1";

    if (!createMode && !id) {
      document.getElementById("lead").textContent = "缺少 id 参数（新建请用 新增产品）";
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
    document.getElementById("category").addEventListener("change", function () {
      if (isNew) suggestIdFromCategory();
    });

    XZ.loadJson("/data/products.json").then(function (data) {
      pj = data;
      if (createMode) {
        setCreateUi(true);
        var draft = {
          id: "",
          category: "crystal",
          title: "",
          spec: "",
          tags: [],
          desc: "",
          image: null,
          imageAlt: "待 Leanne 素材",
          cta: "私信结缘"
        };
        fill(draft);
        suggestIdFromCategory();
        return;
      }
      setCreateUi(false);
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
