/* Chip filters only. All list HTML is baked at build time — no fetch, no JSON render. */
(function () {
  document.querySelectorAll(".chips").forEach(function (chips) {
    chips.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".chip");
      if (!btn) return;
      chips.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("on", c === btn);
      });
      var filter = btn.getAttribute("data-filter");
      var target =
        chips.nextElementSibling &&
        chips.nextElementSibling.matches("[data-filter-target],.grid,.feed")
          ? chips.nextElementSibling
          : chips.parentElement &&
            chips.parentElement.querySelector("[data-filter-target],.grid,.feed");
      if (!target) return;
      target.querySelectorAll("[data-cat]").forEach(function (node) {
        node.hidden = !(filter === "all" || node.getAttribute("data-cat") === filter);
      });
    });
  });
})();
