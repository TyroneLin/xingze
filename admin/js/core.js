/* 星泽 CMS — shared auth / SCF / COS PUT / toast (no CDN) */
(function (global) {
  var cfg = global.XZ_CMS || {};
  var TOKEN_KEY = "xz_cms_token";

  function scfUrl(path) {
    var base = (cfg.scfBase || "").replace(/\/$/, "");
    if (!base || base.indexOf("REPLACE_") === 0) return null;
    return base + path;
  }

  function scfConfigured() {
    return !!scfUrl("/login");
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

  function loginHref() {
    // Resolve relative to /admin/
    if (/\/admin\/login\/?$/.test(location.pathname)) return "./";
    if (/\/admin\/?$/.test(location.pathname)) return "login/";
    return "../login/";
  }
  function hubHref() {
    if (/\/admin\/?$/.test(location.pathname) && !/login/.test(location.pathname)) return "./";
    if (/\/admin\/login/.test(location.pathname)) return "../";
    return "../";
  }

  function requireAuth() {
    if (!getToken()) {
      location.href = loginHref();
      return false;
    }
    return true;
  }

  async function api(path, body, method) {
    var url = scfUrl(path);
    if (!url) throw new Error("SCF 未配置：请在 admin/config.js 填写 scfBase");
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

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function showToast(kind, msg) {
    var id = kind === "err" ? "toastErr" : "toastOk";
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.className = "toast " + (kind === "err" ? "err" : "ok");
      el.setAttribute("role", kind === "err" ? "alert" : "status");
      document.body.appendChild(el);
    }
    el.textContent = msg || (kind === "err" ? "保存失败" : "已保存");
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("show"); }, 2400);
  }

  function setBanner(msg) {
    var el = document.getElementById("errBanner");
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false;
    el.textContent = msg;
  }

  function showScfNotice() {
    var n = document.getElementById("scf-notice");
    if (n && !scfConfigured()) n.hidden = false;
  }

  function bindLogout() {
    qsa("[data-logout]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        setToken("");
        location.href = loginHref();
      });
    });
  }

  /* —— tags chip input —— */
  function initTagInput(root, initial) {
    var tags = (initial || []).slice();
    function render() {
      var input = root.querySelector("input");
      root.querySelectorAll(".chip[data-tag]").forEach(function (c) { c.remove(); });
      tags.forEach(function (t, i) {
        var chip = document.createElement("span");
        chip.className = "chip";
        chip.setAttribute("data-tag", "1");
        chip.innerHTML = escapeHtml(t) + " <button type=\"button\" aria-label=\"移除\" style=\"border:0;background:transparent;cursor:pointer;color:inherit;padding:0;margin:0;font:inherit\">×</button>";
        chip.querySelector("button").onclick = function () {
          tags.splice(i, 1);
          render();
        };
        root.insertBefore(chip, input);
      });
    }
    var input = root.querySelector("input");
    if (!input) {
      input = document.createElement("input");
      input.type = "text";
      input.placeholder = "添加";
      root.appendChild(input);
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        var v = input.value.replace(/,/g, "").trim();
        if (v && tags.indexOf(v) < 0) tags.push(v);
        input.value = "";
        render();
      } else if (e.key === "Backspace" && !input.value && tags.length) {
        tags.pop();
        render();
      }
    });
    render();
    return {
      get: function () { return tags.slice(); },
      set: function (arr) { tags = (arr || []).slice(); render(); }
    };
  }

  /* —— COS PUT with STS (classic q-sign sha1, Web Crypto) —— */
  function toHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }
  async function sha1Hex(str) {
    var data = new TextEncoder().encode(str);
    var dig = await crypto.subtle.digest("SHA-1", data);
    return toHex(dig);
  }
  async function hmacSha1(key, msg) {
    var enc = new TextEncoder();
    var keyData = typeof key === "string" ? enc.encode(key) : key;
    var cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
    );
    var sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
    return new Uint8Array(sig);
  }
  function camSafeEncode(str) {
    return encodeURIComponent(str)
      .replace(/!/g, "%21")
      .replace(/'/g, "%27")
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29")
      .replace(/\*/g, "%2A");
  }

  async function cosAuthorization(opts) {
    // opts: method, pathname, headers{}, query{}, secretId, secretKey, keyTime
    var method = (opts.method || "put").toLowerCase();
    var pathname = opts.pathname || "/";
    if (pathname.indexOf("/") !== 0) pathname = "/" + pathname;
    var now = Math.floor(Date.now() / 1000);
    var keyTime = opts.keyTime || (now - 60) + ";" + (now + 900);
    var headerMap = {};
    Object.keys(opts.headers || {}).forEach(function (k) {
      headerMap[k.toLowerCase()] = String(opts.headers[k]).trim();
    });
    var headerList = Object.keys(headerMap).sort();
    var headerStr = headerList.map(function (k) {
      return camSafeEncode(k) + "=" + camSafeEncode(headerMap[k]);
    }).join("&");
    var qMap = opts.query || {};
    var qList = Object.keys(qMap).sort();
    var queryStr = qList.map(function (k) {
      return camSafeEncode(k.toLowerCase()) + "=" + camSafeEncode(qMap[k]);
    }).join("&");
    var formatString = method + "\n" + pathname + "\n" + queryStr + "\n" + headerStr + "\n";
    var signKey = await hmacSha1(opts.secretKey, keyTime);
    var signKeyHex = toHex(signKey);
    var stringToSign = "sha1\n" + keyTime + "\n" + (await sha1Hex(formatString)) + "\n";
    var signature = toHex(await hmacSha1(signKeyHex, stringToSign));
    return (
      "q-sign-algorithm=sha1" +
      "&q-ak=" + opts.secretId +
      "&q-sign-time=" + keyTime +
      "&q-key-time=" + keyTime +
      "&q-header-list=" + headerList.join(";") +
      "&q-url-param-list=" + qList.map(function (k) { return k.toLowerCase(); }).join(";") +
      "&q-signature=" + signature
    );
  }

  async function getSts() {
    return api("/sts", {});
  }

  async function putObject(sts, key, body, contentType) {
    if (!sts || !sts.credentials) throw new Error(sts && sts.error || "sts_failed");
    var creds = sts.credentials;
    var host = sts.bucket + ".cos." + sts.region + ".myqcloud.com";
    var pathname = "/" + key.replace(/^\//, "");
    var headers = {
      Host: host,
      "Content-Type": contentType || "application/octet-stream",
      "x-cos-security-token": creds.sessionToken
    };
    var auth = await cosAuthorization({
      method: "put",
      pathname: pathname,
      headers: headers,
      secretId: creds.tmpSecretId,
      secretKey: creds.tmpSecretKey
    });
    var url = "https://" + host + pathname;
    var res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": headers["Content-Type"],
        "x-cos-security-token": creds.sessionToken
      },
      body: body
    });
    if (!res.ok) {
      var text = "";
      try { text = await res.text(); } catch (e) {}
      var err = new Error("COS PUT 失败 HTTP " + res.status);
      err.detail = text.slice(0, 200);
      throw err;
    }
    return { key: key, url: url };
  }

  async function putJson(sts, key, obj) {
    var body = JSON.stringify(obj, null, 2);
    return putObject(sts, key, body, "application/json; charset=utf-8");
  }

  async function putImageFile(sts, key, file) {
    var type = file.type || "application/octet-stream";
    return putObject(sts, key, file, type);
  }

  async function triggerRebuild() {
    return api("/rebuild", {});
  }

  /** Save flow: optional image PUTs → JSON PUT → rebuild. Returns {ok:true} or throws. */
  async function saveAndRebuild(jsonKey, obj, imageJobs) {
    // imageJobs: [{ key, file }] optional
    var sts = await getSts();
    if (imageJobs && imageJobs.length) {
      for (var i = 0; i < imageJobs.length; i++) {
        var job = imageJobs[i];
        if (job && job.file && job.key) await putImageFile(sts, job.key, job.file);
      }
      // refresh STS if many uploads (optional); one STS window is usually enough
    }
    await putJson(sts, jsonKey, obj);
    var r = await triggerRebuild();
    return r;
  }

  async function loadJson(path) {
    var res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("无法读取 " + path);
    return res.json();
  }

  function queryParam(name) {
    var m = new URLSearchParams(location.search).get(name);
    return m;
  }

  function extFromFile(file) {
    var n = (file && file.name) || "";
    var m = n.match(/\.([a-zA-Z0-9]+)$/);
    if (m) return m[1].toLowerCase();
    if (file && file.type === "image/png") return "png";
    if (file && file.type === "image/webp") return "webp";
    return "jpg";
  }

  global.XZ = {
    cfg: cfg,
    scfConfigured: scfConfigured,
    getToken: getToken,
    setToken: setToken,
    requireAuth: requireAuth,
    api: api,
    escapeHtml: escapeHtml,
    qs: qs,
    qsa: qsa,
    showToast: showToast,
    setBanner: setBanner,
    showScfNotice: showScfNotice,
    bindLogout: bindLogout,
    initTagInput: initTagInput,
    getSts: getSts,
    putJson: putJson,
    putImageFile: putImageFile,
    putObject: putObject,
    triggerRebuild: triggerRebuild,
    saveAndRebuild: saveAndRebuild,
    loadJson: loadJson,
    queryParam: queryParam,
    extFromFile: extFromFile,
    loginHref: loginHref,
    hubHref: hubHref
  };
})(window);
