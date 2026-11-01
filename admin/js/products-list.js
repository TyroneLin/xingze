(function () {
  var XZ = window.XZ;
  var state = { items: [], cats: {}, filter: "all", q: "" };

  function catLabel(k) {
    return (state.cats && state.cats[k]) || k;
  }

  function render() {
    var list = document.getElementById("list");
    var q = state.q.trim().toLowerCase();
    var rows = state.items.filter(function (it) {
      if (state.filter !== "all" && it.category !== state.filter) return false;
      if (!q) return true;
      return (it.id + " " + it.title).toLowerCase().indexOf(q) >= 0;
    });
    list.innerHTML = "";
    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "empty-cta";
      empty.innerHTML =
        "<p class=\"tiny\">没有匹配项</p>" +
        "<a class=\"btn sm\" href=\"edit.html?new=1\">新增产品</a>";
      list.appendChild(empty);
      return;
    }
    rows.forEach(function (it) {
      var a = document.createElement("a");
      a.className = "list-item";
      a.href = "edit.html?id=" + encodeURIComponent(it.id);
      var thumb = it.image
        ? "<div class=\"thumb has-img\"><img src=\"" + XZ.escapeHtml(it.image) + "\" alt=\"\"/></div>"
        : "<div class=\"thumb\">待 Leanne<br/>素材</div>";
      a.innerHTML =
        thumb +
        "<div class=\"list-body\">" +
        "<h3>" + XZ.escapeHtml(it.title) + "</h3>" +
        "<div class=\"meta\"><span class=\"mono\">" + XZ.escapeHtml(it.id) + "</span> · " + XZ.escapeHtml(it.spec || "") + "</div>" +
        "<div class=\"chips\"><span class=\"chip\">" + XZ.escapeHtml(catLabel(it.category)) + "</span></div>" +
        "</div>" +
        "<span class=\"btn sm ghost\">编辑</span>";
      list.appendChild(a);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!XZ.requireAuth()) return;
    XZ.bindLogout();
    XZ.showScfNotice();
    XZ.loadJson("/data/products.json").then(function (pj) {
      state.items = pj.items || [];
      state.cats = pj.categories || {};
      document.getElementById("lead").textContent =
        state.items.length + " 件藏品 · 点「编辑」改文案与主图，或「新增产品」";
      render();
    }).catch(function (e) {
      document.getElementById("lead").textContent = String(e.message || e);
    });
    document.getElementById("search").addEventListener("input", function (e) {
      state.q = e.target.value;
      render();
    });
    XZ.qsa(".filter").forEach(function (btn) {
      btn.addEventListener("click", function () {
        XZ.qsa(".filter").forEach(function (b) { b.classList.remove("on"); b.style.background = ""; b.style.color = ""; });
        btn.classList.add("on");
        btn.style.background = "var(--jade-soft)";
        btn.style.color = "var(--jade-d)";
        state.filter = btn.getAttribute("data-cat");
        render();
      });
    });
    var first = document.querySelector(".filter.on");
    if (first) { first.style.background = "var(--jade-soft)"; first.style.color = "var(--jade-d)"; }
  });
})();
