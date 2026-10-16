/* applies the stored theme before first paint; a file because the CSP forbids inline script */
(function () {
  var theme = 'dark';
  try {
    var stored = localStorage.getItem('cbm-theme');
    if (stored === 'light' || stored === 'dark') theme = stored;
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) theme = 'light';
  } catch (_) {
    /* private mode or no matchMedia: keep the dark default */
  }
  document.documentElement.dataset.theme = theme;
})();
