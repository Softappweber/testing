/* soloDS Box Pro — User Control v1.0
   UI visibility controller, NOT payment verification or security enforcement.
   Install in <head> with: <script src="./solods-user-control.js"></script>
   before other scripts so premium controls begin hidden.
*/
(function () {
  "use strict";
  if (window.soloDSUserControl) return;

  const STYLE_ID = "solods-user-control-style";
  const ATTR = "data-solods-user-access";
  const SIDEBAR_SELECTORS = [
    "#solods-sidebar", "#solods-premium-sidebar",
    "#soloDS-sidebar", "#soloDS-premium-sidebar",
    ".solods-sidebar", ".solods-premium-sidebar",
    ".soloDS-sidebar", ".soloDS-premium-sidebar",
    "[id*='solods'][id*='sidebar' i]",
    "[class*='solods'][class*='sidebar' i]",
    "[id*='sidebar'][id*='solods' i]",
    "[data-solods-sidebar]"
  ];
  const MAIL_SELECTORS = [
    "#solods-mail-launcher", "#solods-mail-button",
    "#solods-one-click-mail", ".solods-mail-launcher",
    ".solods-one-click-mail", "[data-solods-mail]",
    "[id*='solods'][id*='mail' i]",
    "[class*='solods'][class*='mail' i]"
  ];
  const HIDE = [...SIDEBAR_SELECTORS, ...MAIL_SELECTORS];
  let authorized = false;
  let lastState = "";
  let pending = false;

  const css = document.createElement("style");
  css.id = STYLE_ID;
  css.textContent = `
    html:not([${ATTR}="approved"]) :is(${HIDE.join(",")}) {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    html:not([${ATTR}="approved"]) #mainContent {
      display: none !important;
    }
    html[${ATTR}="approved"] #connectSection {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(css);
  document.documentElement.setAttribute(ATTR, "pending");

  function validConfig() {
    const user = new URLSearchParams(location.search).get("user") || "test";
    // Matches the existing dashboard's config.js mechanism.
    const config = window.USER_CONFIG;
    return !!(config && typeof config.apiUrl === "string" &&
      /^https:\/\//i.test(config.apiUrl) && user);
  }

  function dashboardVisible() {
    const main = document.getElementById("mainContent");
    if (!main) return false;
    return main.style.display === "block" ||
      (main.style.display !== "none" && getComputedStyle(main).display !== "none");
  }

  function showConnectScreen() {
    const connect = document.getElementById("connectSection");
    const main = document.getElementById("mainContent");
    if (main && main.style.display !== "none") main.style.display = "none";
    if (connect && connect.style.display !== "flex") connect.style.display = "flex";
  }

  function update() {
    pending = false;
    const hasConfig = validConfig();
    const connected = dashboardVisible();
    // This is a visual gate based on the dashboard's existing user config
    // and connection state, NOT an independent entitlement check.
    authorized = hasConfig && connected;
    const state = authorized ? "approved" : (hasConfig ? "connect" : "unregistered");
    if (state !== lastState) {
      document.documentElement.setAttribute(ATTR, state);
      lastState = state;
      window.dispatchEvent(new CustomEvent("solods:user-control", {
        detail: { state, premiumVisible: authorized }
      }));
    }
    if (!hasConfig && document.readyState !== "loading") showConnectScreen();
  }

  function schedule() {
    if (pending) return;
    pending = true;
    queueMicrotask(update);
  }

  const observer = new MutationObserver(schedule);
  function start() {
    observer.observe(document.documentElement, {
      subtree: true, childList: true,
      attributes: true, attributeFilter: ["style", "class"]
    });
    schedule();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else start();

  window.soloDSUserControl = Object.freeze({
    version: "1.0.0",
    refresh: schedule,
    getStatus: () => lastState || "pending",
    isPremiumVisible: () => authorized
  });
})();
