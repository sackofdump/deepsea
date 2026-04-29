// Bricked Up soundtrack: loops s1..s8.mp3 in order, top-right widget
// for on/off + volume. Settings persist in localStorage. Music defaults
// ON; first user interaction unblocks the browser autoplay gate.
(function () {
  "use strict";

  var TRACKS = [
    "s1.mp3", "s2.mp3", "s3.mp3", "s4.mp3",
    "s5.mp3", "s6.mp3", "s7.mp3", "s8.mp3",
  ];
  var SETTINGS_KEY = "brickedUp_music_v1";

  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { on: true, vol: 0.25, idx: 1 };
      var obj = JSON.parse(raw);
      return {
        on:  typeof obj.on  === "boolean" ? obj.on : true,
        vol: typeof obj.vol === "number"  ? Math.max(0, Math.min(1, obj.vol)) : 0.5,
        idx: typeof obj.idx === "number"  ? Math.max(0, Math.min(TRACKS.length - 1, Math.floor(obj.idx))) : 1,
      };
    } catch (e) {
      return { on: true, vol: 0.25, idx: 1 };
    }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  var settings = loadSettings();
  // Always boot on s2 (idx 1) regardless of whichever track was playing
  // last session — the player can step forward/back during the session.
  settings.idx = 1;
  saveSettings(settings);
  var audio = new Audio();
  audio.preload = "auto";
  audio.volume = settings.vol;
  audio.src = TRACKS[settings.idx];

  var btn, vol, trackLabel, prevBtn, nextBtn;

  function refreshUI() {
    if (!btn) return;
    btn.textContent = settings.on ? "🎵 ON" : "🎵 OFF";
    btn.classList.toggle("off", !settings.on);
    trackLabel.textContent = "S" + (settings.idx + 1) + "/" + TRACKS.length;
  }

  function jump(delta) {
    var n = TRACKS.length;
    settings.idx = ((settings.idx + delta) % n + n) % n;
    saveSettings(settings);
    audio.src = TRACKS[settings.idx];
    if (settings.on) audio.play().catch(function () {});
    refreshUI();
  }

  audio.addEventListener("ended", function () { jump(1); });
  // If a track 404s or fails to decode, skip to the next so one bad file
  // doesn't kill the playlist.
  audio.addEventListener("error", function () { jump(1); });

  function injectStyles() {
    if (document.getElementById("music-ctrl-style")) return;
    // Worksite radio aesthetic: brick-red body, hardhat-yellow trim, a
    // hazard-stripe lid up top. Lives in the bottom-right corner so it
    // dodges the gear sign (top-right) and the boost button (bottom-left).
    var css = ""
      // Anchored to the top-right just left of the gear sign
      // (.gear-btn is right:20 top:20 width:84 in style.css).
      + ".music-ctrl{"
      +   "position:fixed;top:20px;right:120px;z-index:99998;"
      +   "display:flex;flex-direction:column;align-items:stretch;gap:0;"
      +   "padding:0;border:2px solid #1a1a1a;border-radius:6px;"
      +   "background:linear-gradient(180deg,#8a3a25 0%,#5a2515 100%);"
      +   "font-family:'Sora',sans-serif;"
      +   "box-shadow:0 4px 0 #1a1a1a,0 8px 18px rgba(0,0,0,.55);"
      +   "min-width:206px;"
      + "}"
      // Hazard-stripe lid — same visual language as the GET BRICKED banner.
      + ".music-ctrl::before{"
      +   "content:'';display:block;height:6px;"
      +   "background:repeating-linear-gradient(135deg,#1a1a1a 0 6px,#ffea2a 6px 12px);"
      +   "border-bottom:1px solid #1a1a1a;"
      + "}"
      + ".music-ctrl .music-row{"
      +   "display:flex;align-items:center;gap:6px;padding:6px 8px;"
      + "}"
      + ".music-ctrl .music-row + .music-row{"
      +   "border-top:1px dashed rgba(255,234,42,.25);"
      + "}"
      + ".music-ctrl button{"
      +   "background:#ffea2a;color:#1a1a1a;border:1px solid #1a1a1a;"
      +   "padding:3px 8px;font-weight:800;font-size:12px;cursor:pointer;"
      +   "border-radius:3px;letter-spacing:.5px;font-family:inherit;"
      +   "transition:transform .08s ease,box-shadow .08s ease;"
      +   "box-shadow:0 2px 0 #1a1a1a;"
      + "}"
      + ".music-ctrl button:hover{transform:translateY(-1px);box-shadow:0 3px 0 #1a1a1a;}"
      + ".music-ctrl button:active{transform:translateY(1px);box-shadow:0 1px 0 #1a1a1a;}"
      + ".music-ctrl button.off{background:#555;color:#ddd;}"
      + ".music-ctrl button.music-step{padding:3px 6px;min-width:26px;font-size:11px;}"
      + ".music-ctrl .music-toggle{flex:1;text-align:center;}"
      + ".music-ctrl input[type=range]{"
      +   "flex:1;width:100%;accent-color:#ffea2a;cursor:pointer;margin:0;"
      + "}"
      + ".music-ctrl .music-track{"
      +   "font-size:10px;color:#ffea2a;letter-spacing:.8px;font-weight:800;"
      +   "min-width:36px;text-align:center;font-variant-numeric:tabular-nums;"
      +   "text-shadow:0 1px 0 #1a1a1a;"
      + "}"
      + ".music-ctrl .music-vol-icon{"
      +   "font-size:11px;color:#ffea2a;letter-spacing:.5px;font-weight:700;"
      + "}"
      // Gear-btn shrinks at the same breakpoints in style.css (720 and
      // 380), so slide the music widget in to stay flush against it.
      + "@media (max-width:720px){"
      +   ".music-ctrl{top:12px;right:96px;min-width:170px;}"
      +   ".music-ctrl button{font-size:11px;padding:2px 6px;}"
      + "}"
      // Below ~480px the widget would overlap the gear sign before it can
      // fit at all — drop it to its own row directly under the gear sign.
      + "@media (max-width:480px){"
      +   ".music-ctrl{top:auto;bottom:12px;right:12px;min-width:160px;}"
      + "}";
    var s = document.createElement("style");
    s.id = "music-ctrl-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function buildUI() {
    injectStyles();
    var wrap = document.createElement("div");
    wrap.className = "music-ctrl";

    // Row 1: prev | ON/OFF (with track label) | next
    var row1 = document.createElement("div");
    row1.className = "music-row";

    prevBtn = document.createElement("button");
    prevBtn.className = "music-step";
    prevBtn.title = "Previous track";
    prevBtn.textContent = "⏮";

    btn = document.createElement("button");
    btn.id = "musicToggle";
    btn.className = "music-toggle";
    btn.title = "Music on/off";

    nextBtn = document.createElement("button");
    nextBtn.className = "music-step";
    nextBtn.title = "Next track";
    nextBtn.textContent = "⏭";

    row1.appendChild(prevBtn);
    row1.appendChild(btn);
    row1.appendChild(nextBtn);

    // Row 2: 🔊 icon + volume slider + Sn/8 label
    var row2 = document.createElement("div");
    row2.className = "music-row";

    var volIcon = document.createElement("span");
    volIcon.className = "music-vol-icon";
    volIcon.textContent = "🔊";

    vol = document.createElement("input");
    vol.type = "range";
    vol.id = "musicVol";
    vol.min = "0";
    vol.max = "100";
    vol.step = "1";
    vol.value = String(Math.round(settings.vol * 100));
    vol.title = "Music volume";

    trackLabel = document.createElement("span");
    trackLabel.className = "music-track";

    row2.appendChild(volIcon);
    row2.appendChild(vol);
    row2.appendChild(trackLabel);

    btn.addEventListener("click", function () {
      settings.on = !settings.on;
      saveSettings(settings);
      if (settings.on) {
        audio.play().catch(function () {});
      } else {
        audio.pause();
      }
      refreshUI();
    });
    prevBtn.addEventListener("click", function () { jump(-1); });
    nextBtn.addEventListener("click", function () { jump(1); });
    vol.addEventListener("input", function () {
      var v = parseInt(vol.value, 10);
      if (!isFinite(v)) v = 0;
      settings.vol = Math.max(0, Math.min(1, v / 100));
      audio.volume = settings.vol;
      saveSettings(settings);
    });

    wrap.appendChild(row1);
    wrap.appendChild(row2);
    document.body.appendChild(wrap);
    refreshUI();
  }

  function tryStart() {
    if (!settings.on) return;
    audio.play().catch(function () {
      // Autoplay blocked — wait for the first user gesture and then start.
    });
  }

  function attachUnblock() {
    var unblock = function () {
      if (settings.on && audio.paused) {
        audio.play().catch(function () {});
      }
      document.removeEventListener("click", unblock, true);
      document.removeEventListener("keydown", unblock, true);
      document.removeEventListener("touchstart", unblock, true);
      document.removeEventListener("pointerdown", unblock, true);
    };
    document.addEventListener("click", unblock, true);
    document.addEventListener("keydown", unblock, true);
    document.addEventListener("touchstart", unblock, true);
    document.addEventListener("pointerdown", unblock, true);
  }

  function start() {
    buildUI();
    tryStart();
    attachUnblock();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
