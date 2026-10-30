/* 星泽 · WeChat consult modal — QR placeholder only; no deep links / invented IDs */
(function () {
  var modal = document.getElementById("wechat-modal");
  if (!modal) return;

  var lastFocus = null;

  function openWechatModal() {
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    var closeBtn = modal.querySelector(".xz-modal__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeWechatModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("hidden", "");
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  modal.querySelectorAll("[data-close-wechat]").forEach(function (el) {
    el.addEventListener("click", closeWechatModal);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeWechatModal();
    }
  });

  function bindTriggers() {
    var sel =
      "[data-wechat-consult], .sticky-cta, .top-cta, a[href='#wechat']";
    document.querySelectorAll(sel).forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        openWechatModal();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindTriggers);
  } else {
    bindTriggers();
  }
})();
