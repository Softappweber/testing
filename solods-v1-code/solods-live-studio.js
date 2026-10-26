
/*!
 * soloDS Box Pro — Live Studio
 * Photo / Voice / Video
 * Standalone JavaScript module
 *
 * Existing dashboard:
 *   Sidebar: #sds-modern-vertical
 *   Upload: uploadFiles(inputId, type)
 *
 * No external dependencies.
 */
(() => {
  "use strict";

  const VERSION = "3.0.0";
  const ROOT = "sls3";
  const LIMIT = 20 * 1024 * 1024;

  if (window.__solodsLiveStudioV3) return;
  window.__solodsLiveStudioV3 = true;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const state = {
    tab: "photo",
    stream: null,
    recorder: null,
    chunks: [],
    photo: null,
    audio: null,
    video: null,
    photoSource: null,
    cameraMode: "user",
    filter: "normal",
    timer: null,
    started: 0,
    recording: false,
    busy: false,
    drawing: false,
    strokes: [],
    currentStroke: null,
    renderLoop: null,
    videoOutput: null,
    audioContext: null,
    videoAudioStream: null,
    photoObjectUrl: null,
    previewUrls: new Map()
  };

  const FILTERS = {
    normal: "none",
    vivid: "saturate(1.65) contrast(1.12)",
    warm: "sepia(.22) saturate(1.25)",
    cool: "hue-rotate(18deg) saturate(1.15)",
    vintage: "sepia(.65) contrast(.9)",
    mono: "grayscale(1)",
    noir: "grayscale(1) contrast(1.55)",
    cinematic: "contrast(1.25) saturate(.8)",
    dreamy: "brightness(1.12) saturate(1.2)",
    sunset: "sepia(.35) hue-rotate(-18deg)",
    bright: "brightness(1.2)",
    soft: "contrast(.85) brightness(1.08)"
  };

  function status(text, error = false) {
    const el = $("#sls3-status");
    if (!el) return;

    el.textContent = text;
    el.classList.toggle("error", error);
  }

  function safeError(error) {
    const name = error?.name || "";

    if (name === "NotAllowedError") {
      return "Camera or microphone permission was denied. Check browser permissions.";
    }

    if (name === "NotFoundError") {
      return "No suitable camera or microphone was found.";
    }

    if (name === "NotReadableError") {
      return "The device could not be started. Close other apps using it and try again.";
    }

    if (name === "OverconstrainedError") {
      return "That camera is unavailable. Select another camera.";
    }

    if (name === "SecurityError") {
      return "Camera and microphone access requires a secure HTTPS page.";
    }

    return error?.message || String(error);
  }

  function releaseStream(stream) {
    if (!stream) return;

    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (_) {}
    });
  }

  function stopCamera() {
    releaseStream(state.stream);
    state.stream = null;

    for (const id of [
      "#sls3-photo-video",
      "#sls3-video-camera"
    ]) {
      const el = $(id);
      if (el) el.srcObject = null;
    }
  }

  function stopVideoRendering() {
    if (state.renderLoop !== null) {
      cancelAnimationFrame(state.renderLoop);
      state.renderLoop = null;
    }

    releaseStream(state.videoOutput);
    state.videoOutput = null;

    releaseStream(state.videoAudioStream);
    state.videoAudioStream = null;
  }

  function stopTimer() {
    clearInterval(state.timer);
    state.timer = null;
  }

  function startTimer(elementId) {
    stopTimer();

    state.started = Date.now();

    const update = () => {
      const elapsed = Math.floor(
        (Date.now() - state.started) / 1000
      );

      const minutes = String(
        Math.floor(elapsed / 60)
      ).padStart(2, "0");

      const seconds = String(
        elapsed % 60
      ).padStart(2, "0");

      const element = $("#" + elementId);

      if (element) {
        element.textContent = `${minutes}:${seconds}`;
      }
    };

    update();
    state.timer = setInterval(update, 250);
  }

  function stopRecorder() {
    if (
      state.recorder &&
      state.recorder.state === "recording"
    ) {
      state.recorder.stop();
    }

    stopTimer();
  }

  function closeStudio() {
    if (state.recording) {
      status("Stop recording before closing.", true);
      return;
    }

    stopCamera();
    stopVideoRendering();
    stopTimer();

    $("#sls3-overlay").hidden = true;
  }

  function openStudio() {
    $("#sls3-overlay").hidden = false;
    status("Choose Photo, Voice or Video.");
  }

  function selectTab(tab) {
    if (state.recording) {
      status("Stop recording before changing tools.", true);
      return;
    }

    stopCamera();
    stopVideoRendering();

    state.tab = tab;

    document.querySelectorAll(".sls3-tab").forEach(el => {
      el.classList.toggle(
        "active",
        el.dataset.tab === tab
      );
    });

    document.querySelectorAll(".sls3-panel").forEach(el => {
      el.classList.toggle(
        "active",
        el.dataset.panel === tab
      );
    });

    status(`${tab.toUpperCase()} Studio ready.`);
  }

  function mimeFor(kind) {
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

    return options.find(type =>
      MediaRecorder.isTypeSupported(type)
    ) || "";
  }

  function extension(type, kind) {
    if (type.includes("mp4")) {
      return kind === "audio" ? "m4a" : "mp4";
    }

    if (type.includes("wav")) return "wav";

    return "webm";
  }

  function makeFile(blob, prefix, kind) {
    const type = blob.type ||
      (kind === "audio" ? "audio/webm" : "video/webm");

    return new File(
      [blob],
      `${prefix}-${Date.now()}.${extension(type, kind)}`,
      { type }
    );
  }

  function setPreview(selector, file) {
    const el = $(selector);
    if (!el) return;

    const old = state.previewUrls.get(selector);

    if (old) URL.revokeObjectURL(old);

    const url = URL.createObjectURL(file);

    state.previewUrls.set(selector, url);
    el.src = url;
    el.hidden = false;
    el.load();
  }

  /*
   * CAMERA
   */

  async function listCameras() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      throw new Error("Camera selection is unavailable.");
    }

    const select = $("#sls3-camera-select");
    const previous = select.value;

    const devices = await navigator.mediaDevices
      .enumerateDevices();

    const cameras = devices.filter(
      d => d.kind === "videoinput"
    );

    select.replaceChildren();

    select.add(new Option(
      "Front / Selfie Camera",
      "user"
    ));

    select.add(new Option(
      "Back / Rear Camera",
      "environment"
    ));

    cameras.forEach((device, index) => {
      select.add(new Option(
        device.label || `Camera ${index + 1}`,
        "device:" + device.deviceId
      ));
    });

    if ([...select.options].some(
      option => option.value === previous
    )) {
      select.value = previous;
    }

    status(`${cameras.length} camera(s) detected.`);
  }

  async function activateCamera(target) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Camera access requires HTTPS and a supported browser."
      );
    }

    if (state.recording) {
      throw new Error(
        "Stop recording before switching cameras."
      );
    }

    stopCamera();

    const selection = $("#sls3-camera-select").value;

    let videoConstraint;

    if (selection.startsWith("device:")) {
      videoConstraint = {
        deviceId: {
          exact: selection.slice(7)
        }
      };
    } else {
      videoConstraint = {
        facingMode: {
          ideal: selection
        },
        width: {
          ideal: 1280
        },
        height: {
          ideal: 720
        }
      };
    }

    state.stream = await navigator.mediaDevices
      .getUserMedia({
        video: videoConstraint,
        audio: false
      });

    const video = $(target);

    video.srcObject = state.stream;
    video.hidden = false;
    video.muted = true;
    video.playsInline = true;

    await video.play();

    // Wait for real camera dimensions.
    if (!video.videoWidth) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(
            "Camera started but no video frames arrived."
          ));
        }, 8000);

        video.addEventListener(
          "loadedmetadata",
          () => {
            clearTimeout(timeout);
            resolve();
          },
          { once: true }
        );
      });
    }

    if (target === "#sls3-photo-video") {
      $("#sls3-photo-canvas").hidden = true;
    }

    if (target === "#sls3-video-camera") {
      $("#sls3-video-playback").hidden = true;
    }

    listCameras().catch(() => {});
    status("Camera ready. You can capture now.");
  }

  /*
   * PHOTO
   */

  function getCanvas() {
    return $("#sls3-photo-canvas");
  }

  function renderPhoto() {
    if (!state.photoSource) return;

    const canvas = getCanvas();
    const source = state.photoSource;
    const ctx = canvas.getContext("2d");

    if (
      canvas.width !== source.width ||
      canvas.height !== source.height
    ) {
      canvas.width = source.width;
      canvas.height = source.height;
    }

    ctx.clearRect(
      0, 0, canvas.width, canvas.height
    );

    ctx.save();

    ctx.filter = FILTERS[state.filter] || "none";

    ctx.drawImage(
      source,
      0, 0,
      canvas.width,
      canvas.height
    );

    ctx.restore();

    const caption = $("#sls3-caption").value.trim();

    if (caption) {
      const fontSize = Math.max(
        20,
        Math.round(canvas.width / 22)
      );

      ctx.save();

      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineJoin = "round";

      ctx.lineWidth = Math.max(
        3,
        fontSize / 10
      );

      ctx.strokeStyle = "#111111";
      ctx.fillStyle = "#ffffff";

      const x = canvas.width / 2;
      const y = canvas.height - fontSize * .6;
      const width = canvas.width * .9;

      ctx.strokeText(caption, x, y, width);
      ctx.fillText(caption, x, y, width);

      ctx.restore();
    }

    const sticker = $("#sls3-sticker").value;

    if (sticker) {
      ctx.save();

      ctx.font = `${Math.round(
        canvas.width / 7
      )}px sans-serif`;

      ctx.textAlign = "right";
      ctx.textBaseline = "top";

      ctx.fillText(
        sticker,
        canvas.width - 20,
        20
      );

      ctx.restore();
    }

    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(
      3,
      canvas.width / 180
    );

    state.strokes.forEach(stroke => {
      if (!stroke.points.length) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;

      stroke.points.forEach((point, index) => {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
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

    ctx.restore();
  }

  async function setPhotoSource(source) {
    const width =
      source.videoWidth ||
      source.naturalWidth ||
      source.width;

    const height =
      source.videoHeight ||
      source.naturalHeight ||
      source.height;

    if (!width || !height) {
      throw new Error("Invalid photo dimensions.");
    }

    const base = document.createElement("canvas");

    base.width = width;
    base.height = height;

    const ctx = base.getContext("2d");

    ctx.drawImage(
      source,
      0, 0,
      width, height
    );

    state.photoSource = base;
    state.strokes = [];
    state.photo = null;

    stopCamera();

    $("#sls3-photo-video").hidden = true;
    getCanvas().hidden = false;

    renderPhoto();

    status("Photo captured. Edit or upload it.");
  }

  async function capturePhoto() {
    const video = $("#sls3-photo-video");

    if (
      !state.stream ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      throw new Error(
        "Open a working camera before capturing."
      );
    }

    await setPhotoSource(video);
  }

  async function importPhoto(file) {
    if (!file || !file.type.startsWith("image/")) {
      throw new Error("Choose a valid image file.");
    }

    const url = URL.createObjectURL(file);

    try {
      const image = new Image();

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(
          new Error("Unable to decode image.")
        );

        image.src = url;
      });

      await setPhotoSource(image);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function exportPhoto() {
    if (!state.photoSource) {
      throw new Error(
        "Capture or choose a photo first."
      );
    }

    renderPhoto();

    const canvas = getCanvas();

    const blob = await new Promise(resolve => {
      canvas.toBlob(
        resolve,
        "image/jpeg",
        .9
      );
    });

    if (!blob) {
      throw new Error("Photo export failed.");
    }

    state.photo = new File(
      [blob],
      `solods-photo-${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );

    return state.photo;
  }

  function setupDrawing() {
    const canvas = getCanvas();

    function point(event) {
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
      if (!state.photoSource) return;

      state.drawing = true;

      state.currentStroke = {
        color: $("#sls3-color").value,
        points: [point(event)]
      };

      state.strokes.push(state.currentStroke);

      canvas.setPointerCapture(event.pointerId);
      renderPhoto();
    });

    canvas.addEventListener("pointermove", event => {
      if (!state.drawing || !state.currentStroke) {
        return;
      }

      state.currentStroke.points.push(
        point(event)
      );

      renderPhoto();
    });

    function endDrawing() {
      state.drawing = false;
      state.currentStroke = null;
    }

    canvas.addEventListener(
      "pointerup",
      endDrawing
    );

    canvas.addEventListener(
      "pointercancel",
      endDrawing
    );
  }

  /*
   * VOICE
   */

  async function startVoice() {
    if (!window.MediaRecorder) {
      throw new Error(
        "This browser does not support MediaRecorder."
      );
    }

    if (state.recording) return;

    stopCamera();

    const stream = await navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

    state.stream = stream;
    state.chunks = [];

    const mime = mimeFor("audio");

    const recorder = new MediaRecorder(
      stream,
      mime ? { mimeType: mime } : undefined
    );

    state.recorder = recorder;

    recorder.ondataavailable = event => {
      if (event.data?.size) {
        state.chunks.push(event.data);
      }
    };

    recorder.onerror = event => {
      status(
        safeError(event.error || new Error(
          "Audio recording failed."
        )),
        true
      );
    };

    recorder.onstop = () => {
      const type = recorder.mimeType ||
        "audio/webm";

      const blob = new Blob(
        state.chunks,
        { type }
      );

      state.audio = makeFile(
        blob,
        "solods-voice",
        "audio"
      );

      setPreview(
        "#sls3-audio-player",
        state.audio
      );

      state.recording = false;
      stopStreamAfterRecording();

      status(
        "Recording saved. Preview, download or upload."
      );
    };

    recorder.start(250);
    state.recording = true;

    startTimer("sls3-audio-timer");

    status("Voice recording in progress...");
  }

  function stopStreamAfterRecording() {
    stopCamera();
    stopVideoRendering();
    stopTimer();
  }

  /*
   * AUDIO EFFECTS
   *
   * Uses offline Web Audio processing.
   * Output is WAV.
   */

  function wavEncode(buffer) {
    const channels = Math.min(
      2,
      buffer.numberOfChannels
    );

    const length = buffer.length;
    const bytes = 44 + length * channels * 2;

    const data = new ArrayBuffer(bytes);
    const view = new DataView(data);

    function writeText(offset, text) {
      for (let i = 0; i < text.length; i++) {
        view.setUint8(
          offset + i,
          text.charCodeAt(i)
        );
      }
    }

    writeText(0, "RIFF");
    view.setUint32(4, bytes - 8, true);

    writeText(8, "WAVE");
    writeText(12, "fmt ");

    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);

    view.setUint32(
      24,
      buffer.sampleRate,
      true
    );

    view.setUint32(
      28,
      buffer.sampleRate * channels * 2,
      true
    );

    view.setUint16(
      32,
      channels * 2,
      true
    );

    view.setUint16(34, 16, true);

    writeText(36, "data");
    view.setUint32(
      40,
      bytes - 44,
      true
    );

    let offset = 44;

    for (let i = 0; i < length; i++) {
      for (let c = 0; c < channels; c++) {
        const sample = Math.max(
          -1,
          Math.min(
            1,
            buffer.getChannelData(c)[i]
          )
        );

        view.setInt16(
          offset,
          sample < 0
            ? sample * 32768
            : sample * 32767,
          true
        );

        offset += 2;
      }
    }

    return new Blob(
      [data],
      { type: "audio/wav" }
    );
  }

  async function applyAudioEffect() {
    if (!state.audio) {
      throw new Error(
        "Record a voice message first."
      );
    }

    const effect = $("#sls3-audio-effect").value;

    if (effect === "normal") {
      status("Original audio is already selected.");
      return;
    }

    const Context =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!Context) {
      throw new Error("Web Audio API unavailable.");
    }

    const context = new Context();

    try {
      const data = await state.audio.arrayBuffer();

      const decoded = await context.decodeAudioData(
        data
      );

      const offline = new OfflineAudioContext(
        decoded.numberOfChannels,
        decoded.length,
        decoded.sampleRate
      );

      const source = offline.createBufferSource();
      source.buffer = decoded;

      let output = source;

      const filter = offline.createBiquadFilter();

      if (effect === "telephone") {
        filter.type = "bandpass";
        filter.frequency.value = 1200;
        filter.Q.value = .7;
      } else if (effect === "deep") {
        filter.type = "lowshelf";
        filter.frequency.value = 250;
        filter.gain.value = 12;
      } else if (effect === "bright") {
        filter.type = "highshelf";
        filter.frequency.value = 1700;
        filter.gain.value = 10;
      } else if (effect === "muffled") {
        filter.type = "lowpass";
        filter.frequency.value = 650;
      }

      output.connect(filter);
      output = filter;

      output.connect(offline.destination);

      source.start();

      const rendered = await offline.startRendering();
      const blob = wavEncode(rendered);

      state.audio = new File(
        [blob],
        `solods-voice-effect-${Date.now()}.wav`,
        { type: "audio/wav" }
      );

      setPreview(
        "#sls3-audio-player",
        state.audio
      );

      status("Voice effect applied.");
    } finally {
      await context.close();
    }
  }

  /*
   * VIDEO
   */

  async function startVideo() {
    if (!window.MediaRecorder) {
      throw new Error(
        "Video recording is not supported."
      );
    }

    if (state.recording) return;

    if (!state.stream) {
      await activateCamera("#sls3-video-camera");
    }

    const camera = $("#sls3-video-camera");

    if (!camera.videoWidth) {
      throw new Error(
        "Camera has not produced video frames."
      );
    }

    const canvas = document.createElement("canvas");

    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const ctx = canvas.getContext("2d");

    const draw = () => {
      if (!state.stream) return;

      ctx.filter = FILTERS[state.filter] || "none";

      ctx.drawImage(
        camera,
        0, 0,
        canvas.width,
        canvas.height
      );

      ctx.filter = "none";

      state.renderLoop = requestAnimationFrame(draw);
    };

    draw();

    const output = canvas.captureStream(25);
    state.videoOutput = output;

    try {
      state.videoAudioStream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });

      state.videoAudioStream
        .getAudioTracks()
        .forEach(track => {
          output.addTrack(track);
        });
    } catch (_) {
      status(
        "Microphone unavailable. Recording video without audio."
      );
    }

    const mime = mimeFor("video");

    const recorder = new MediaRecorder(
      output,
      mime ? { mimeType: mime } : undefined
    );

    state.recorder = recorder;
    state.chunks = [];

    recorder.ondataavailable = event => {
      if (event.data?.size) {
        state.chunks.push(event.data);
      }
    };

    recorder.onerror = event => {
      status(
        safeError(event.error || new Error(
          "Video recording failed."
        )),
        true
      );
    };

    recorder.onstop = () => {
      const type = recorder.mimeType ||
        "video/webm";

      const blob = new Blob(
        state.chunks,
        { type }
      );

      state.video = makeFile(
        blob,
        "solods-video",
        "video"
      );

      setPreview(
        "#sls3-video-playback",
        state.video
      );

      $("#sls3-video-camera").hidden = true;

      state.recording = false;

      stopStreamAfterRecording();

      status(
        "Video ready. Preview, download or upload."
      );
    };

    recorder.start(250);
    state.recording = true;

    startTimer("sls3-video-timer");

    status("Recording video...");
  }

  /*
   * DOWNLOAD AND BOX UPLOAD
   */

  async function selectedFile() {
    if (state.tab === "photo") {
      return await exportPhoto();
    }

    if (state.tab === "voice") {
      return state.audio;
    }

    return state.video;
  }

  async function downloadCurrent() {
    if (state.recording) {
      throw new Error(
        "Stop recording before downloading."
      );
    }

    const file = await selectedFile();

    if (!file) {
      throw new Error("Nothing to download yet.");
    }

    const url = URL.createObjectURL(file);

    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 30000);
  }

  async function uploadCurrent() {
    if (state.busy) return;

    if (state.recording) {
      throw new Error(
        "Stop recording before uploading."
      );
    }

    const file = await selectedFile();

    if (!file) {
      throw new Error(
        "Capture or record something first."
      );
    }

    if (file.size > LIMIT) {
      throw new Error(
        "File exceeds the 20 MB upload limit. " +
        "Use Download instead."
      );
    }

    /*
     * This is the dashboard's existing interface:
     * uploadFiles(inputId, type)
     *
     * A real file input must exist in the DOM.
     */
    if (typeof window.uploadFiles !== "function") {
      throw new Error(
        "Dashboard uploadFiles() is unavailable. " +
        "Check the existing dashboard integration."
      );
    }

    const category = state.tab === "photo"
      ? "photos"
      : "files";

    const input = $("#sls3-upload-input");

    const transfer = new DataTransfer();
    transfer.items.add(file);

    input.files = transfer.files;

    state.busy = true;
    status("Uploading to soloDS Box...");

    try {
      await window.uploadFiles(
        input.id,
        category
      );

      status(
        "Upload function finished. Check " +
        (category === "photos"
          ? "Box Photos"
          : "Box Files") +
        " to confirm the saved file."
      );
    } finally {
      state.busy = false;
      input.value = "";
    }
  }

  /*
   * USER INTERFACE
   */

  const HTML = `
    <div id="sls3-overlay" hidden>
      <section id="sls3-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sls3-title">

        <header class="sls3-header">
          <div>
            <h2 id="sls3-title">
              ✦ soloDS Live Studio
            </h2>
            <p>Capture • Create • Upload</p>
          </div>

          <button data-action="close"
            aria-label="Close">✕</button>
        </header>

        <div class="sls3-feature">
          <strong>
            ✨ A special soloDS Box Pro feature
          </strong>
          <p>
            Record voice, take and edit photos, and
            create videos in one workspace. Preview
            your creation and send it straight to
            your connected Google Drive.
          </p>
        </div>

        <div class="sls3-tabs">
          <button class="sls3-tab active"
            data-tab="photo">📸 Photo</button>
          <button class="sls3-tab"
            data-tab="voice">🎙 Voice</button>
          <button class="sls3-tab"
            data-tab="video">🎥 Video</button>
        </div>

        <div class="sls3-layout">
          <div class="sls3-main">

            <section class="sls3-panel active"
              data-panel="photo">

              <video id="sls3-photo-video"
                autoplay
                muted
                playsinline
                hidden></video>

              <canvas id="sls3-photo-canvas"
                width="960"
                height="720"
                hidden></canvas>

              <div class="sls3-actions">
                <button data-action="open-photo-camera">
                  📷 Open Camera
                </button>

                <button data-action="capture-photo">
                  📸 Capture
                </button>

                <button data-action="retake-photo">
                  🔄 Retake
                </button>

                <button data-action="choose-photo">
                  🖼 Choose Photo
                </button>
              </div>

              <input id="sls3-photo-input"
                type="file"
                accept="image/*"
                hidden>
            </section>

            <section class="sls3-panel"
              data-panel="voice">

              <div class="sls3-mic">🎙️</div>

              <div id="sls3-audio-timer"
                class="sls3-timer">00:00</div>

              <div class="sls3-actions">
                <button data-action="start-voice">
                  ⏺ Record
                </button>

                <button data-action="stop-record">
                  ⏹ Stop
                </button>
              </div>

              <audio id="sls3-audio-player"
                controls></audio>

              <label>
                Voice Effect
                <select id="sls3-audio-effect">
                  <option value="normal">
                    Original
                  </option>
                  <option value="telephone">
                    Telephone
                  </option>
                  <option value="deep">
                    Deep Tone
                  </option>
                  <option value="bright">
                    Bright Tone
                  </option>
                  <option value="muffled">
                    Muffled
                  </option>
                </select>
              </label>

              <button data-action="apply-audio">
                Apply Audio Effect
              </button>
            </section>

            <section class="sls3-panel"
              data-panel="video">

              <video id="sls3-video-camera"
                autoplay
                muted
                playsinline
                hidden></video>

              <video id="sls3-video-playback"
                controls
                hidden></video>

              <div id="sls3-video-timer"
                class="sls3-timer">00:00</div>

              <div class="sls3-actions">
                <button data-action="open-video-camera">
                  📷 Open Camera
                </button>

                <button data-action="start-video">
                  ⏺ Record Video
                </button>

                <button data-action="stop-record">
                  ⏹ Stop
                </button>
              </div>
            </section>

          </div>

          <aside class="sls3-tools">
            <h3>Creative Controls</h3>

            <label>
              Select Camera
              <select id="sls3-camera-select">
                <option value="user">
                  Front / Selfie
                </option>
                <option value="environment">
                  Back / Rear
                </option>
              </select>
            </label>

            <button data-action="refresh-cameras">
              Refresh Camera List
            </button>

            <label>
              Color Filter
              <select id="sls3-filter">
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
              <input id="sls3-caption"
                maxlength="100"
                placeholder="Write a caption">
            </label>

            <label>
              Sticker
              <select id="sls3-sticker">
                <option value="">None</option>
                <option>✨</option>
                <option>❤️</option>
                <option>😎</option>
                <option>🌈</option>
                <option>🎉</option>
                <option>🔥</option>
              </select>
            </label>

            <label>
              Drawing Color
              <input id="sls3-color"
                type="color"
                value="#ff4081">
            </label>

            <div class="sls3-actions">
              <button data-action="clear-drawing">
                Clear Drawing
              </button>
            </div>

            <p class="sls3-hint">
              Edit captured photos with filters,
              captions, stickers and drawing.
              Video uses the selected color filter.
            </p>
          </aside>
        </div>

        <footer class="sls3-footer">
          <button data-action="download">
            ⬇ Download
          </button>

          <button data-action="upload"
            class="sls3-primary">
            ☁ Upload to Box
          </button>

          <div id="sls3-status"
            role="status"></div>
        </footer>
      </section>
    </div>

    <input type="file"
      id="sls3-upload-input"
      hidden>
  `;

  const CSS = `
    #sls3-overlay[hidden],
    #sls3-overlay [hidden] {
      display: none !important;
    }

    #sls3-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      display: grid;
      place-items: center;
      padding: 12px;
      background: rgba(3, 8, 22, .88);
      backdrop-filter: blur(9px);
      color: #edf5ff;
      font: 14px system-ui, sans-serif;
    }

    #sls3-dialog {
      width: min(1050px, 100%);
      max-height: 95dvh;
      overflow: auto;
      box-sizing: border-box;
      background: linear-gradient(
        145deg, #1b2a47, #0a1225
      );
      border: 1px solid #405579;
      border-radius: 22px;
      padding: 20px;
      box-shadow: 0 25px 90px #000a;
    }

    #sls3-dialog * {
      box-sizing: border-box;
    }

    #sls3-dialog button,
    #sls3-dialog input,
    #sls3-dialog select {
      font: inherit;
    }

    #sls3-dialog button {
      background: #253957;
      color: #eef6ff;
      border: 1px solid #486286;
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
    }

    #sls3-dialog button:hover {
      background: #36547d;
    }

    #sls3-dialog .sls3-primary,
    #sls3-dialog .sls3-tab.active {
      background: linear-gradient(
        110deg, #7863eb, #159fc0
      );
      border-color: transparent;
    }

    .sls3-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .sls3-header h2 {
      margin: 0;
      font-size: 23px;
    }

    .sls3-header p {
      margin: 4px 0 0;
      color: #9db8d8;
      font-size: 12px;
    }

    .sls3-feature {
      margin: 15px 0;
      padding: 13px;
      border: 1px solid #386b9e;
      border-radius: 13px;
      background: #15365c;
    }

    .sls3-feature strong {
      color: #8fe9ff;
    }

    .sls3-feature p {
      color: #d0e5fb;
      font-size: 12px;
      line-height: 1.6;
      margin: 6px 0 0;
    }

    .sls3-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
    }

    .sls3-tabs button {
      flex: 1;
    }

    .sls3-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 260px;
      gap: 14px;
    }

    .sls3-main,
    .sls3-tools {
      background: #101d34;
      border: 1px solid #304665;
      border-radius: 14px;
      padding: 14px;
      min-width: 0;
    }

    .sls3-panel {
      display: none;
    }

    .sls3-panel.active {
      display: block;
    }

    #sls3-photo-video,
    #sls3-photo-canvas,
    #sls3-video-camera,
    #sls3-video-playback {
      width: 100%;
      max-height: 420px;
      display: block;
      background: #020617;
      border-radius: 12px;
      object-fit: contain;
    }

    #sls3-photo-canvas {
      touch-action: none;
      cursor: crosshair;
    }

    .sls3-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 12px 0;
    }

    .sls3-tools h3 {
      margin-top: 0;
    }

    .sls3-tools label,
    .sls3-panel label {
      display: block;
      margin: 12px 0;
      color: #c8d8ed;
      font-size: 13px;
    }

    .sls3-tools input,
    .sls3-tools select,
    .sls3-panel select {
      display: block;
      width: 100%;
      margin-top: 6px;
      padding: 10px;
      background: #1b2c49;
      color: white;
      border: 1px solid #405879;
      border-radius: 9px;
    }

    .sls3-tools input[type="color"] {
      height: 44px;
    }

    .sls3-hint {
      color: #a7bad6;
      font-size: 12px;
      line-height: 1.6;
    }

    .sls3-mic {
      text-align: center;
      font-size: 65px;
      margin: 25px 0;
    }

    .sls3-timer {
      font-size: 32px;
      font-weight: bold;
      color: #8deaff;
      text-align: center;
      margin: 14px 0;
    }

    #sls3-audio-player {
      display: block;
      width: 100%;
      margin: 15px 0;
    }

    .sls3-footer {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 15px;
    }

    #sls3-status {
      flex: 1;
      min-width: 200px;
      font-size: 12px;
      color: #8cf0c8;
    }

    #sls3-status.error {
      color: #ff9eae;
    }

    @media (max-width: 720px) {
      #sls3-dialog {
        padding: 12px;
        border-radius: 15px;
      }

      .sls3-layout {
        grid-template-columns: 1fr;
      }

      .sls3-actions button {
        flex: 1;
      }

      .sls3-header h2 {
        font-size: 19px;
      }
    }
  `;

  /*
   * SIDEBAR INTEGRATION
   */

  function installSidebarEntry() {
    if ($("#sls3-sidebar-entry")) return true;

    const sidebar = $("#sds-modern-vertical");
    if (!sidebar) return false;

    const candidates = [
      ...sidebar.querySelectorAll(
        "button, a, [role='button']"
      )
    ];

    const fileDrop = candidates.find(el =>
      /file\s*drop/i.test(
        el.textContent || ""
      )
    );

    if (!fileDrop) return false;

    const entry = fileDrop.cloneNode(true);

    entry.id = "sls3-sidebar-entry";

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

  /*
   * EVENTS
   */

  async function handleAction(action) {
    switch (action) {
      case "close":
        closeStudio();
        break;

      case "refresh-cameras":
        await listCameras();
        break;

      case "open-photo-camera":
        await activateCamera("#sls3-photo-video");
        break;

      case "capture-photo":
        await capturePhoto();
        break;

      case "retake-photo":
        state.photoSource = null;
        state.photo = null;
        state.strokes = [];
        await activateCamera("#sls3-photo-video");
        break;

      case "choose-photo":
        $("#sls3-photo-input").click();
        break;

      case "clear-drawing":
        state.strokes = [];
        renderPhoto();
        break;

      case "start-voice":
        await startVoice();
        break;

      case "stop-record":
        stopRecorder();
        break;

      case "apply-audio":
        await applyAudioEffect();
        break;

      case "open-video-camera":
        await activateCamera("#sls3-video-camera");
        break;

      case "start-video":
        await startVideo();
        break;

      case "download":
        await downloadCurrent();
        break;

      case "upload":
        await uploadCurrent();
        break;
    }
  }

  function bindEvents() {
    const overlay = $("#sls3-overlay");

    overlay.addEventListener("click", async event => {
      if (event.target === overlay) {
        closeStudio();
        return;
      }

      const tab = event.target.closest("[data-tab]");

      if (tab) {
        selectTab(tab.dataset.tab);
        return;
      }

      const button = event.target.closest(
        "[data-action]"
      );

      if (!button) return;

      try {
        await handleAction(
          button.dataset.action
        );
      } catch (error) {
        console.error(
          "[soloDS Live Studio]",
          error
        );

        status(safeError(error), true);
      }
    });

    $("#sls3-photo-input").addEventListener(
      "change",
      async event => {
        const file = event.target.files?.[0];

        if (!file) return;

        try {
          await importPhoto(file);
        } catch (error) {
          status(safeError(error), true);
        }

        event.target.value = "";
      }
    );

    $("#sls3-filter").addEventListener(
      "change",
      event => {
        state.filter = event.target.value;
        renderPhoto();
      }
    );

    $("#sls3-caption").addEventListener(
      "input",
      renderPhoto
    );

    $("#sls3-sticker").addEventListener(
      "change",
      renderPhoto
    );

    $("#sls3-camera-select").addEventListener(
      "change",
      () => {
        if (!state.recording) {
          stopCamera();
          status(
            "Camera selected. Press Open Camera."
          );
        }
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
    if ($("#sls3-overlay")) return;

    const style = document.createElement("style");
    style.id = "sls3-styles";
    style.textContent = CSS;

    document.head.appendChild(style);

    document.body.insertAdjacentHTML(
      "beforeend",
      HTML
    );

    bindEvents();
    setupDrawing();

    if (installSidebarEntry()) return;

    const observer = new MutationObserver(() => {
      if (installSidebarEntry()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
    }, 60000);
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

  console.info(
    `[soloDS Live Studio] Version ${VERSION} initialized`
  );
})();
