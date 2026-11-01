(function () {
  var XZ = window.XZ;
  document.addEventListener("DOMContentLoaded", function () {
    if (!XZ.requireAuth()) return;
    XZ.bindLogout();
    XZ.showScfNotice();
    XZ.loadJson("/data/finds.json").then(function (fj) {
      var cats = fj.categories || {};
      var items = fj.items || [];
      document.getElementById("lead").textContent =
        items.length + " 条动态 · 点「编辑」改文案与图片，或「新增结缘」";
      var list = document.getElementById("list");
      list.innerHTML = "";
      if (!items.length) {
        var empty = document.createElement("div");
        empty.className = "empty-cta";
        empty.innerHTML =
          "<p class=\"tiny\">还没有结缘动态</p>" +
          "<a class=\"btn sm\" href=\"edit.html?new=1\">新增结缘</a>";
        list.appendChild(empty);
        return;
      }
      items.forEach(function (it) {
        var a = document.createElement("a");
        a.className = "list-item";
        a.href = "edit.html?id=" + encodeURIComponent(it.id);
        var imgs = it.images || [];
        var first = imgs[0] && imgs[0].src;
        var thumb = first
          ? "<div class=\"thumb has-img\"><img src=\"" + XZ.escapeHtml(first) + "\" alt=\"\"/></div>"
          : "<div class=\"thumb\">待 Leanne<br/>素材</div>";
        var preview = (it.text || "").slice(0, 28) + ((it.text || "").length > 28 ? "…" : "");
        a.innerHTML =
          thumb +
          "<div class=\"list-body\">" +
          "<h3>" + XZ.escapeHtml(preview || it.id) + "</h3>" +
          "<div class=\"meta\"><span class=\"mono\">" + XZ.escapeHtml(it.id) + "</span> · " +
          XZ.escapeHtml(it.time || "") + (it.location ? " · " + XZ.escapeHtml(it.location) : "") + "</div>" +
          "<div class=\"chips\"><span class=\"chip\">" + XZ.escapeHtml(cats[it.category] || it.category || "") +
          "</span><span class=\"chip soft\">" + imgs.length + " 图</span></div>" +
          "</div><span class=\"btn sm ghost\">编辑</span>";
        list.appendChild(a);
      });
    }).catch(function (e) {
      document.getElementById("lead").textContent = String(e.message || e);
    });
  });
})();
