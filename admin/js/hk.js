(function () {
  var XZ = window.XZ;
  var data = null;
  var badgeCtl = null;

  function renderSteps() {
    var root = document.getElementById("steps");
    root.innerHTML = "";
    (data.steps || []).forEach(function (st, i) {
      var block = document.createElement("div");
      block.className = "field";
      if (i) {
        var div = document.createElement("div");
        div.className = "divider";
        root.appendChild(div);
      }
      block.innerHTML =
        "<label>" + XZ.escapeHtml(st.n || String(i + 1)) + " · 标题 / 正文</label>" +
        "<input class=\"input\" data-step-title=\"" + i + "\" value=\"" + XZ.escapeHtml(st.title || "") + "\" style=\"margin-bottom:8px\"/>" +
        "<textarea class=\"textarea\" data-step-text=\"" + i + "\" style=\"min-height:72px\">" + XZ.escapeHtml(st.text || "") + "</textarea>";
      root.appendChild(block);
    });
  }

  function renderStandards() {
    var root = document.getElementById("standards");
    root.innerHTML = "";
    (data.standards || []).forEach(function (st, i) {
      if (i) {
        var div = document.createElement("div");
        div.className = "divider";
        root.appendChild(div);
      }
      var block = document.createElement("div");
      block.innerHTML =
        "<div class=\"row-2\">" +
        "<div class=\"field\"><label>标题</label><input class=\"input\" data-std-title=\"" + i + "\" value=\"" + XZ.escapeHtml(st.title || "") + "\"/></div>" +
        "<div class=\"field\"><label>角标 tag</label><input class=\"input\" data-std-tag=\"" + i + "\" value=\"" + XZ.escapeHtml(st.tag || "") + "\"/></div>" +
        "</div>" +
        "<div class=\"field\" style=\"margin-bottom:0\"><label>正文 text</label>" +
        "<textarea class=\"textarea\" data-std-text=\"" + i + "\" style=\"min-height:72px\">" + XZ.escapeHtml(st.text || "") + "</textarea></div>";
      root.appendChild(block);
    });
  }

  function renderFaq() {
    var root = document.getElementById("faq");
    root.innerHTML = "";
    (data.faq || []).forEach(function (f, i) {
      if (i) {
        var div = document.createElement("div");
        div.className = "divider";
        root.appendChild(div);
      }
      var block = document.createElement("div");
      block.innerHTML =
        "<div class=\"field\"><label>问题 q</label><input class=\"input\" data-faq-q=\"" + i + "\" value=\"" + XZ.escapeHtml(f.q || "") + "\"/></div>" +
        "<div class=\"field\" style=\"margin-bottom:0\"><label>回答 a</label>" +
        "<textarea class=\"textarea\" data-faq-a=\"" + i + "\">" + XZ.escapeHtml(f.a || "") + "</textarea></div>";
      root.appendChild(block);
    });
  }

  function collect() {
    data.badges = badgeCtl.get();
    (data.steps || []).forEach(function (st, i) {
      var t = document.querySelector("[data-step-title=\"" + i + "\"]");
      var x = document.querySelector("[data-step-text=\"" + i + "\"]");
      if (t) st.title = t.value.trim();
      if (x) st.text = x.value.trim();
      // preserve titleConfirm / _titleNote
    });
    (data.standards || []).forEach(function (st, i) {
      var a = document.querySelector("[data-std-title=\"" + i + "\"]");
      var b = document.querySelector("[data-std-tag=\"" + i + "\"]");
      var c = document.querySelector("[data-std-text=\"" + i + "\"]");
      if (a) st.title = a.value.trim();
      if (b) st.tag = b.value.trim();
      if (c) st.text = c.value.trim();
    });
    (data.faq || []).forEach(function (f, i) {
      var q = document.querySelector("[data-faq-q=\"" + i + "\"]");
      var a = document.querySelector("[data-faq-a=\"" + i + "\"]");
      if (q) f.q = q.value.trim();
      if (a) f.a = a.value.trim();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!XZ.requireAuth()) return;
    XZ.bindLogout();
    XZ.showScfNotice();
    document.getElementById("saveBtn").addEventListener("click", async function () {
      XZ.setBanner("");
      if (!data) return;
      collect();
      var btn = document.getElementById("saveBtn");
      btn.disabled = true;
      try {
        if (!XZ.scfConfigured()) throw new Error("SCF 未配置，无法保存");
        await XZ.saveAndRebuild("data/hk-agent.json", data, []);
        XZ.showToast("ok", "已保存");
      } catch (ex) {
        XZ.setBanner("保存失败：" + (ex.message || ex) + "。文案未丢失，可重试。");
        XZ.showToast("err", "保存失败");
      } finally {
        btn.disabled = false;
      }
    });
    XZ.loadJson("/data/hk-agent.json").then(function (d) {
      data = d;
      badgeCtl = XZ.initTagInput(document.getElementById("badges"), d.badges || []);
      renderSteps();
      renderStandards();
      renderFaq();
      document.getElementById("form").hidden = false;
    }).catch(function (e) {
      document.querySelector(".lead").textContent = String(e.message || e);
    });
  });
})();
