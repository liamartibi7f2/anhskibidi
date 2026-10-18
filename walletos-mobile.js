/* Wallet.OS — Mobile enhancements (độc lập, không sửa cashflow.js)
   1) Thanh điều hướng dưới + nút "+" nổi   2) Đồng bộ theme-color  */
(function () {
  'use strict';

  var T = {
    vi: { ov: 'Tổng quan', goals: 'Mục tiêu', ledger: 'Giao dịch', debt: 'Sổ nợ', ai: 'Cố vấn', add: 'Thêm giao dịch', nav: 'Điều hướng nhanh' },
    en: { ov: 'Overview', goals: 'Goals', ledger: 'Ledger', debt: 'Debts', ai: 'Advisor', add: 'Add transaction', nav: 'Quick navigation' }
  };
  var ICONS = {
    ov:     '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    goals:  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    ledger: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    debt:   '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h5"/>',
    ai:     '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>'
  };
  // Thứ tự = thứ tự xuất hiện trên trang; FAB chèn giữa mục 2 và 3
  var ITEMS = [
    { k: 'ov',     sel: '.cfd-host' },
    { k: 'goals',  sel: '#cfg-goals' },
    { k: 'ledger', sel: '.hub-cf-ledger' },
    { k: 'debt',   sel: '.hub-cf-debt-ledger' },
    { k: 'ai',     sel: '#cfx-ai' }
  ];
  var THEME_COLORS = { 'cyberpunk': '#0a0a0f', 'solar-zen': '#f8fafc', 'lofi-twilight': '#1a1b26', 'ember-noir': '#110c0a' };

  function lang() {
    try { if (window.app && window.app.getLanguage) return window.app.getLanguage() === 'en' ? 'en' : 'vi'; } catch (e) {}
    return localStorage.getItem('hub_system_language') === 'en' ? 'en' : 'vi';
  }
  function svg(path) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + path + '</svg>'; }

  var nav, buttons = {};

  function build() {
    nav = document.createElement('nav');
    nav.className = 'st-bottomnav';
    var html = '';
    ITEMS.forEach(function (it, i) {
      if (i === 2) html += '<button type="button" class="st-nav-fab" id="st-nav-add">' + svg('<path d="M12 5v14M5 12h14"/>') + '</button>';
      html += '<button type="button" class="st-nav-item" data-k="' + it.k + '">' + svg(ICONS[it.k]) + '<span></span></button>';
    });
    nav.innerHTML = html;
    document.body.appendChild(nav);
    ITEMS.forEach(function (it) { buttons[it.k] = nav.querySelector('[data-k="' + it.k + '"]'); });
    labels();

    nav.addEventListener('click', function (e) {
      var fab = e.target.closest('#st-nav-add');
      var btn = e.target.closest('.st-nav-item');
      if (fab) {
        buzz();
        var add = document.getElementById('hub-cf-btn-add');
        if (add) add.click();
        return;
      }
      if (!btn) return;
      buzz();
      var it = ITEMS.filter(function (x) { return x.k === btn.getAttribute('data-k'); })[0];
      var el = it && document.querySelector(it.sel);
      if (el) el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    });
  }

  function labels() {
    var d = T[lang()];
    ITEMS.forEach(function (it) { buttons[it.k].querySelector('span').textContent = d[it.k]; });
    var fab = nav.querySelector('#st-nav-add');
    fab.setAttribute('aria-label', d.add);
    fab.title = d.add;
    nav.setAttribute('aria-label', d.nav);
  }

  function reduced() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function buzz() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }

  // Scroll-spy: khối nào đang chiếm ~40% chiều cao màn hình trên cùng thì sáng lên
  var ticking = false;
  function spy() {
    ticking = false;
    var line = window.innerHeight * 0.4, active = null;
    ITEMS.forEach(function (it) {
      var el = document.querySelector(it.sel);
      if (el && el.getBoundingClientRect().top <= line) active = it.k;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) active = ITEMS[ITEMS.length - 1].k;
    ITEMS.forEach(function (it) {
      var on = it.k === (active || ITEMS[0].k);
      buttons[it.k].classList.toggle('is-active', on);
      if (on) buttons[it.k].setAttribute('aria-current', 'true'); else buttons[it.k].removeAttribute('aria-current');
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }

  // theme-color theo giao diện hiện tại (thanh trạng thái của trình duyệt/PWA)
  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    var opt = document.body.classList.contains('theme-optimized');
    meta.content = opt ? '#000000' : (THEME_COLORS[document.documentElement.getAttribute('data-theme')] || '#1a1b26');
  }

  // Gắn class body.st-sheet-open khi có modal / ngăn kéo / popover đang hiển thị
  var OVERLAYS = '.hub-cf-overlay, .hub-cf-bs-overlay, .hub-cf-ai-key-modal, .hub-cf-filter-popover, .cfx-hist';
  var sheetTick = false;
  function checkSheets() {
    sheetTick = false;
    var open = Array.prototype.some.call(document.querySelectorAll(OVERLAYS), function (el) {
      var cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && el.getClientRects().length > 0;
    });
    if (document.body.classList.contains('st-sheet-open') !== open) document.body.classList.toggle('st-sheet-open', open);
  }
  function queueSheets() { if (!sheetTick) { sheetTick = true; requestAnimationFrame(checkSheets); } }

  function init() {
    build();
    checkSheets();
    new MutationObserver(queueSheets).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    syncThemeColor();
    spy();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('hubLanguageChanged', function () { labels(); });
    new MutationObserver(syncThemeColor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    new MutationObserver(syncThemeColor).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    // Các khối do cashflow.js render muộn → cập nhật lại khi DOM thay đổi
    var mount = document.getElementById('cashflow-mount');
    if (mount) new MutationObserver(onScroll).observe(mount.parentNode, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
