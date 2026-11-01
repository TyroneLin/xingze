/* 星泽 temporary preview gate — client-side only; reversible via XZ_GATE=0 rebuild */
(function () {
  var EXPECT = "700677ad41fc5fa706287181810864377830b145a8a573b91d42b41eb2df79ba";
  var KEY = "xz_gate_ok";
  var TOKEN = EXPECT;

  function unlock() {
    try {
      document.documentElement.classList.remove("xz-locked");
    } catch (e) {}
    var st = document.getElementById("xz-gate-hide");
    if (st && st.parentNode) st.parentNode.removeChild(st);
    var ov = document.getElementById("xz-gate");
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  }

  try {
    if (sessionStorage.getItem(KEY) === TOKEN) {
      unlock();
      return;
    }
  } catch (e) {}

  function hex(buf) {
    var a = new Uint8Array(buf);
    var s = "";
    for (var i = 0; i < a.length; i++) {
      var h = a[i].toString(16);
      s += h.length === 1 ? "0" + h : h;
    }
    return s;
  }

  function sha256hex(str) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      var enc = new TextEncoder().encode(str);
      return crypto.subtle.digest("SHA-256", enc).then(hex);
    }
    return Promise.resolve(sha256sync(str));
  }

  /* tiny sync SHA-256 (fallback for older WebViews) */
  function sha256sync(msg) {
    function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
    function toWords(s) {
      var utf8 = unescape(encodeURIComponent(s));
      var l = utf8.length;
      var nBlocks = (((l + 8) >>> 6) + 1);
      var w = new Array(nBlocks * 16);
      var i, j;
      for (i = 0; i < w.length; i++) w[i] = 0;
      for (i = 0; i < l; i++) w[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
      w[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
      w[nBlocks * 16 - 1] = l * 8;
      return w;
    }
    var K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var W = new Array(64);
    var words = toWords(msg);
    for (var i = 0; i < words.length; i += 16) {
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      var j, t1, t2, s0, s1, ch, maj;
      for (j = 0; j < 16; j++) W[j] = words[i + j] | 0;
      for (j = 16; j < 64; j++) {
        s0 = rotr(7, W[j - 15]) ^ rotr(18, W[j - 15]) ^ (W[j - 15] >>> 3);
        s1 = rotr(17, W[j - 2]) ^ rotr(19, W[j - 2]) ^ (W[j - 2] >>> 10);
        W[j] = (W[j - 16] + s0 + W[j - 7] + s1) | 0;
      }
      for (j = 0; j < 64; j++) {
        s1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
        ch = (e & f) ^ (~e & g);
        t1 = (h + s1 + ch + K[j] + W[j]) | 0;
        s0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
        maj = (a & b) ^ (a & c) ^ (b & c);
        t2 = (s0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    function whex(n) {
      var s = (n >>> 0).toString(16);
      return ("00000000" + s).slice(-8);
    }
    return whex(H[0]) + whex(H[1]) + whex(H[2]) + whex(H[3]) + whex(H[4]) + whex(H[5]) + whex(H[6]) + whex(H[7]);
  }

  function paint() {
    if (document.getElementById("xz-gate")) return;
    var ov = document.createElement("div");
    ov.id = "xz-gate";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "星泽预览访问");
    ov.innerHTML =
      '<div class="xz-gate-card">' +
      '<div class="xz-gate-brand">星泽</div>' +
      "<h1>星泽 · 预览访问</h1>" +
      '<p class="xz-gate-sub">内容筹备中，仅供内部预览</p>' +
      '<label class="xz-gate-lab" for="xz-user">账号</label>' +
      '<input id="xz-user" class="xz-gate-in" type="text" autocomplete="username" autocapitalize="off" spellcheck="false">' +
      '<label class="xz-gate-lab" for="xz-pass">密码</label>' +
      '<input id="xz-pass" class="xz-gate-in" type="password" autocomplete="current-password">' +
      '<button type="button" class="xz-gate-btn" id="xz-go">进入</button>' +
      '<p class="xz-gate-err" id="xz-err" hidden>账号或密码不正确</p>' +
      "</div>";
    var css = document.createElement("style");
    css.textContent =
      "#xz-gate{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;" +
      "background:#F7F3EA;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;color:#191C1A}" +
      ".xz-gate-card{width:min(92vw,360px);background:#fff;border:1px solid #C1C8C3;border-radius:12px;padding:28px 24px 24px;box-shadow:0 8px 28px rgba(25,28,26,.08)}" +
      ".xz-gate-brand{font-size:13px;letter-spacing:.12em;color:#5B7A6E;font-weight:600;margin-bottom:8px}" +
      "#xz-gate h1{margin:0 0 6px;font-size:20px;color:#436156;font-weight:700}" +
      ".xz-gate-sub{margin:0 0 18px;font-size:13px;color:#5F6662}" +
      ".xz-gate-lab{display:block;font-size:12px;color:#5F6662;margin:10px 0 4px}" +
      ".xz-gate-in{width:100%;box-sizing:border-box;font:inherit;font-size:15px;padding:10px 12px;border:1px solid #C1C8C3;border-radius:8px;background:#F7F3EA;color:#191C1A;outline:none}" +
      ".xz-gate-in:focus{border-color:#5B7A6E}" +
      ".xz-gate-btn{margin-top:18px;width:100%;font:inherit;font-size:15px;font-weight:600;padding:11px 16px;border:none;border-radius:999px;background:#5B7A6E;color:#fff;cursor:pointer}" +
      ".xz-gate-btn:active{background:#436156}" +
      ".xz-gate-err{margin:12px 0 0;font-size:13px;color:#a33;text-align:center}";
    (document.head || document.documentElement).appendChild(css);

    function mount() {
      (document.body || document.documentElement).appendChild(ov);
      var u = document.getElementById("xz-user");
      var p = document.getElementById("xz-pass");
      var go = document.getElementById("xz-go");
      var err = document.getElementById("xz-err");
      function submit() {
        err.hidden = true;
        var user = (u.value || "").trim();
        var pass = p.value || "";
        go.disabled = true;
        sha256hex(user + ":" + pass).then(function (h) {
          go.disabled = false;
          if (h === EXPECT) {
            try {
              sessionStorage.setItem(KEY, TOKEN);
            } catch (e) {}
            unlock();
          } else {
            err.hidden = false;
            p.value = "";
            p.focus();
          }
        });
      }
      go.addEventListener("click", submit);
      p.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") submit();
      });
      u.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") p.focus();
      });
      try {
        u.focus();
      } catch (e) {}
    }
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount);
  }

  paint();
})();
