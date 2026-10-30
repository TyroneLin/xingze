(function () {
  var XZ = window.XZ;
  var pj = null;
  document.addEventListener("DOMContentLoaded", function () {
    if (!XZ.requireAuth()) return;
    XZ.bindLogout();
    XZ.showScfNotice();
    document.getElementById("saveBtn").addEventListener("click", async function () {
      XZ.setBanner("");
      if (!pj) return;
      pj.origins = pj.origins || {};
      pj.origins.o1 = document.getElementById("o1").value.trim();
      pj.origins.o2 = document.getElementById("o2").value.trim();
      pj.origins.o3 = document.getElementById("o3").value.trim();
      var btn = document.getElementById("saveBtn");
      btn.disabled = true;
      try {
        if (!XZ.scfConfigured()) throw new Error("SCF 未配置，无法保存");
        await XZ.saveAndRebuild("data/products.json", pj, []);
        XZ.showToast("ok", "已保存");
      } catch (ex) {
        XZ.setBanner("保存失败：" + (ex.message || ex) + "。文案未丢失，可重试。");
        XZ.showToast("err", "保存失败");
      } finally {
        btn.disabled = false;
      }
    });
    XZ.loadJson("/data/products.json").then(function (d) {
      pj = d;
      var o = d.origins || {};
      document.getElementById("o1").value = o.o1 || "";
      document.getElementById("o2").value = o.o2 || "";
      document.getElementById("o3").value = o.o3 || "";
      document.getElementById("form").hidden = false;
    }).catch(function (e) {
      document.querySelector(".lead").textContent = String(e.message || e);
    });
  });
})();
