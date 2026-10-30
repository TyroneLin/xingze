(function () {
  var XZ = window.XZ;
  var fj = null;
  var idx = -1;
  var images = []; // { src, alt, file?, cleared? }
  var tagCtl = null;

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

  document.addEventListener("DOMContentLoaded", function () {
    if (!XZ.requireAuth()) return;
    XZ.bindLogout();
    XZ.showScfNotice();
    var id = XZ.queryParam("id");
    if (!id) { document.getElementById("lead").textContent = "缺少 id"; return; }

    document.getElementById("addImg").addEventListener("click", function () {
      syncAlts();
      images.push({ src: null, alt: "", file: null, cleared: true });
      renderImages();
    });

    document.getElementById("saveBtn").addEventListener("click", async function () {
      XZ.setBanner("");
      if (idx < 0 || !fj) return;
      syncAlts();
      var it = fj.items[idx];
      it.category = document.getElementById("fcat").value;
      it.time = document.getElementById("time").value.trim();
      it.location = document.getElementById("loc").value.trim();
      it.text = document.getElementById("text").value.trim();
      it.tags = tagCtl.get();
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
      } catch (ex) {
        XZ.setBanner("保存失败：" + (ex.message || ex) + "。文案未丢失，可重试。");
        XZ.showToast("err", "保存失败");
      } finally {
        btn.disabled = false;
      }
    });

    XZ.loadJson("/data/finds.json").then(function (data) {
      fj = data;
      idx = (fj.items || []).findIndex(function (x) { return x.id === id; });
      if (idx < 0) { document.getElementById("lead").textContent = "未找到 " + id; return; }
      var it = fj.items[idx];
      document.getElementById("top-id").textContent = it.id;
      document.getElementById("fid").value = it.id;
      document.getElementById("fcat").value = it.category || "crystal";
      document.getElementById("time").value = it.time || "";
      document.getElementById("loc").value = it.location || "";
      document.getElementById("text").value = it.text || "";
      document.getElementById("lead").textContent = "写入 finds.json → items[] · 支持多图";
      document.title = "编辑 " + it.id + " · 星泽后台";
      tagCtl = XZ.initTagInput(document.getElementById("tags"), it.tags || []);
      images = (it.images || []).map(function (x) {
        return { src: x.src || null, alt: x.alt || "", file: null, cleared: !x.src };
      });
      if (!images.length) images.push({ src: null, alt: "", file: null, cleared: true });
      document.getElementById("form").hidden = false;
      renderImages();
    }).catch(function (e) {
      document.getElementById("lead").textContent = String(e.message || e);
    });
  });
})();
