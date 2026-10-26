
/* soloDS Box Pro — hide LEFT sidebar until Drive is connected */
(() => {
  'use strict';

  const style = document.createElement('style');
  style.id = 'solods-drive-sidebar-guard';

  style.textContent = `
    body:not(.solods-drive-ready) #sds-elegant,
    body:not(.solods-drive-ready) #se-mobile-open,
    body:not(.solods-drive-ready) #se-backdrop {
      display: none !important;
    }

    body:not(.solods-drive-ready).se-sidebar-desktop,
    body:not(.solods-drive-ready).se-sidebar-mini {
      padding-left: 0 !important;
    }
  `;

  document.head.appendChild(style);

  function update() {
    const dashboard = document.getElementById('mainContent');
    const connect = document.getElementById('connectSection');

    const dashboardVisible =
      !!dashboard &&
      getComputedStyle(dashboard).display !== 'none' &&
      (!connect || getComputedStyle(connect).display === 'none');

    document.body.classList.toggle(
      'solods-drive-ready',
      dashboardVisible
    );
  }

  function start() {
    update();

    const observer = new MutationObserver(update);

    for (const id of ['mainContent', 'connectSection']) {
      const el = document.getElementById(id);

      if (el) {
        observer.observe(el, {
          attributes: true,
          attributeFilter: ['style', 'class', 'hidden']
        });
      }
    }

    window.addEventListener('pageshow', update);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {
      once: true
    });
  } else {
    start();
  }
})();
