/* soloDS Box Pro — independent right quick-access sidebar, v1.0 */
(() => {
  'use strict';
  if (window.soloDSRightSidebar) return;
  const ID = 'solods-right-quickbar';
  const items = [
    ['photos','Photos','📸'], ['bookmarks','Bookmarks','🔖'],
    ['notes','Notes','📝'], ['links','Links','🔗'],
    ['files','Files','📁'], ['filedrop','File Drop','☁️'],
    ['qr','QR Studio','▦'], ['scan','Scan Pro','▣'],
    ['toolkit','File Toolkit','🧰'], ['library','Digital Library','📚']
  ];
  const apis = {
    filedrop: ['soloDSFileDrop'], qr: ['soloDSQR'],
    scan: ['soloDSScanner'], toolkit: ['soloDSFileToolkit'],
    library: ['soloDSLibrary']
  };
  const icons = {
    photos:'camera', bookmarks:'bookmark', notes:'file-text', links:'link',
    files:'folder', filedrop:'cloud-upload', qr:'qr-code', scan:'scan-line',
    toolkit:'wrench', library:'book-open'
  };
  const svg = (name) => {
    const paths = {
      camera:'<path d="M14.5 4h-5L7 7H3a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4z"/><circle cx="12" cy="13" r="3"/>',
      bookmark:'<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-5-7 5V4a1 1 0 0 1 1-1z"/>',
      'file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
      link:'<path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
      folder:'<path d="M3 5h6l2 3h10v11H3z"/>',
      'cloud-upload':'<path d="M20 17a4 4 0 0 0-1-7.8A7 7 0 0 0 5.5 11 4 4 0 0 0 6 19h3"/><path d="M12 21V12m-4 4 4-4 4 4"/>',
      'qr-code':'<rect x="2" y="2" width="8" height="8"/><rect x="14" y="2" width="8" height="8"/><rect x="2" y="14" width="8" height="8"/><path d="M14 14h3v3h-3zM21 14v3h-3M14 21h3M21 19v3"/>',
      'scan-line':'<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4M3 12h18"/>',
      wrench:'<path d="M14 7a5 5 0 0 0-7 7l-5 5a2 2 0 0 0 3 3l5-5a5 5 0 0 0 7-7l-3 3-3-3z"/>',
      'book-open':'<path d="M12 6c-3-2-7-2-10-1v14c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 1zM12 6v14"/>'
    };
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
  };
  const style = document.createElement('style');
  style.textContent = `
    #${ID}{position:fixed;z-index:9000;right:10px;top:50%;transform:translateY(-50%);width:62px;max-height:calc(100dvh - 28px);overflow:visible;background:#050505;border:1px solid #303038;border-radius:20px;padding:10px 6px;box-shadow:0 12px 35px #0009;display:flex;flex-direction:column;align-items:center;gap:5px}
    #${ID} .sqr-btn{position:relative;flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:46px;height:46px;border:0;border-radius:12px;color:#e7e7ee;background:transparent;cursor:pointer;touch-action:manipulation;transition:background .18s,color .18s,transform .18s}
    #${ID} .sqr-btn:hover,#${ID} .sqr-btn:focus-visible{background:#222236;color:#aeb9ff;transform:translateX(-2px);outline:2px solid transparent}
    #${ID} .sqr-btn[aria-current="page"]{background:#272054;color:#c5b7ff}
    #${ID} .sqr-btn::before{content:attr(data-label);position:absolute;right:calc(100% + 13px);top:50%;transform:translateY(-50%);background:#050505;border:1px solid #343444;color:white;border-radius:9px;padding:7px 10px;font:500 12px system-ui;white-space:nowrap;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s}
    #${ID} .sqr-btn:hover::before,#${ID} .sqr-btn:focus-visible::before{opacity:1;visibility:visible}
    #${ID} .sqr-head{font:700 9px system-ui;letter-spacing:1.4px;color:#9292a6;margin:0 0 4px}
    #${ID} .sqr-toggle{display:none}
    #${ID} .sqr-notice{position:absolute;right:calc(100% + 12px);bottom:0;background:#101016;border:1px solid #45455a;color:white;border-radius:10px;padding:12px;font:13px system-ui;width:220px;box-shadow:0 8px 30px #0009}
    @media(max-height:650px) and (min-width:701px){#${ID}{top:8px;transform:none;overflow-y:auto;max-height:calc(100dvh - 16px)}#${ID} .sqr-btn{height:40px}}
    @media(max-width:700px){#${ID}{right:8px;top:auto;bottom:12px;transform:none;width:54px;max-height:calc(100dvh - 24px);overflow-y:auto;padding:6px 4px;border-radius:16px;gap:3px}#${ID} .sqr-btn{width:43px;height:43px}#${ID} .sqr-head{display:none}#${ID}.sqr-collapsed{width:52px;max-height:52px;overflow:visible}#${ID}.sqr-collapsed .sqr-btn{display:none}#${ID} .sqr-toggle{display:flex;position:sticky;bottom:0;flex-shrink:0;background:#1d1d2d;color:white}#${ID}.sqr-collapsed .sqr-toggle{display:flex}#${ID} .sqr-btn::before{display:none}#${ID} .sqr-notice{position:fixed;right:60px;bottom:0;width:min(240px,calc(100vw - 90px))}}
    @media(prefers-reduced-motion:reduce){#${ID} *{transition:none!important}}
  `;
  document.head.appendChild(style);
  const bar = document.createElement('aside');
  bar.id = ID;
  bar.setAttribute('aria-label', 'soloDS right quick access');
  bar.className = 'sqr-collapsed';
  bar.innerHTML = '<div class="sqr-head">QUICK</div>' + items.map(([id,label]) =>
    `<button type="button" class="sqr-btn" data-target="${id}" data-label="${label}" title="${label}" aria-label="${label}">${svg(icons[id])}</button>`
  ).join('') + `<button type="button" class="sqr-btn sqr-toggle" aria-label="Expand quick access" aria-expanded="false" title="Toggle quick access">${svg('folder')}</button>`;
  function notice(message) {
    bar.querySelector('.sqr-notice')?.remove();
    const el = document.createElement('div');
    el.className = 'sqr-notice';
    el.textContent = message;
    bar.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  function openTarget(id) {
    const tab = document.querySelector(`nav button[data-tab="${id}"]`);
    if (tab) { tab.click(); bar.querySelectorAll('[data-target]').forEach(b => b.removeAttribute('aria-current')); bar.querySelector(`[data-target="${id}"]`)?.setAttribute('aria-current','page'); return; }
    for (const name of apis[id] || []) {
      const api = window[name];
      if (api && typeof api.open === 'function') { api.open(); return; }
    }
    // Fallback: let the installed left sidebar handle the action, if present.
    const navButton = document.querySelector(`[data-module="${id}"], [data-page="${id}"], [data-id="${id}"]`);
    if (navButton && !bar.contains(navButton)) { navButton.click(); return; }
    notice(`${items.find(x => x[0] === id)?.[1] || id} is not available on this page.`);
  }
  bar.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.classList.contains('sqr-toggle')) {
      const collapsed = bar.classList.toggle('sqr-collapsed');
      button.setAttribute('aria-expanded', String(!collapsed));
      button.setAttribute('aria-label', collapsed ? 'Expand quick access' : 'Collapse quick access');
      return;
    }
    openTarget(button.dataset.target);
    if (matchMedia('(max-width:700px)').matches) {
      bar.classList.add('sqr-collapsed');
      bar.querySelector('.sqr-toggle').setAttribute('aria-expanded','false');
    }
  });
  function mount() { if (!document.getElementById(ID)) document.body.appendChild(bar); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
  window.soloDSRightSidebar = {open: () => {mount();bar.classList.remove('sqr-collapsed');}, close: () => bar.classList.add('sqr-collapsed'), version:'1.0'};
})();
