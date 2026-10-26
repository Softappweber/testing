
/*
 * soloDS Box Pro — Live Studio
 * Photo • Voice • Video
 * Standalone module — no external libraries
 *
 * Sidebar: #sds-modern-vertical
 * Placement: immediately below File Drop
 * Upload API: uploadFiles(inputId, type)
 */
(() => {
  "use strict";

  if (window.__solodsLiveStudio) return;
  window.__solodsLiveStudio = true;

  const $ = (s, root = document) => root.querySelector(s);

  const FILTERS = {
    normal: "none",
    warm: "sepia(.3) saturate(1.4)",
    vintage: "sepia(.7) contrast(.9)",
    mono: "grayscale(1)",
    noir: "grayscale(1) contrast(1.6)",
    cool: "hue-rotate(25deg) saturate(1.2)",
    vivid: "saturate(2) contrast(1.15)",
    dream: "brightness(1.15) saturate(1.3)",
    sunset: "sepia(.4) hue-rotate(-25deg) saturate(1.7)",
    retro: "sepia(.4) hue-rotate(45deg)",
    fade: "contrast(.8) brightness(1.1)",
    bright: "brightness(1.25)",
    dramatic: "contrast(1.5)"
  };

  const state = {
    tab: "photo",
    stream: null,
    recorder: null,
    chunks: [],
    photo: null,
    audio: null,
    video: null,
    source: null,
    strokes: [],
    drawing: false,
    currentStroke: null,
    filter: "normal",
    camera: "user",
    timer: null,
    started: 0,
    frameId: null,
    extraTracks: [],
    busy: false
  };

  function message(text, error = false) {
    const el = $("#sls-message");
    if (!el) return;
    el.textContent = text;
    el.style.color = error ? "#ff9cab" : "#91efd0";
  }

  function stopStream() {
    if (state.stream) {
      state.stream.getTracks().forEach(t => t.stop());
      state.stream = null;
    }

    ["#sls-camera", "#sls-video-preview"].forEach(id => {
      const el = $(id);
      if (el) el.srcObject = null;
    });
  }

  function stopExtraTracks() {
    state.extraTracks.forEach(t => t.stop());
    state.extraTracks = [];
  }

  function stopTimer() {
    clearInterval(state.timer);
    state.timer = null;
  }

  function startTimer(id) {
    stopTimer();
    state.started = Date.now();

    state.timer = setInterval(() => {
      const seconds = Math.floor(
        (Date.now() - state.started) / 1000
      );

      const m = String(Math.floor(seconds / 60))
        .padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");

      const el = $("#" + id);
      if (el) el.textContent = `${m}:${s}`;
    }, 250);
  }

  function cleanup() {
    if (
      state.recorder &&
      state.recorder.state === "recording"
    ) {
      state.recorder.stop();
    }

    stopTimer();
    stopStream();
    stopExtraTracks();

    if (state.frameId !== null) {
      cancelAnimationFrame(state.frameId);
      state.frameId = null;
    }
  }

  function openStudio() {
    $("#sls-overlay").hidden = false;
    message("Choose Photo, Voice or Video to begin.");
  }

  function closeStudio() {
    cleanup();
    $("#sls-overlay").hidden = true;
  }

  function activeFile() {
    if (state.tab === "photo") return state.photo;
    if (state.tab === "voice") return state.audio;
    return state.video;
  }

  function switchTab(tab) {
    if (
      state.recorder &&
      state.recorder.state === "recording"
    ) {
      message("Stop recording before switching tabs.", true);
      return;
    }

    stopStream();
    state.tab = tab;

    document.querySelectorAll(".sls-tab").forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.tab === tab
      );
    });

    document.querySelectorAll(".sls-panel").forEach(panel => {
      panel.classList.toggle(
        "active",
        panel.id === "sls-" + tab
      );
    });

    message(`${tab.toUpperCase()} Studio ready.`);
  }

  function preferredMime(kind) {
    if (!window.MediaRecorder) return "";

    const options = kind === "audio"
      ? [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4"
        ]
      : [
          "video/webm;codecs=vp8,opus",
          "video/webm;codecs=vp8",
          "video/webm",
          "video/mp4"
        ];

    return options.find(
      type => MediaRecorder.isTypeSupported(type)
    ) || "";
  }

  async function refreshCameras() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      throw new Error("Camera enumeration unavailable.");
    }

    const devices = await navigator.mediaDevices
      .enumerateDevices();

    const cameras = devices.filter(
      d => d.kind === "videoinput"
    );

    const select = $("#sls-camera-select");
    const previous = select.value;

    select.replaceChildren();

    [
      ["user", "Front / Selfie Camera"],
      ["environment", "Back / Rear Camera"]
    ].forEach(([value, label]) => {
      select.add(new Option(label, value));
    });

    cameras.forEach((camera, index) => {
      select.add(
        new Option(
          camera.label || `Camera ${index + 1}`,
          "device:" + camera.deviceId
        )
      );
    });

    if ([...select.options].some(
      o => o.value === previous
    )) {
      select.value = previous;
    }

    message(`${cameras.length} camera(s) detected.`);
  }

  async function openCamera(videoId) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Camera requires HTTPS, browser permission " +
        "and an available camera."
      );
    }

    stopStream();

    const selection = $("#sls-camera-select").value;

    const constraint = selection.startsWith("device:")
      ? {
          deviceId: {
            exact: selection.substring(7)
          }
        }
      : {
          facingMode: { ideal: selection },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        };

    state.stream = await navigator.mediaDevices
      .getUserMedia({
        video: constraint,
        audio: false
      });

    const video = $("#" + videoId);
    video.srcObject = state.stream;
    video.hidden = false;

    await video.play();

    if (videoId === "sls-camera") {
      $("#sls-photo-canvas").hidden = true;
    } else {
      $("#sls-video-playback").hidden = true;
    }

    refreshCameras().catch(() => {});
    message("Camera ready.");
  }

  function getPhotoCanvas() {
    return $("#sls-photo-canvas");
  }

  function renderPhoto() {
    if (!state.source) return;

    const canvas = getPhotoCanvas();
    const ctx = canvas.getContext("2d");

    canvas.width = state.source.width;
    canvas.height = state.source.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.filter = FILTERS[state.filter] || "none";
    ctx.drawImage(
      state.source,
      0,
      0,
      canvas.width,
      canvas.height
    );
    ctx.filter = "none";

    const caption = $("#sls-caption").value.trim();

    if (caption) {
      const fontSize = Math.max(
        24,
        Math.round(canvas.width / 24)
      );

      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#000000";
      ctx.fillStyle = "#ffffff";

      const maxWidth = canvas.width * .9;
      const x = canvas.width / 2;
      const y = canvas.height - fontSize * 1.2;

      ctx.strokeText(caption, x, y, maxWidth);
      ctx.fillText(caption, x, y, maxWidth);
    }

    const sticker = $("#sls-sticker").value;

    if (sticker) {
      ctx.font = `${Math.round(canvas.width / 8)}px serif`;
      ctx.textAlign = "right";
      ctx.fillText(
        sticker,
        canvas.width - 20,
        Math.round(canvas.height / 6)
      );
    }

    ctx.strokeStyle = $("#sls-draw-color").value;
    ctx.lineWidth = Math.max(3, canvas.width / 170);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    state.strokes.forEach(stroke => {
      if (!stroke.points.length) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;

      stroke.points.forEach((point, i) => {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.lineTo(
          p.x * canvas.width + .1,
          p.y * canvas.height + .1
        );
      }

      ctx.stroke();
    });
  }

  async function savePhoto() {
    if (!state.source) {
      throw new Error("Capture or choose a photo first.");
    }

    renderPhoto();

    const canvas = getPhotoCanvas();

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, "image/jpeg", .92);
    });

    if (!blob) throw new Error("Photo export failed.");

    state.photo = new File(
      [blob],
      `solods-photo-${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );

    message("Edited photo ready for download or upload.");
  }

  async function showPhoto(source) {
    stopStream();

    const canvas = getPhotoCanvas();

    state.source = document.createElement("canvas");
    state.source.width = source.videoWidth ||
      source.naturalWidth || source.width;
    state.source.height = source.videoHeight ||
      source.naturalHeight || source.height;

    state.source.getContext("2d").drawImage(
      source,
      0,
      0,
      state.source.width,
      state.source.height
    );

    state.strokes = [];

    $("#sls-camera").hidden = true;
    canvas.hidden = false;

    await savePhoto();
  }

  async function capturePhoto() {
    const video = $("#sls-camera");

    if (
      !state.stream ||
      !video.videoWidth
    ) {
      throw new Error("Open a working camera first.");
    }

    await showPhoto(video);
  }

  function bindDrawing() {
    const canvas = getPhotoCanvas();

    function position(event) {
      const rect = canvas.getBoundingClientRect();

      return {
        x: Math.max(0, Math.min(1,
          (event.clientX - rect.left) / rect.width
        )),
        y: Math.max(0, Math.min(1,
          (event.clientY - rect.top) / rect.height
        ))
      };
    }

    canvas.addEventListener("pointerdown", event => {
      if (!state.source) return;

      state.drawing = true;

      state.currentStroke = {
        color: $("#sls-draw-color").value,
        points: [position(event)]
      };

      state.strokes.push(state.currentStroke);

      canvas.setPointerCapture(event.pointerId);
      renderPhoto();
    });

    canvas.addEventListener("pointermove", event => {
      if (!state.drawing) return;

      state.currentStroke.points.push(position(event));
      renderPhoto();
    });

    ["pointerup", "pointercancel"].forEach(name => {
      canvas.addEventListener(name, () => {
        state.drawing = false;
      });
    });
  }

  async function startVoice() {
    if (!window.MediaRecorder) {
      throw new Error("Audio recording is unsupported.");
    }

    if (
      state.recorder &&
      state.recorder.state === "recording"
    ) return;

    stopStream();

    state.stream = await navigator.mediaDevices
      .getUserMedia({ audio: true });

    const mime = preferredMime("audio");

    state.recorder = new MediaRecorder(
      state.stream,
      mime ? { mimeType: mime } : undefined
    );

    state.chunks = [];

    state.recorder.ondataavailable = event => {
      if (event.data.size) {
        state.chunks.push(event.data);
      }
    };

    state.recorder.onstop = () => {
      const type = state.recorder.mimeType ||
        "audio/webm";

      const ext = type.includes("mp4")
        ? "m4a"
        : "webm";

      state.audio = new File(
        [new Blob(state.chunks, { type })],
        `solods-voice-${Date.now()}.${ext}`,
        { type }
      );

      setMediaPreview("#sls-audio", state.audio);
      stopStream();

      message("Voice recording ready.");
    };

    state.recorder.start(250);
    startTimer("sls-voice-timer");

    message("Recording voice...");
  }

  function stopRecording() {
    if (
      state.recorder &&
      state.recorder.state === "recording"
    ) {
      state.recorder.stop();
    }

    stopTimer();
  }

  function encodeWAV(buffer) {
    const channels = Math.min(2, buffer.numberOfChannels);
    const samples = buffer.length;
    const size = 44 + samples * channels * 2;

    const data = new ArrayBuffer(size);
    const view = new DataView(data);

    function text(offset, value) {
      for (let i = 0; i < value.length; i++) {
        view.setUint8(
          offset + i,
          value.charCodeAt(i)
        );
      }
    }

    text(0, "RIFF");
    view.setUint32(4, size - 8, true);
    text(8, "WAVE");
    text(12, "fmt ");

    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, buffer.sampleRate, true);

    view.setUint32(
      28,
      buffer.sampleRate * channels * 2,
      true
    );

    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);

    text(36, "data");
    view.setUint32(40, size - 44, true);

    let offset = 44;

    for (let i = 0; i < samples; i++) {
      for (let c = 0; c < channels; c++) {
        const value = Math.max(
          -1,
          Math.min(1, buffer.getChannelData(c)[i])
        );

        view.setInt16(
          offset,
          value < 0
            ? value * 32768
            : value * 32767,
          true
        );

        offset += 2;
      }
    }

    return new Blob([data], {
      type: "audio/wav"
    });
  }

  async function applyVoiceEffect() {
    if (!state.audio) {
      throw new Error("Record voice first.");
    }

    const effect = $("#sls-voice-effect").value;

    const Context = window.AudioContext ||
      window.webkitAudioContext;

    if (!Context) {
      throw new Error("Web Audio API unavailable.");
    }

    const context = new Context();

    try {
      const input = await state.audio.arrayBuffer();
      const decoded = await context.decodeAudioData(input);

      const offline = new OfflineAudioContext(
        decoded.numberOfChannels,
        decoded.length,
        decoded.sampleRate
      );

      const source = offline.createBufferSource();
      source.buffer = decoded;

      let last = source;

      if (effect === "telephone") {
        const node = offline.createBiquadFilter();
        node.type = "bandpass";
        node.frequency.value = 1200;
        node.Q.value = .7;
        last.connect(node);
        last = node;
      }

      if (effect === "robot") {
        const node = offline.createBiquadFilter();
        node.type = "lowpass";
        node.frequency.value = 650;
        last.connect(node);
        last = node;
      }

      if (effect === "deep") {
        const node = offline.createBiquadFilter();
        node.type = "lowshelf";
        node.frequency.value = 280;
        node.gain.value = 10;
        last.connect(node);
        last = node;
      }

      if (effect === "bright") {
        const node = offline.createBiquadFilter();
        node.type = "highshelf";
        node.frequency.value = 1500;
        node.gain.value = 9;
        last.connect(node);
        last = node;
      }

      last.connect(offline.destination);
      source.start();

      const rendered = await offline.startRendering();
      const wav = encodeWAV(rendered);

      state.audio = new File(
        [wav],
        `solods-voice-edited-${Date.now()}.wav`,
        { type: "audio/wav" }
      );

      setMediaPreview("#sls-audio", state.audio);

      message("Voice effect exported successfully.");
    } finally {
      await context.close();
    }
  }

  async function startVideo() {
    if (!window.MediaRecorder) {
      throw new Error("Video recording unsupported.");
    }

    if (
      state.recorder &&
      state.recorder.state === "recording"
    ) return;

    if (!state.stream) {
      await openCamera("sls-video-preview");
    }

    const video = $("#sls-video-preview");

    if (!video.videoWidth) {
      throw new Error("Camera not ready.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    const drawFrame = () => {
      if (!state.stream) return;

      ctx.filter = FILTERS[state.filter] || "none";
      ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );
      ctx.filter = "none";

      state.frameId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    const output = canvas.captureStream(25);

    try {
      const microphone = await navigator.mediaDevices
        .getUserMedia({ audio: true });

      state.extraTracks = microphone.getAudioTracks();

      state.extraTracks.forEach(track => {
        output.addTrack(track);
      });
    } catch {
      message(
        "Microphone unavailable. Recording silent video."
      );
    }

    const mime = preferredMime("video");

    state.recorder = new MediaRecorder(
      output,
      mime ? { mimeType: mime } : undefined
    );

    state.chunks = [];

    state.recorder.ondataavailable = event => {
      if (event.data.size) {
        state.chunks.push(event.data);
      }
    };

    state.recorder.onstop = () => {
      if (state.frameId !== null) {
        cancelAnimationFrame(state.frameId);
        state.frameId = null;
      }

      const type = state.recorder.mimeType ||
        "video/webm";

      const ext = type.includes("mp4")
        ? "mp4"
        : "webm";

      state.video = new File(
        [new Blob(state.chunks, { type })],
        `solods-video-${Date.now()}.${ext}`,
        { type }
      );

      const player = $("#sls-video-playback");
      player.hidden = false;

      setMediaPreview(
        "#sls-video-playback",
        state.video
      );

      stopStream();
      stopExtraTracks();

      message("Video ready for preview or upload.");
    };

    state.recorder.start(250);
    startTimer("sls-video-timer");

    message("Recording video...");
  }

  function setMediaPreview(selector, file) {
    const player = $(selector);

    if (player.dataset.objectUrl) {
      URL.revokeObjectURL(player.dataset.objectUrl);
    }

    const url = URL.createObjectURL(file);

    player.dataset.objectUrl = url;
    player.src = url;
  }

  function download() {
    const file = activeFile();

    if (!file) {
      throw new Error("Create a photo, audio or video first.");
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement("a");

    a.href = url;
    a.download = file.name;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  /*
   * IMPORTANT:
   * Your dashboard uses uploadFiles(inputId, type).
   *
   * This temporary input fixes:
   * "document.getElementById(...).files is undefined"
   */
  async function upload() {
    if (state.busy) return;

    if (state.tab === "photo" && state.source) {
      await savePhoto();
    }

    const file = activeFile();

    if (!file) {
      throw new Error("Create a file first.");
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error(
        "File exceeds the 20 MB dashboard limit. " +
        "Download it instead."
      );
    }

    if (typeof window.uploadFiles !== "function") {
      throw new Error(
        "Dashboard uploadFiles() is unavailable."
      );
    }

    const category = state.tab === "photo"
      ? "photos"
      : "files";

    let input = $("#sls-upload-input");

    if (!input) {
      input = document.createElement("input");
      input.id = "sls-upload-input";
      input.type = "file";
      input.hidden = true;
      document.body.appendChild(input);
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;

    state.busy = true;
    message("Uploading to soloDS Box...");

    try {
      // Correct argument order:
      await window.uploadFiles(input.id, category);

      message(
        "Upload request completed. Verify the file in " +
        (category === "photos"
          ? "Box Photos."
          : "Box Files.")
      );
    } finally {
      state.busy = false;
      input.value = "";
    }
  }

  const HTML = `
    <div id="sls-overlay" hidden>
      <div id="sls-dialog"
           role="dialog"
           aria-modal="true"
           aria-labelledby="sls-title">

        <header class="sls-header">
          <div>
            <h2 id="sls-title">✦ soloDS Live Studio</h2>
            <small>Create • Edit • Upload to Drive</small>
          </div>

          <button data-action="close"
                  aria-label="Close Studio">✕</button>
        </header>

        <div class="sls-banner">
          <strong>✨ A special soloDS Box Pro feature</strong>
          <p>
            Go beyond ordinary file uploads. Record your
            voice, capture and personalize photos, or
            create videos — then upload them directly
            to your connected Google Drive, all from
            one creative workspace.
          </p>
        </div>

        <nav class="sls-tabs">
          <button class="sls-tab active"
                  data-tab="photo">📸 Photo</button>
          <button class="sls-tab"
                  data-tab="voice">🎙 Voice</button>
          <button class="sls-tab"
                  data-tab="video">🎥 Video</button>
        </nav>

        <div class="sls-layout">
          <main class="sls-stage">

            <section id="sls-photo"
                     class="sls-panel active">
              <video id="sls-camera"
                     autoplay
                     muted
                     playsinline></video>

              <canvas id="sls-photo-canvas"
                      width="960"
                      height="720"
                      hidden></canvas>

              <div class="sls-buttons">
                <button data-action="photo-camera">
                  📷 Open Camera
                </button>
                <button data-action="photo-capture">
                  Capture
                </button>
                <button data-action="photo-retake">
                  Retake
                </button>
                <button data-action="photo-choose">
                  Choose Photo
                </button>
              </div>

              <input id="sls-photo-input"
                     type="file"
                     accept="image/*"
                     hidden>
            </section>

            <section id="sls-voice"
                     class="sls-panel">
              <div class="sls-mic">🎙️</div>
              <div id="sls-voice-timer">00:00</div>

              <div class="sls-buttons">
                <button data-action="voice-start">
                  ⏺ Record
                </button>
                <button data-action="voice-stop">
                  ⏹ Stop
                </button>
              </div>

              <audio id="sls-audio" controls></audio>

              <label>
                Voice Effect
                <select id="sls-voice-effect">
                  <option value="normal">Original</option>
                  <option value="robot">Robot-like</option>
                  <option value="telephone">Telephone</option>
                  <option value="deep">Deep Tone</option>
                  <option value="bright">Bright Tone</option>
                </select>
              </label>

              <label>
                Playback Speed
                <select id="sls-speed">
                  <option value=".75">0.75×</option>
                  <option value="1" selected>Normal</option>
                  <option value="1.25">1.25×</option>
                  <option value="1.5">1.5×</option>
                </select>
              </label>

              <button data-action="voice-effect">
                Apply Effect & Export
              </button>
            </section>

            <section id="sls-video"
                     class="sls-panel">
              <video id="sls-video-preview"
                     autoplay
                     muted
                     playsinline></video>

              <video id="sls-video-playback"
                     controls
                     hidden></video>

              <div id="sls-video-timer">00:00</div>

              <div class="sls-buttons">
                <button data-action="video-camera">
                  📷 Open Camera
                </button>
                <button data-action="video-start">
                  ⏺ Record Video
                </button>
                <button data-action="video-stop">
                  ⏹ Stop
                </button>
              </div>
            </section>
          </main>

          <aside class="sls-tools">
            <h3>Creative Tools</h3>

            <label>
              Camera
              <select id="sls-camera-select">
                <option value="user">
                  Front / Selfie Camera
                </option>
                <option value="environment">
                  Back / Rear Camera
                </option>
              </select>
            </label>

            <button data-action="refresh-cameras">
              Refresh Camera List
            </button>

            <label>
              Live Filter
              <select id="sls-filter">
                ${Object.keys(FILTERS).map(name => `
                  <option value="${name}">
                    ${name.charAt(0).toUpperCase() +
                      name.slice(1)}
                  </option>
                `).join("")}
              </select>
            </label>

            <label>
              Photo Caption
              <input id="sls-caption"
                     placeholder="Enter caption"
                     maxlength="100">
            </label>

            <label>
              Sticker
              <select id="sls-sticker">
                <option value="">None</option>
                <option>✨</option>
                <option>❤️</option>
                <option>😎</option>
                <option>🎉</option>
                <option>🌈</option>
                <option>🔥</option>
              </select>
            </label>

            <label>
              Drawing Color
              <input id="sls-draw-color"
                     type="color"
                     value="#ff4081">
            </label>

            <div class="sls-buttons">
              <button data-action="photo-apply">
                Apply Photo Edits
              </button>
              <button data-action="photo-clear">
                Clear Drawing
              </button>
            </div>

            <p class="sls-help">
              Draw directly on a captured photo
              using your mouse or finger.
              Video recording uses the selected filter.
            </p>
          </aside>
        </div>

        <footer class="sls-footer">
          <button data-action="download">
            ⬇ Download
          </button>

          <button class="sls-primary"
                  data-action="upload">
            ☁ Upload to Box
          </button>

          <div id="sls-message" role="status"></div>
        </footer>
      </div>
    </div>
  `;

  const CSS = `
    #sls-overlay[hidden] {
      display: none !important;
    }

    #sls-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      background: rgba(2, 8, 23, .88);
      backdrop-filter: blur(9px);
      display: grid;
      place-items: center;
      padding: 12px;
      color: #edf4ff;
      font: 14px system-ui, sans-serif;
    }

    #sls-dialog {
      width: min(1050px, 100%);
      max-height: 95dvh;
      overflow: auto;
      box-sizing: border-box;
      background: linear-gradient(
        145deg, #182541, #0a1225
      );
      border: 1px solid #3c5075;
      border-radius: 22px;
      padding: 20px;
      box-shadow: 0 25px 90px #000a;
    }

    #sls-dialog * {
      box-sizing: border-box;
    }

    #sls-dialog button,
    #sls-dialog input,
    #sls-dialog select {
      font: inherit;
    }

    #sls-dialog button {
      background: #233755;
      border: 1px solid #456087;
      color: #eef6ff;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
    }

    #sls-dialog button:hover {
      background: #31517c;
    }

    #sls-dialog .sls-primary,
    #sls-dialog .sls-tab.active {
      background: linear-gradient(
        110deg, #7863e9, #159bb9
      );
      border-color: transparent;
    }

    .sls-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .sls-header h2 {
      margin: 0;
      font-size: 22px;
    }

    .sls-header small {
      color: #a8bddd;
    }

    .sls-banner {
      background: #17375d;
      border: 1px solid #3d709a;
      border-radius: 13px;
      padding: 12px 15px;
      margin: 15px 0;
    }

    .sls-banner strong {
      color: #92edff;
    }

    .sls-banner p {
      color: #d0e4fb;
      font-size: 12px;
      line-height: 1.6;
      margin: 6px 0 0;
    }

    .sls-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
    }

    .sls-tabs button {
      flex: 1;
    }

    .sls-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 250px;
      gap: 14px;
    }

    .sls-stage,
    .sls-tools {
      background: #0e1b32;
      border: 1px solid #304561;
      border-radius: 14px;
      padding: 14px;
      min-width: 0;
    }

    .sls-panel {
      display: none;
    }

    .sls-panel.active {
      display: block;
    }

    #sls-camera,
    #sls-photo-canvas,
    #sls-video-preview,
    #sls-video-playback {
      display: block;
      width: 100%;
      max-height: 380px;
      object-fit: contain;
      background: #020617;
      border-radius: 12px;
    }

    #sls-photo-canvas {
      touch-action: none;
      cursor: crosshair;
    }

    #sls-dialog [hidden] {
      display: none !important;
    }

    .sls-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 12px 0;
    }

    .sls-tools h3 {
      margin-top: 0;
    }

    .sls-tools label,
    #sls-voice label {
      display: block;
      margin: 12px 0;
      font-size: 13px;
      color: #c7d6ee;
    }

    .sls-tools input,
    .sls-tools select,
    #sls-voice select {
      display: block;
      width: 100%;
      margin-top: 6px;
      border: 1px solid #3c5174;
      background: #1b2b48;
      color: white;
      border-radius: 9px;
      padding: 9px;
    }

    .sls-tools input[type="color"] {
      height: 44px;
    }

    .sls-help {
      color: #a9bad5;
      font-size: 12px;
      line-height: 1.6;
    }

    #sls-voice {
      text-align: center;
    }

    #sls-voice audio {
      width: 100%;
      margin: 15px 0;
    }

    .sls-mic {
      font-size: 65px;
      margin: 24px 0;
    }

    #sls-voice-timer,
    #sls-video-timer {
      font-size: 30px;
      font-weight: bold;
      color: #8fe9ff;
      text-align: center;
      margin: 12px 0;
    }

    .sls-footer {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 15px;
    }

    #sls-message {
      flex: 1;
      min-width: 200px;
      font-size: 12px;
    }

    @media (max-width: 700px) {
      #sls-dialog {
        padding: 12px;
        border-radius: 15px;
      }

      .sls-layout {
        grid-template-columns: 1fr;
      }

      .sls-buttons button {
        flex: 1;
      }

      .sls-header h2 {
        font-size: 18px;
      }
    }
  `;

  function addSidebarEntry() {
    if ($("#sls-sidebar-entry")) return true;

    const sidebar = $("#sds-modern-vertical");
    if (!sidebar) return false;

    const elements = [
      ...sidebar.querySelectorAll(
        "button, a, [role='button']"
      )
    ];

    const fileDrop = elements.find(el =>
      /file\s*drop/i.test(el.textContent || "")
    );

    if (!fileDrop) return false;

    const entry = fileDrop.cloneNode(true);
    entry.id = "sls-sidebar-entry";

    entry.removeAttribute("href");
    entry.removeAttribute("onclick");

    entry.querySelectorAll("[id]").forEach(el => {
      el.removeAttribute("id");
    });

    const walker = document.createTreeWalker(
      entry,
      NodeFilter.SHOW_TEXT
    );

    let node;

    while ((node = walker.nextNode())) {
      if (/file\s*drop/i.test(node.textContent)) {
        node.textContent = node.textContent.replace(
          /file\s*drop/i,
          "soloDS Live Studio"
        );
        break;
      }
    }

    entry.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openStudio();
      },
      true
    );

    fileDrop.after(entry);

    return true;
  }

  function bindEvents() {
    const overlay = $("#sls-overlay");

    overlay.addEventListener("click", async event => {
      if (event.target === overlay) {
        closeStudio();
        return;
      }

      const tab = event.target.closest("[data-tab]");

      if (tab) {
        switchTab(tab.dataset.tab);
        return;
      }

      const button = event.target.closest(
        "[data-action]"
      );

      if (!button) return;

      const action = button.dataset.action;

      try {
        switch (action) {
          case "close":
            closeStudio();
            break;

          case "refresh-cameras":
            await refreshCameras();
            break;

          case "photo-camera":
            await openCamera("sls-camera");
            break;

          case "photo-capture":
            await capturePhoto();
            break;

          case "photo-retake":
            state.photo = null;
            state.source = null;
            state.strokes = [];
            await openCamera("sls-camera");
            break;

          case "photo-choose":
            $("#sls-photo-input").click();
            break;

          case "photo-apply":
            await savePhoto();
            break;

          case "photo-clear":
            state.strokes = [];
            renderPhoto();
            break;

          case "voice-start":
            await startVoice();
            break;

          case "voice-stop":
            stopRecording();
            break;

          case "voice-effect":
            await applyVoiceEffect();
            break;

          case "video-camera":
            await openCamera("sls-video-preview");
            break;

          case "video-start":
            await startVideo();
            break;

          case "video-stop":
            stopRecording();
            break;

          case "download":
            if (
              state.tab === "photo" &&
              state.source
            ) {
              await savePhoto();
            }
            download();
            break;

          case "upload":
            await upload();
            break;
        }
      } catch (error) {
        message(error.message || String(error), true);
        console.error("[soloDS Live Studio]", error);
      }
    });

    $("#sls-photo-input").addEventListener(
      "change",
      event => {
        const file = event.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = async () => {
          try {
            await showPhoto(image);
          } catch (error) {
            message(error.message, true);
          } finally {
            URL.revokeObjectURL(url);
          }
        };

        image.onerror = () => {
          URL.revokeObjectURL(url);
          message("Could not open photo.", true);
        };

        image.src = url;
      }
    );

    $("#sls-filter").addEventListener(
      "change",
      event => {
        state.filter = event.target.value;
        renderPhoto();
      }
    );

    ["#sls-caption", "#sls-sticker"].forEach(id => {
      $(id).addEventListener("input", renderPhoto);
    });

    $("#sls-speed").addEventListener(
      "change",
      event => {
        $("#sls-audio").playbackRate =
          Number(event.target.value);
      }
    );

    $("#sls-camera-select").addEventListener(
      "change",
      () => {
        stopStream();
        message(
          "Camera changed. Click Open Camera to activate it."
        );
      }
    );

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        !overlay.hidden
      ) {
        closeStudio();
      }
    });
  }

  function init() {
    if ($("#sls-overlay")) return;

    const style = document.createElement("style");
    style.id = "sls-styles";
    style.textContent = CSS;
    document.head.appendChild(style);

    document.body.insertAdjacentHTML(
      "beforeend",
      HTML
    );

    bindEvents();
    bindDrawing();

    if (addSidebarEntry()) return;

    const observer = new MutationObserver(() => {
      if (addSidebarEntry()) observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => observer.disconnect(), 60000);
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
