(function () {
  var header = document.querySelector(".site-header");
  if (!header) return;

  function setHeaderHeight() {
    document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  }
  setHeaderHeight();
  window.addEventListener("resize", setHeaderHeight);

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();
