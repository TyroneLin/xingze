(function () {
  var XZ = window.XZ;
  document.addEventListener("DOMContentLoaded", function () {
    if (!XZ.requireAuth()) return;
    XZ.bindLogout();
    XZ.showScfNotice();
    XZ.loadJson("/data/products.json").then(function (p) {
      var el = document.getElementById("meta-products");
      if (el) el.textContent = (p.items || []).length + " 件 · products.json";
    }).catch(function () {});
    XZ.loadJson("/data/finds.json").then(function (f) {
      var el = document.getElementById("meta-finds");
      if (el) el.textContent = (f.items || []).length + " 条 · finds.json";
    }).catch(function () {});
  });
})();
