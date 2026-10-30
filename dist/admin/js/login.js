(function () {
  var XZ = window.XZ;
  document.addEventListener("DOMContentLoaded", function () {
    XZ.showScfNotice();
    if (XZ.getToken() && XZ.scfConfigured()) {
      location.href = "../";
      return;
    }
    var form = XZ.qs("#login-form");
    var err = XZ.qs("#login-err");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      err.textContent = "";
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        var data = await XZ.api("/login", { password: XZ.qs("#password").value });
        XZ.setToken(data.token);
        location.href = "../";
      } catch (ex) {
        if (!XZ.scfConfigured()) {
          err.textContent = "SCF 尚未配置，无法登录";
        } else {
          err.textContent = ex.message === "unauthorized" ? "密码不正确" : String(ex.message || ex);
        }
      } finally {
        btn.disabled = false;
      }
    });
  });
})();
