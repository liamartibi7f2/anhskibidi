/* Wallet.OS — Mobile theme-color sync (độc lập, không sửa cashflow.js) */
(function () {
  'use strict';

  var THEME_COLORS = { 'cyberpunk': '#0a0a0f', 'solar-zen': '#f8fafc', 'lofi-twilight': '#1a1b26', 'ember-noir': '#110c0a' };

  // theme-color theo giao diện hiện tại (thanh trạng thái của trình duyệt/PWA)
  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    var opt = document.body.classList.contains('theme-optimized');
    meta.content = opt ? '#000000' : (THEME_COLORS[document.documentElement.getAttribute('data-theme')] || '#1a1b26');
  }

  function init() {
    var oldNav = document.querySelector('.st-bottomnav');
    if (oldNav) oldNav.remove();
    syncThemeColor();
    new MutationObserver(syncThemeColor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    new MutationObserver(syncThemeColor).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
