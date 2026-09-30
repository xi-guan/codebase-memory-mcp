/* applies the stored theme before first paint; external because CSP forbids inline script */
(function () {
  try {
    var stored = localStorage.getItem("cbm-theme");
    var dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (_) {
    /* private mode or no matchMedia — keep the class already on <html> */
  }
})();
