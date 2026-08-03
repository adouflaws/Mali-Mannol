(function () {
  var hero = document.querySelector(".hero");
  var bg = document.querySelector(".hero-bg");
  if (!hero || !bg) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pointerFine = window.matchMedia("(pointer: fine)").matches;
  if (reduceMotion || !pointerFine) return;

  var MAX_OFFSET = 10;

  hero.addEventListener("mousemove", function (e) {
    var rect = hero.getBoundingClientRect();
    var relX = (e.clientX - rect.left) / rect.width - 0.5;
    var relY = (e.clientY - rect.top) / rect.height - 0.5;
    var x = (-relX * MAX_OFFSET).toFixed(2);
    var y = (-relY * MAX_OFFSET).toFixed(2);
    bg.style.transform = "translate3d(" + x + "px, " + y + "px, 0)";
  });

  hero.addEventListener("mouseleave", function () {
    bg.style.transform = "translate3d(0, 0, 0)";
  });
})();
