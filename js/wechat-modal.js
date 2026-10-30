/* 星泽 · WeChat consult modal — QR placeholder only; no deep links / invented IDs
   Open/close: opacity/visibility CSS; delay [hidden] until fade finishes. */
(function () {
  var modal = document.getElementById("wechat-modal");
  if (!modal) return;

  var lastFocus = null;
  var closeTimer = null;

  function openWechatModal() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    lastFocus = document.activeElement;
    modal.removeAttribute("hidden");
    // reflow so closed styles apply before opening
    void modal.offsetWidth;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    var closeBtn = modal.querySelector(".xz-modal__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeWechatModal() {
    if (!modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      modal.setAttribute("hidden", "");
      document.body.style.overflow = "";
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }
    var backdrop = modal.querySelector(".xz-modal__backdrop") || modal;
    function onEnd(e) {
      if (e.target !== backdrop && e.target !== modal) return;
      backdrop.removeEventListener("transitionend", onEnd);
      finish();
    }
    backdrop.addEventListener("transitionend", onEnd);
    closeTimer = setTimeout(finish, 400);
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

/* Optional: soft reveal + non-LCP image fade (no-op if classes absent) */
(function () {
  function markRevealsIn() {
    document.querySelectorAll(".xz-reveal").forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  function setupReveal() {
    var nodes = document.querySelectorAll(".xz-reveal");
    if (!nodes.length) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      markRevealsIn();
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    nodes.forEach(function (el) {
      io.observe(el);
    });
  }

  function setupImgFade() {
    document.querySelectorAll("img.xz-img-fade").forEach(function (img) {
      function done() {
        img.classList.add("is-loaded");
      }
      if (img.complete && img.naturalWidth) done();
      else img.addEventListener("load", done);
    });
  }

  function boot() {
    setupReveal();
    setupImgFade();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
