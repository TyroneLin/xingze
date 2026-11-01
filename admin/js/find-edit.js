(function () {
  var XZ = window.XZ;
  var fj = null;
  var idx = -1;
  var isNew = false;
  var images = []; // { src, alt, file?, cleared? }
  var tagCtl = null;

  var ID_RE = /^F\d{2,}$/i;

  function normalizeId(raw) {
    var s = String(raw || "").trim().toUpperCase();
    var m = s.match(/^F(\d+)$/);
    if (!m) return s;
    var n = parseInt(m[1], 10);
    if (isNaN(n) || n < 1) return s;
    if (n < 10) return "F0" + n;
    return "F" + n;
  }

  function nextFindId() {
    var max = 0;
    (fj.items || []).forEach(function (it) {
      var id = String(it.id || "").toUpperCase();
      var m = id.match(/^F(\d+)$/);
      if (!m) return;
      var num = parseInt(m[1], 10);
      if (!isNaN(num) && num > max) max = num;
    });
    var n = max + 1;
    var suf = n < 10 ? "0" + n : String(n);
    return "F" + suf;
  }

  function setCreateUi(on) {
    isNew = !!on;
    var titleEl = document.getElementById("page-title");
    var idInput = document.getElementById("fid");
    var idLabel = document.getElementById("id-label");
    if (titleEl) titleEl.textContent = on ? "新增结缘" : "编辑好物分享";
    if (idInput) {
      if (on) idInput.removeAttribute("readonly");
      else idInput.setAttribute("readonly", "readonly");
    }
    if (idLabel) idLabel.textContent = on ? "编号 id" : "编号 id（只读）";
  }

  function renderImages() {
    var root = document.getElementById("multi");
    root.innerHTML = "";
    images.forEach(function (img, i) {
      var wrap = document.createElement("div");
      var has = img.file || (img.src && !img.cleared);
      if (img.file) {
        wrap.className = "upload preview";
        wrap.innerHTML = "<img alt=\"\" src=\"" + URL.createObjectURL(img.file) + "\" style=\"height:120px;object-fit:cover;width:100%\"/>" +
          "<div class=\"file-row\" style=\"padding:6px\"><label class=\"btn sm\" for=\"fimg" + i + "\">更换</label>" +
          "<button type=\"button\" class=\"btn sm ghost\" data-clear=\"" + i + "\">清除</button></div>" +
          "<input id=\"fimg" + i + "\" type=\"file\" accept=\"image/*\" hidden data-idx=\"" + i + "\"/>";
      } else if (has) {
        wrap.className = "upload preview";
        wrap.innerHTML = "<img alt=\"\" src=\"" + XZ.escapeHtml(img.src) + "\" style=\"height:120px;object-fit:cover;width:100%\"/>" +
          "<div class=\"file-row\" style=\"padding:6px\"><label class=\"btn sm\" for=\"fimg" + i + "\">更换</label>" +
          "<button type=\"button\" class=\"btn sm ghost\" data-clear=\"" + i + "\">清除</button></div>" +
          "<input id=\"fimg" + i + "\" type=\"file\" accept=\"image/*\" hidden data-idx=\"" + i + "\"/>";
      } else {
        wrap.className = "upload";
        wrap.innerHTML = "<span class=\"ph-t\">图 " + (i + 1) + "</span><span class=\"ph-s\">待 Leanne 素材</span>" +
          "<label class=\"btn sm\" style=\"margin-top:6px\" for=\"fimg" + i + "\">选择</label>" +
          "<button type=\"button\" class=\"btn sm ghost\" data-clear=\"" + i + "\" style=\"margin-top:4px\">清除</button>" +
          "<input id=\"fimg" + i + "\" type=\"file\" accept=\"image/*\" hidden data-idx=\"" + i + "\"/>" +
          "<input class=\"input\" data-alt=\"" + i + "\" placeholder=\"alt\" value=\"" + XZ.escapeHtml(img.alt || "") + "\" style=\"margin-top:6px;min-height:36px;font-size:12px\"/>";
      }
      if (has) {
        var alt = document.createElement("input");
        alt.className = "input";
        alt.setAttribute("data-alt", String(i));
        alt.placeholder = "alt";
        alt.value = img.alt || "";
        alt.style.cssText = "margin:6px;min-height:36px;font-size:12px;width:calc(100% - 12px)";
        wrap.appendChild(alt);
      }
      root.appendChild(wrap);
    });
    root.querySelectorAll("input[type=file]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var i = +inp.getAttribute("data-idx");
        var f = inp.files && inp.files[0];
        if (!f) return;
        images[i].file = f;
        images[i].cleared = false;
        renderImages();
      });
    });
    root.querySelectorAll("[data-clear]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = +btn.getAttribute("data-clear");
        images[i].file = null;
        images[i].src = null;
        images[i].cleared = true;
        renderImages();
      });
    });
    root.querySelectorAll("[data-alt]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        images[+inp.getAttribute("data-alt")].alt = inp.value;
      });
    });
  }

  function syncAlts() {
    document.querySelectorAll("[data-alt]").forEach(function (inp) {
      images[+inp.getAttribute("data-alt")].alt = inp.value;
    });
  }

  function fill(it) {
    document.getElementById("top-id").textContent = it.id || "";
    document.getElementById("fid").value = it.id || "";
    document.getElementById("fcat").value = it.category || "crystal";
    document.getElementById("time").value = it.time || "";
    document.getElementById("loc").value = it.location || "";
    document.getElementById("text").value = it.text || "";
    document.getElementById("lead").textContent = isNew
      ? "新建 · 保存写入 finds.json → items[] 并 bake /finds/<id>/"
      : "写入 finds.json → items[] · 支持多图";
    document.title = (isNew ? "新增结缘" : "编辑 " + it.id) + " · 星泽后台";
    tagCtl = XZ.initTagInput(document.getElementById("tags"), it.tags || []);
    images = (it.images || []).map(function (x) {
      return { src: x.src || null, alt: x.alt || "", file: null, cleared: !x.src };
    });
    if (!images.length) images.push({ src: null, alt: "", file: null, cleared: true });
    document.getElementById("form").hidden = false;
    renderImages();
  }

  function suggestId() {
    if (!isNew || !fj) return;
    var suggested = nextFindId();
    document.getElementById("fid").value = suggested;
    document.getElementById("top-id").textContent = suggested;
  }

  async function save() {
    XZ.setBanner("");
    if (!fj) return;
    syncAlts();
    var rawId = document.getElementById("fid").value;
    var id = isNew ? normalizeId(rawId) : (fj.items[idx] && fj.items[idx].id);
    var text = document.getElementById("text").value.trim();
    var cat = document.getElementById("fcat").value || "crystal";

    if (isNew) {
      if (!id) {
        XZ.setBanner("请填写编号 id");
        return;
      }
      if (!ID_RE.test(id)) {
        XZ.setBanner("编号格式应为 F + 数字，例如 F06");
        return;
      }
      id = normalizeId(id);
      document.getElementById("fid").value = id;
      document.getElementById("top-id").textContent = id;
      var clash = (fj.items || []).some(function (x) {
        return String(x.id || "").toUpperCase() === id.toUpperCase();
      });
      if (clash) {
        XZ.setBanner("编号 " + id + " 已存在，请换一个");
        return;
      }
    } else if (idx < 0) {
      return;
    }

    if (!text) {
      XZ.setBanner("请填写正文 text");
      return;
    }

    var it;
    if (isNew) {
      it = {
        id: id,
        category: cat,
        time: "",
        location: "",
        text: text,
        tags: [],
        images: [{ src: null, alt: "" }]
      };
      fj.items = fj.items || [];
      fj.items.push(it);
      idx = fj.items.length - 1;
    } else {
      it = fj.items[idx];
    }

    it.category = cat;
    it.time = document.getElementById("time").value.trim();
    it.location = document.getElementById("loc").value.trim();
    it.text = text;
    it.tags = tagCtl.get();
    if (isNew) it.id = id;

    var btn = document.getElementById("saveBtn");
    btn.disabled = true;
    try {
      if (!XZ.scfConfigured()) throw new Error("SCF 未配置，无法保存");
      var jobs = [];
      var outImgs = [];
      for (var i = 0; i < images.length; i++) {
        var im = images[i];
        var src = im.cleared && !im.file ? null : (im.src || null);
        if (im.file) {
          var ext = XZ.extFromFile(im.file);
          var key = "images/finds/" + it.id + "-" + i + "-" + Date.now() + "." + ext;
          jobs.push({ key: key, file: im.file });
          src = "/" + key;
        }
        outImgs.push({ src: src, alt: im.alt || "" });
      }
      it.images = outImgs;
      await XZ.saveAndRebuild("data/finds.json", fj, jobs);
      images = outImgs.map(function (x) { return { src: x.src, alt: x.alt, file: null, cleared: !x.src }; });
      renderImages();
      XZ.showToast("ok", "已保存");
      if (isNew) {
        setCreateUi(false);
        fill(it);
        try {
          history.replaceState(null, "", "edit.html?id=" + encodeURIComponent(it.id));
        } catch (e) { /* ignore */ }
      }
    } catch (ex) {
      if (isNew && idx >= 0 && fj.items[idx] === it) {
        fj.items.splice(idx, 1);
        idx = -1;
      }
      XZ.setBanner("保存失败：" + (ex.message || ex) + "。文案未丢失，可重试。");
      XZ.showToast("err", "保存失败");
    } finally {
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
      document.getElementById("lead").textContent = "缺少 id 参数（新建请用 新增结缘）";
      return;
    }

    document.getElementById("addImg").addEventListener("click", function () {
      syncAlts();
      images.push({ src: null, alt: "", file: null, cleared: true });
      renderImages();
    });
    document.getElementById("saveBtn").addEventListener("click", save);

    XZ.loadJson("/data/finds.json").then(function (data) {
      fj = data;
      if (createMode) {
        setCreateUi(true);
        var draft = {
          id: "",
          category: "crystal",
          time: "",
          location: "",
          text: "",
          tags: [],
          images: [{ src: null, alt: "" }]
        };
        fill(draft);
        suggestId();
        return;
      }
      setCreateUi(false);
      idx = (fj.items || []).findIndex(function (x) { return x.id === id; });
      if (idx < 0) {
        document.getElementById("lead").textContent = "未找到 " + id;
        return;
      }
      fill(fj.items[idx]);
    }).catch(function (e) {
      document.getElementById("lead").textContent = String(e.message || e);
    });
  });
})();
