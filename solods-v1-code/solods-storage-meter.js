
/*
 * soloDS Box Pro — Google Account & Storage
 * File: solods-storage-meter.js
 *
 * Displays at the bottom of the existing left sidebar.
 * No external libraries required.
 */

(() => {
  "use strict";

  if (window.__solodsStorageMeterLoaded) return;
  window.__solodsStorageMeterLoaded = true;

  const STYLE_ID = "solods-storage-meter-css";
  const WIDGET_ID = "solods-storage-meter";

  const API =
    "https://www.googleapis.com/drive/v3/about" +
    "?fields=user(displayName,emailAddress),storageQuota(limit,usage)";

  const REFRESH_MS = 5 * 60 * 1000;

  let lastToken = "";
  let lastRefresh = 0;
  let loading = false;

  // Change this list only if your sidebar has another ID.
  const SIDEBAR_SELECTORS = [
    "#sds-elegant",
    ".se-sidebar",
    "#solods-sidebar"
  ];

  function getSidebar() {
    for (const selector of SIDEBAR_SELECTORS) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  function dashboardVisible() {
    const main = document.getElementById("mainContent");
    const connect = document.getElementById("connectSection");

    if (!main) return false;

    const mainStyle = getComputedStyle(main);

    if (
      main.hidden ||
      mainStyle.display === "none" ||
      mainStyle.visibility === "hidden"
    ) {
      return false;
    }

    if (connect) {
      const connectStyle = getComputedStyle(connect);

      if (
        !connect.hidden &&
        connectStyle.display !== "none" &&
        connectStyle.visibility !== "hidden"
      ) {
        return false;
      }
    }

    return true;
  }

  function getToken() {
    // Preferred: existing dashboard supplies its OAuth token.
    if (typeof window.solodsGetDriveToken === "function") {
      try {
        const token = window.solodsGetDriveToken();
        if (typeof token === "string" && token.trim()) {
          return token.trim();
        }
      } catch (error) {
        console.warn("soloDS token accessor error:", error);
      }
    }

    // Common global token names.
    const globals = [
      window.accessToken,
      window.googleAccessToken,
      window.driveAccessToken
    ];

    for (const token of globals) {
      if (typeof token === "string" && token.trim()) {
        return token.trim();
      }
    }

    return "";
  }

  function formatBytes(value) {
    const bytes = Number(value);

    if (!Number.isFinite(bytes) || bytes < 0) {
      return "Unknown";
    }

    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let number = bytes;
    let index = 0;

    while (number >= 1024 && index < units.length - 1) {
      number /= 1024;
      index++;
    }

    return `${number.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      #${WIDGET_ID} {
        box-sizing: border-box;
        width: calc(100% - 20px);
        margin: 16px 10px 20px;
        padding: 14px;
        background: #080a10;
        color: #f8fafc;
        border: 1px solid #2b3040;
        border-radius: 14px;
        font-family: inherit;
        font-size: 12px;
        line-height: 1.5;
        overflow: hidden;
      }

      #${WIDGET_ID}[hidden] {
        display: none !important;
      }

      #${WIDGET_ID} .sds-sm-heading {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        font-size: 12px;
        font-weight: 700;
        color: #e9d5ff;
      }

      #${WIDGET_ID} .sds-sm-account {
        padding-bottom: 12px;
        border-bottom: 1px solid #252938;
      }

      #${WIDGET_ID} .sds-sm-name {
        font-weight: 600;
        color: #ffffff;
        overflow-wrap: anywhere;
      }

      #${WIDGET_ID} .sds-sm-email {
        margin-top: 2px;
        color: #a5b4c8;
        font-size: 11px;
        overflow-wrap: anywhere;
      }

      #${WIDGET_ID} .sds-sm-storage-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin: 12px 0 8px;
        font-weight: 600;
      }

      #${WIDGET_ID} .sds-sm-refresh {
        background: #1c2030;
        border: 1px solid #343b50;
        border-radius: 7px;
        color: #d8b4fe;
        padding: 4px 8px;
        font: inherit;
        cursor: pointer;
        min-height: 30px;
      }

      #${WIDGET_ID} .sds-sm-refresh:hover {
        background: #30364b;
      }

      #${WIDGET_ID} .sds-sm-refresh:disabled {
        opacity: .5;
        cursor: wait;
      }

      #${WIDGET_ID} .sds-sm-track {
        width: 100%;
        height: 9px;
        overflow: hidden;
        border-radius: 999px;
        background: #303547;
      }

      #${WIDGET_ID} .sds-sm-fill {
        width: 0;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #7c3aed, #22d3ee);
        transition: width .4s ease;
      }

      #${WIDGET_ID} .sds-sm-stats {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 9px;
        color: #cbd5e1;
      }

      #${WIDGET_ID} .sds-sm-available {
        margin-top: 5px;
        color: #86efac;
      }

      #${WIDGET_ID} .sds-sm-status {
        margin-top: 8px;
        font-size: 11px;
        color: #94a3b8;
      }

      @media (max-width: 768px) {
        #${WIDGET_ID} {
          margin-bottom: 24px;
        }

        #${WIDGET_ID} .sds-sm-refresh {
          min-height: 40px;
          min-width: 40px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createWidget() {
    let widget = document.getElementById(WIDGET_ID);
    if (widget) return widget;

    const sidebar = getSidebar();
    if (!sidebar) return null;

    widget = document.createElement("section");
    widget.id = WIDGET_ID;
    widget.hidden = true;
    widget.setAttribute("aria-label", "Google account and storage");

    widget.innerHTML = `
      <div class="sds-sm-heading">
        <span aria-hidden="true">☁</span>
        <span>Google Account &amp; Storage</span>
      </div>

      <div class="sds-sm-account">
        <div class="sds-sm-name" data-sm-name>Google Drive</div>
        <div class="sds-sm-email" data-sm-email>Connecting...</div>
      </div>

      <div class="sds-sm-storage-title">
        <span>Drive Storage</span>
        <button
          type="button"
          class="sds-sm-refresh"
          data-sm-refresh
          title="Refresh storage"
          aria-label="Refresh storage information"
        >↻</button>
      </div>

      <div
        class="sds-sm-track"
        role="progressbar"
        aria-label="Drive storage used"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="0"
      >
        <div class="sds-sm-fill" data-sm-fill></div>
      </div>

      <div class="sds-sm-stats">
        <span data-sm-used>-- used</span>
        <span data-sm-total>-- total</span>
      </div>

      <div class="sds-sm-available" data-sm-available>
        Available: --
      </div>

      <div class="sds-sm-status" data-sm-status aria-live="polite">
        Waiting for Drive...
      </div>
    `;

    sidebar.appendChild(widget);

    widget.querySelector("[data-sm-refresh]")
      .addEventListener("click", () => refresh(true));

    return widget;
  }

  function setText(selector, value) {
    const widget = document.getElementById(WIDGET_ID);
    const element = widget?.querySelector(selector);

    if (element) element.textContent = value;
  }

  function clearAccount() {
    setText("[data-sm-name]", "Google Drive");
    setText("[data-sm-email]", "Connecting...");
    setText("[data-sm-used]", "-- used");
    setText("[data-sm-total]", "-- total");
    setText("[data-sm-available]", "Available: --");
    setText("[data-sm-status]", "Waiting for Drive...");

    const widget = document.getElementById(WIDGET_ID);
    const fill = widget?.querySelector("[data-sm-fill]");
    const track = widget?.querySelector(".sds-sm-track");

    if (fill) fill.style.width = "0%";
    if (track) track.setAttribute("aria-valuenow", "0");
  }

  async function refresh(force = false) {
    if (loading || !dashboardVisible()) return;

    const token = getToken();
    const widget = createWidget();

    if (!widget || !token) {
      if (widget) {
        widget.hidden = !dashboardVisible();
        setText(
          "[data-sm-status]",
          "Waiting for Google Drive access token..."
        );
      }
      return;
    }

    const now = Date.now();

    if (
      !force &&
      token === lastToken &&
      now - lastRefresh < REFRESH_MS
    ) {
      return;
    }

    loading = true;
    lastToken = token;

    const button = widget.querySelector("[data-sm-refresh]");
    if (button) button.disabled = true;

    setText("[data-sm-status]", "Updating storage...");

    try {
      const response = await fetch(API, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Google Drive API returned ${response.status}`);
      }

      const data = await response.json();

      // Ignore a response if the account changed meanwhile.
      if (
        !dashboardVisible() ||
        token !== getToken()
      ) {
        return;
      }

      const user = data.user || {};
      const quota = data.storageQuota || {};

      setText(
        "[data-sm-name]",
        user.displayName || "Google Drive"
      );

      setText(
        "[data-sm-email]",
        user.emailAddress || "Connected account"
      );

      const used = Number(quota.usage);
      const total = Number(quota.limit);

      if (Number.isFinite(used) && used >= 0) {
        setText("[data-sm-used]", `${formatBytes(used)} used`);
      } else {
        setText("[data-sm-used]", "Usage unavailable");
      }

      const hasLimit = Number.isFinite(total) && total > 0;

      if (hasLimit && Number.isFinite(used) && used >= 0) {
        const percent = Math.min(100, Math.max(0, used / total * 100));
        const available = Math.max(0, total - used);

        setText("[data-sm-total]", `${formatBytes(total)} total`);
        setText(
          "[data-sm-available]",
          `Available: ${formatBytes(available)}`
        );

        const fill = widget.querySelector("[data-sm-fill]");
        const track = widget.querySelector(".sds-sm-track");

        if (fill) fill.style.width = `${percent}%`;
        if (track) {
          track.setAttribute("aria-valuenow", String(Math.round(percent)));
        }
      } else {
        setText("[data-sm-total]", "No quota limit reported");
        setText("[data-sm-available]", "Available: Not reported");
      }

      lastRefresh = Date.now();
      setText("[data-sm-status]", "Storage information updated");

    } catch (error) {
      console.warn("soloDS storage meter:", error);
      setText(
        "[data-sm-status]",
        "Unable to load storage. Check Drive connection."
      );
    } finally {
      loading = false;
      if (button) button.disabled = false;
    }
  }

  function sync() {
    const widget = createWidget();
    if (!widget) return;

    const visible = dashboardVisible();
    widget.hidden = !visible;

    if (!visible) {
      lastRefresh = 0;
      lastToken = "";
      clearAccount();
      return;
    }

    const token = getToken();

    if (token && token !== lastToken) {
      lastRefresh = 0;
      clearAccount();
    }

    if (token) refresh();
  }

  function start() {
    addStyles();
    createWidget();
    sync();

    const main = document.getElementById("mainContent");
    const connect = document.getElementById("connectSection");

    const observer = new MutationObserver(sync);

    for (const element of [main, connect]) {
      if (element) {
        observer.observe(element, {
          attributes: true,
          attributeFilter: ["style", "class", "hidden"]
        });
      }
    }

    // Sidebar may be inserted by another standalone JS file.
    const sidebarObserver = new MutationObserver(() => {
      if (!document.getElementById(WIDGET_ID)) {
        createWidget();
        sync();
      }
    });

    sidebarObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Lightweight periodic check, not repeated API calls.
    setInterval(sync, 5000);

    window.addEventListener("pageshow", sync);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) sync();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
