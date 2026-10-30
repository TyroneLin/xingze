/* 星泽 CMS admin scaffold — login → STS → PUT JSON/images → rebuild.
   Design will polish UI. No invented WeChat IDs. */
(function () {
  var cfg = window.XZ_CMS || {};
  var TOKEN_KEY = "xz_cms_token";

  function scfUrl(path) {
    var base = (cfg.scfBase || "").replace(/\/$/, "");
    if (!base || base.indexOf("REPLACE_") === 0) return null;
    return base + path;
  }

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function setToken(t) {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  async function api(path, body, method) {
    var url = scfUrl(path);
    if (!url) throw new Error("SCF 未配置：请在 admin/config.js 填写 scfBase（见 CMS-TYRONE-CONSOLE.md）");
    var headers = { "Content-Type": "application/json" };
    var token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    var res = await fetch(url, {
      method: method || "POST",
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || data.ok === false) {
      var err = new Error((data && data.error) || ("HTTP " + res.status));
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }

  /* --- Login page --- */
  function initLogin() {
    var form = $("#login-form");
    if (!form) return;
    var err = $("#login-err");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      err.textContent = "";
      var pw = $("#password").value;
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        var data = await api("/login", { password: pw });
        setToken(data.token);
        location.href = "products.html";
      } catch (ex) {
        err.textContent = ex.message === "unauthorized" ? "密码不正确或后台尚未配置" : String(ex.message || ex);
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* --- Shell: require token --- */
  function requireAuth() {
    if (!getToken()) {
      location.href = "index.html";
      return false;
    }
    return true;
  }

  function initLogout() {
    var a = $("#logout");
    if (!a) return;
    a.addEventListener("click", function (e) {
      e.preventDefault();
      setToken("");
      location.href = "index.html";
    });
  }

  /* Minimal COS PUT with STS (browser) — uses aws4-ish signing via cos-js-sdk if loaded;
     scaffold uses fetch PUT with temporary credentials via COS XML API helper stub. */
  async function getSts() {
    return api("/sts", {});
  }

  async function putJsonWithSts(key, obj) {
    var sts = await getSts();
    if (!sts.credentials) throw new Error(sts.error || "sts_failed");
    // Without cos-js-sdk bundled (avoid CDN), we POST the JSON to a future proxy
    // OR use COS REST with Authorization from STS — for scaffold, store pending + call rebuild after manual note.
    // MVP path once Tyrone unlocks: load lightweight inline signer or host cos-js-sdk from same origin.
    // Placeholder: attempt simple PUT with session token header pattern documented in DEV-NOTES.
    var creds = sts.credentials;
    var host = sts.bucket + ".cos." + sts.region + ".myqcloud.com";
    var url = "https://" + host + "/" + key;
    var body = JSON.stringify(obj, null, 1);
    // Temporary: expose for DevTools until cos-js-sdk is vendored under admin/js/vendor/
    window.__XZ_LAST_STS = { url: url, creds: { tmpSecretId: creds.tmpSecretId }, key: key };
    throw new Error("COS PUT 待接入：请将 cos-js-sdk 放到 admin/js/vendor/ 或等 Dev 完成签名 PUT（STS 已可获取）。JSON 已在内存，未上传。");
  }

  async function triggerRebuild() {
    return api("/rebuild", {});
  }

  /* --- Products list/edit scaffold --- */
  function initProducts() {
    if (!requireAuth()) return;
    initLogout();
    var status = $("#status");
    var tbody = $("#product-rows");
    var notice = $("#scf-notice");

    if ((cfg.scfBase || "").indexOf("REPLACE_") === 0) {
      if (notice) notice.hidden = false;
    }

    // Load from same-origin baked data (public data/ copy) — admin preview only.
    // Saves go STS → COS → rebuild (not client-fetch for public site).
    fetch("/data/products.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (pj) {
        window.__XZ_PRODUCTS = pj;
        if (!tbody) return;
        tbody.innerHTML = "";
        (pj.items || []).forEach(function (it, idx) {
          var tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" + escapeHtml(it.id) + "</td>" +
            "<td>" + escapeHtml(it.title) + "</td>" +
            "<td><span class=\"badge\">" + escapeHtml(it.category) + "</span></td>" +
            "<td>" + (it.image ? "有图" : "占位") + "</td>" +
            "<td><button type=\"button\" class=\"btn ghost\" data-edit=\"" + idx + "\">编辑</button></td>";
          tbody.appendChild(tr);
        });
      })
      .catch(function () {
        if (status) status.textContent = "无法读取 /data/products.json（需已 bake 到同域）";
      });

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-edit]");
      if (!btn) return;
      var idx = +btn.getAttribute("data-edit");
      var it = (window.__XZ_PRODUCTS && window.__XZ_PRODUCTS.items || [])[idx];
      if (!it) return;
      $("#edit-panel").hidden = false;
      $("#edit-id").value = it.id;
      $("#edit-title").value = it.title;
      $("#edit-desc").value = it.desc || "";
      $("#edit-spec").value = it.spec || "";
      $("#edit-category").value = it.category || "";
      $("#edit-idx").value = String(idx);
    });

    var saveBtn = $("#save-product");
    if (saveBtn) {
      saveBtn.addEventListener("click", async function () {
        status.textContent = "";
        var idx = +$("#edit-idx").value;
        var pj = window.__XZ_PRODUCTS;
        if (!pj || !pj.items[idx]) return;
        pj.items[idx].title = $("#edit-title").value.trim();
        pj.items[idx].desc = $("#edit-desc").value.trim();
        pj.items[idx].spec = $("#edit-spec").value.trim();
        pj.items[idx].category = $("#edit-category").value.trim();
        saveBtn.disabled = true;
        try {
          await putJsonWithSts("data/products.json", pj);
          status.textContent = "已上传，正在重建页面…";
          await triggerRebuild();
          status.textContent = "保存并重建完成";
        } catch (ex) {
          status.textContent = String(ex.message || ex);
        } finally {
          saveBtn.disabled = false;
        }
      });
    }

    var rebuildBtn = $("#rebuild-only");
    if (rebuildBtn) {
      rebuildBtn.addEventListener("click", async function () {
        status.textContent = "";
        rebuildBtn.disabled = true;
        try {
          var r = await triggerRebuild();
          status.textContent = r.message || "重建完成";
        } catch (ex) {
          status.textContent = String(ex.message || ex);
        } finally {
          rebuildBtn.disabled = false;
        }
      });
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");
    if (page === "login") initLogin();
    if (page === "products") initProducts();
  });
})();
