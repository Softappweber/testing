
/*!
 * soloDS Box Pro
 * Live Voice & Photo Upload
 * Standalone sidebar module
 *
 * Uses existing dashboard uploadFiles() where available.
 * No external libraries required.
 */
(() => {
  "use strict";

  if (window.__solodsLiveCaptureLoaded) return;
  window.__solodsLiveCaptureLoaded = true;

  const ID = "sds-live-capture";
  const SIDEBAR_ID = "sds-modern-vertical";

  let mediaRecorder = null;
  let recordedChunks = [];
  let recordedAudio = null;
  let photoFile = null;
  let cameraStream = null;
  let audioStream = null;
  let recordingStartedAt = 0;
  let timer = null;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  function notify(message, type = "info") {
    const status = $("#slc-status");
    if (!status) return;

    status.textContent = message;
    status.dataset.type = type;
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function stopTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
  }

  function stopCamera() {
    stopTracks(cameraStream);
    cameraStream = null;

    const video = $("#slc-video");
    if (video) video.srcObject = null;
  }

  function cleanup() {
    stopCamera();

    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }

    stopTracks(audioStream);
    audioStream = null;

    clearInterval(timer);
  }

  function makeButton(text, action, className = "") {
    return `<button type="button"
      class="slc-btn ${className}"
      data-action="${action}">${text}</button>`;
  }

  function injectStyles() {
    if ($("#slc-styles")) return;

    const style = document.createElement("style");
    style.id = "slc-styles";

    style.textContent = `
      #slc-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        background: rgba(2, 6, 23, .78);
        backdrop-filter: blur(9px);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 14px;
      }

      #slc-overlay.slc-open {
        display: flex;
      }

      #slc-dialog {
        width: min(620px, 100%);
        max-height: 94vh;
        overflow-y: auto;
        background: linear-gradient(
          145deg, #17243d, #090f21
        );
        color: #eef5ff;
        border: 1px solid #334766;
        border-radius: 22px;
        padding: 22px;
        box-shadow: 0 25px 90px #0009;
        font-family: system-ui, sans-serif;
      }

      .slc-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }

      .slc-title {
        font-size: 22px;
        font-weight: 800;
        margin: 0;
      }

      .slc-subtitle {
        font-size: 13px;
        color: #9db3d2;
        margin-top: 5px;
      }

      .slc-close {
        background: #25334e;
        border: 1px solid #3a4c6a;
        color: white;
        border-radius: 10px;
        padding: 8px 12px;
        cursor: pointer;
      }

      .slc-unique {
        margin: 18px 0;
        padding: 14px;
        border: 1px solid #376fbd;
        border-radius: 14px;
        background: linear-gradient(
          110deg, #163e73, #152345
        );
      }

      .slc-unique strong {
        color: #8eeaff;
        font-size: 14px;
      }

      .slc-unique p {
        margin: 7px 0 0;
        font-size: 12px;
        line-height: 1.6;
        color: #d3e6ff;
      }

      .slc-tabs {
        display: flex;
        gap: 8px;
        margin: 14px 0;
      }

      .slc-tab {
        flex: 1;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid #334866;
        background: #17243c;
        color: #b6c7e3;
        cursor: pointer;
        font-weight: 700;
      }

      .slc-tab.active {
        background: linear-gradient(
          110deg, #8f80fa, #48c7ed
        );
        color: white;
        border-color: transparent;
      }

      .slc-panel {
        display: none;
        background: #101b30;
        border: 1px solid #2b3d59;
        border-radius: 15px;
        padding: 16px;
      }

      .slc-panel.active {
        display: block;
      }

      .slc-panel h3 {
        margin: 0 0 8px;
        font-size: 16px;
      }

      .slc-help {
        font-size: 12px;
        color: #9eb2d0;
        line-height: 1.6;
      }

      .slc-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 14px;
      }

      .slc-btn {
        border: 1px solid #425775;
        background: #24334f;
        color: #f0f6ff;
        border-radius: 11px;
        padding: 11px 14px;
        cursor: pointer;
        font-weight: 700;
        font-size: 13px;
      }

      .slc-btn.primary {
        border: 0;
        background: linear-gradient(
          100deg, #8d83fb, #47c6ea
        );
        color: white;
      }

      .slc-btn.danger {
        background: #8d2943;
        border-color: #b83c59;
      }

      .slc-btn:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      #slc-timer {
        font-size: 34px;
        font-weight: 800;
        letter-spacing: 2px;
        text-align: center;
        padding: 18px;
        color: #9ee7ff;
      }

      #slc-audio {
        width: 100%;
        margin-top: 14px;
      }

      #slc-video {
        display: block;
        width: 100%;
        max-height: 310px;
        object-fit: contain;
        background: #020617;
        border-radius: 12px;
        margin-top: 12px;
      }

      #slc-photo-preview {
        display: none;
        width: 100%;
        max-height: 310px;
        object-fit: contain;
        border-radius: 12px;
        margin-top: 12px;
      }

      #slc-status {
        margin-top: 16px;
        font-size: 12px;
        color: #a7c0e0;
        line-height: 1.6;
        min-height: 20px;
      }

      #slc-status[data-type="error"] {
        color: #ff9bad;
      }

      #slc-status[data-type="success"] {
        color: #7af3bf;
      }

      #slc-sidebar-entry {
        cursor: pointer;
      }

      @media (max-width: 560px) {
        #slc-dialog {
          padding: 15px;
          border-radius: 16px;
        }

        .slc-title {
          font-size: 18px;
        }

        .slc-btn {
          flex: 1;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createPopup() {
    if ($("#slc-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "slc-overlay";

    overlay.innerHTML = `
      <section id="slc-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slc-heading">

        <div class="slc-header">
          <div>
            <h2 class="slc-title" id="slc-heading">
              🎙️ Live Voice & Photo Upload
            </h2>
            <div class="slc-subtitle">
              Capture now. Save directly to your soloDS Box.
            </div>
          </div>

          <button class="slc-close"
            data-action="close"
            aria-label="Close">
            ✕
          </button>
        </div>

        <div class="slc-unique">
          <strong>
            ✨ A special soloDS Box Pro feature
          </strong>
          <p>
            Unlike the usual Google Drive file-upload
            workflow, soloDS Box brings live microphone
            recording and camera capture together in one
            place. Record or capture, preview your content,
            and upload it to your connected Google Drive
            without first saving a separate file manually.
          </p>
        </div>

        <div class="slc-tabs">
          <button class="slc-tab active"
            data-tab="voice">
            🎙️ Live Voice
          </button>

          <button class="slc-tab"
            data-tab="photo">
            📸 Live Photo
          </button>
        </div>

        <div id="slc-voice-panel"
          class="slc-panel active">

          <h3>🎙️ Voice Recorder</h3>

          <p class="slc-help">
            Record using your microphone, listen to the
            result, and save the recording to Box Files.
          </p>

          <div id="slc-timer">00:00</div>

          <div class="slc-actions">
            ${makeButton("⏺ Start Recording", "start-record", "primary")}
            ${makeButton("⏹ Stop Recording", "stop-record", "danger")}
          </div>

          <audio id="slc-audio" controls></audio>

          <div class="slc-actions">
            ${makeButton("⬇ Download Audio", "download-audio")}
            ${makeButton("☁ Upload to Box Files", "upload-audio", "primary")}
          </div>
        </div>

        <div id="slc-photo-panel"
          class="slc-panel">

          <h3>📸 Live Camera</h3>

          <p class="slc-help">
            Open your camera, take a photo, preview it,
            and save it to Box Photos.
          </p>

          <video id="slc-video"
            autoplay
            playsinline
            muted></video>

          <img id="slc-photo-preview"
            alt="Captured photo preview">

          <div class="slc-actions">
            ${makeButton("📷 Open Camera", "open-camera", "primary")}
            ${makeButton("📸 Capture Photo", "capture-photo")}
            ${makeButton("🔄 Retake", "retake-photo")}
          </div>

          <div class="slc-actions">
            ${makeButton("⬇ Download Photo", "download-photo")}
            ${makeButton("☁ Upload to Box Photos", "upload-photo", "primary")}
          </div>
        </div>

        <div id="slc-status" role="status"></div>
      </section>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) closePopup();
    });

    overlay.addEventListener("click", async event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action;

      try {
        switch (action) {
          case "close":
            closePopup();
            break;

          case "start-record":
            await startRecording();
            break;

          case "stop-record":
            stopRecording();
            break;

          case "download-audio":
            downloadAudio();
            break;

          case "upload-audio":
            await uploadAudio();
            break;

          case "open-camera":
            await openCamera();
            break;

          case "capture-photo":
            capturePhoto();
            break;

          case "retake-photo":
            await openCamera();
            break;

          case "download-photo":
            downloadPhoto();
            break;

          case "upload-photo":
            await uploadPhoto();
            break;
        }
      } catch (error) {
        notify(error.message || "Operation failed.", "error");
      }
    });

    overlay.addEventListener("click", event => {
      const tab = event.target.closest("[data-tab]");
      if (!tab) return;

      const selected = tab.dataset.tab;

      overlay.querySelectorAll(".slc-tab").forEach(el => {
        el.classList.toggle(
          "active",
          el.dataset.tab === selected
        );
      });

      overlay.querySelectorAll(".slc-panel").forEach(el => {
        el.classList.toggle(
          "active",
          el.id === `slc-${selected}-panel`
        );
      });

      if (selected !== "photo") stopCamera();
    });

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        overlay.classList.contains("slc-open")
      ) {
        closePopup();
      }
    });
  }

  function openPopup() {
    createPopup();
    $("#slc-overlay").classList.add("slc-open");
    notify("Ready. Select voice recording or camera capture.");
  }

  function closePopup() {
    cleanup();
    $("#slc-overlay")?.classList.remove("slc-open");
  }

  function preferredAudioMime() {
    const formats = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4"
    ];

    return formats.find(type =>
      MediaRecorder.isTypeSupported(type)
    ) || "";
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Microphone access requires HTTPS and a compatible browser."
      );
    }

    if (!window.MediaRecorder) {
      throw new Error(
        "Audio recording is not supported by this browser."
      );
    }

    if (mediaRecorder?.state === "recording") return;

    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    recordedChunks = [];
    recordedAudio = null;

    const player = $("#slc-audio");
    if (player) player.removeAttribute("src");

    const mimeType = preferredAudioMime();

    mediaRecorder = new MediaRecorder(
      audioStream,
      mimeType ? { mimeType } : undefined
    );

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const type = mediaRecorder.mimeType || "audio/webm";
      const extension = type.includes("mp4") ? "m4a" : "webm";

      const blob = new Blob(recordedChunks, {
        type
      });

      recordedAudio = new File(
        [blob],
        `solods-voice-${Date.now()}.${extension}`,
        { type }
      );

      const url = URL.createObjectURL(recordedAudio);
      const audio = $("#slc-audio");

      if (audio.dataset.url) {
        URL.revokeObjectURL(audio.dataset.url);
      }

      audio.dataset.url = url;
      audio.src = url;

      stopTracks(audioStream);
      audioStream = null;

      notify("Recording complete. Preview or upload it.", "success");
    };

    mediaRecorder.start(250);
    recordingStartedAt = Date.now();

    clearInterval(timer);

    timer = setInterval(() => {
      const seconds = Math.floor(
        (Date.now() - recordingStartedAt) / 1000
      );

      const display = $("#slc-timer");
      if (display) display.textContent = formatTime(seconds);
    }, 250);

    notify("Recording from your microphone...");
  }

  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== "recording") {
      return;
    }

    mediaRecorder.stop();
    clearInterval(timer);
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Camera access requires HTTPS and a compatible browser."
      );
    }

    stopCamera();

    photoFile = null;
    const preview = $("#slc-photo-preview");
    preview.style.display = "none";

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" }
      },
      audio: false
    });

    const video = $("#slc-video");
    video.srcObject = cameraStream;
    video.style.display = "block";

    await video.play();

    notify("Camera ready. Press Capture Photo.");
  }

  function capturePhoto() {
    const video = $("#slc-video");

    if (
      !cameraStream ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      throw new Error("Open the camera before capturing.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) {
        notify("Could not capture photo.", "error");
        return;
      }

      photoFile = new File(
        [blob],
        `solods-photo-${Date.now()}.jpg`,
        { type: "image/jpeg" }
      );

      const preview = $("#slc-photo-preview");

      if (preview.dataset.url) {
        URL.revokeObjectURL(preview.dataset.url);
      }

      const url = URL.createObjectURL(photoFile);

      preview.dataset.url = url;
      preview.src = url;
      preview.style.display = "block";

      video.style.display = "none";
      stopCamera();

      notify("Photo captured. Preview or upload it.", "success");
    }, "image/jpeg", 0.92);
  }

  function downloadFile(file) {
    if (!file) {
      throw new Error("Capture something first.");
    }

    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = file.name;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function downloadAudio() {
    downloadFile(recordedAudio);
  }

  function downloadPhoto() {
    downloadFile(photoFile);
  }

  async function uploadToBox(file, category) {
    if (!file) {
      throw new Error("Record or capture a file first.");
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error(
        "This file exceeds the dashboard's 20 MB upload limit."
      );
    }

    if (typeof window.solodsLiveCaptureUpload === "function") {
      return await window.solodsLiveCaptureUpload(
        file,
        category
      );
    }

    /*
     * Compatibility with dashboards that expose:
     *
     * uploadFiles(category, inputElement)
     *
     * The existing dashboard's upload function may
     * expect an input element or a different signature.
     */
    const uploadFn =
      typeof window.uploadFiles === "function"
        ? window.uploadFiles
        : null;

    if (!uploadFn) {
      throw new Error(
        "Box upload integration is unavailable. " +
        "Connect the module to your existing uploadFiles() function."
      );
    }

    const input = document.createElement("input");
    input.type = "file";

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;

    /*
     * This is the expected adapter for the original
     * soloDS Box uploadFiles(category, input) API.
     * If your latest dashboard uses another signature,
     * change this one line only.
     */
    return await uploadFn(category, input);
  }

  async function uploadAudio() {
    if (!recordedAudio) {
      throw new Error("Record a voice message first.");
    }

    notify("Uploading voice recording to Box Files...");

    await uploadToBox(recordedAudio, "files");

    notify(
      "Upload request completed. Check Box Files to confirm.",
      "success"
    );
  }

  async function uploadPhoto() {
    if (!photoFile) {
      throw new Error("Capture a photo first.");
    }

    notify("Uploading photo to Box Photos...");

    await uploadToBox(photoFile, "photos");

    notify(
      "Upload request completed. Check Box Photos to confirm.",
      "success"
    );
  }

  function createSidebarEntry() {
    if ($("#slc-sidebar-entry")) return true;

    const sidebar = document.getElementById(SIDEBAR_ID);
    if (!sidebar) return false;

    const candidates = [
      ...sidebar.querySelectorAll(
        "button, a, [role='button']"
      )
    ];

    const fileDrop = candidates.find(element =>
      /file\s*drop/i.test(element.textContent || "")
    );

    if (!fileDrop) return false;

    /*
     * Clone the actual File Drop entry so this module
     * inherits the existing sidebar appearance.
     */
    const entry = fileDrop.cloneNode(true);

    entry.id = "slc-sidebar-entry";

    entry.removeAttribute("href");
    entry.removeAttribute("onclick");

    entry.querySelectorAll("[id]").forEach(el => {
      el.removeAttribute("id");
    });

    const walker = document.createTreeWalker(
      entry,
      NodeFilter.SHOW_TEXT
    );

    let textNode;

    while ((textNode = walker.nextNode())) {
      if (/file\s*drop/i.test(textNode.textContent)) {
        textNode.textContent = textNode.textContent.replace(
          /file\s*drop/i,
          "Live Voice & Photo Upload"
        );
        break;
      }
    }

    entry.setAttribute(
      "aria-label",
      "Live Voice and Photo Upload"
    );

    entry.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openPopup();
      },
      true
    );

    fileDrop.after(entry);

    return true;
  }

  function init() {
    injectStyles();
    createPopup();

    if (createSidebarEntry()) return;

    /*
     * The premium sidebar may be built asynchronously.
     * Observe until File Drop becomes available.
     */
    const observer = new MutationObserver(() => {
      if (createSidebarEntry()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => observer.disconnect(), 30000);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
