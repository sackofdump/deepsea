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
      if (!raw) return { on: true, vol: 0.5, idx: 0 };
      var obj = JSON.parse(raw);
      return {
        on:  typeof obj.on  === "boolean" ? obj.on : true,
        vol: typeof obj.vol === "number"  ? Math.max(0, Math.min(1, obj.vol)) : 0.5,
        idx: typeof obj.idx === "number"  ? Math.max(0, Math.min(TRACKS.length - 1, Math.floor(obj.idx))) : 0,
      };
    } catch (e) {
      return { on: true, vol: 0.5, idx: 0 };
    }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  var settings = loadSettings();
  var audio = new Audio();
  audio.preload = "auto";
  audio.volume = settings.vol;
  audio.src = TRACKS[settings.idx];

  var btn, vol, trackLabel;

  function refreshUI() {
    if (!btn) return;
    btn.textContent = settings.on ? "🎵 ON" : "🎵 OFF";
    btn.classList.toggle("off", !settings.on);
    trackLabel.textContent = "S" + (settings.idx + 1) + "/" + TRACKS.length;
  }

  function advance() {
    settings.idx = (settings.idx + 1) % TRACKS.length;
    saveSettings(settings);
    audio.src = TRACKS[settings.idx];
    if (settings.on) audio.play().catch(function () {});
    refreshUI();
  }

  audio.addEventListener("ended", advance);
  // If a track 404s or fails to decode, skip to the next so one bad file
  // doesn't kill the playlist.
  audio.addEventListener("error", function () {
    advance();
  });

  function injectStyles() {
    if (document.getElementById("music-ctrl-style")) return;
    var css = ""
      + ".music-ctrl{"
      +   "position:fixed;top:8px;right:8px;z-index:99998;"
      +   "display:flex;align-items:center;gap:8px;padding:6px 10px;"
      +   "background:rgba(26,26,26,0.9);border:2px solid #ffea2a;"
      +   "border-radius:8px;font-family:'Sora',sans-serif;"
      +   "box-shadow:0 4px 12px rgba(0,0,0,.45);"
      + "}"
      + ".music-ctrl button{"
      +   "background:#ffea2a;color:#1a1a1a;border:1px solid #1a1a1a;"
      +   "padding:4px 10px;font-weight:800;font-size:12px;cursor:pointer;"
      +   "border-radius:4px;letter-spacing:.5px;font-family:inherit;"
      +   "transition:transform .08s ease;"
      + "}"
      + ".music-ctrl button:hover{transform:translateY(-1px);}"
      + ".music-ctrl button.off{background:#555;color:#ddd;}"
      + ".music-ctrl input[type=range]{"
      +   "width:90px;accent-color:#ffea2a;cursor:pointer;margin:0;"
      + "}"
      + ".music-ctrl .music-track{"
      +   "font-size:10px;color:#ffea2a;letter-spacing:.5px;font-weight:700;"
      +   "min-width:34px;text-align:center;"
      + "}"
      // Don't sit on top of the GET BRICKED banner on narrow screens — drop
      // below it instead.
      + "@media (max-width:720px){"
      +   ".music-ctrl{top:auto;bottom:8px;right:8px;padding:4px 8px;}"
      +   ".music-ctrl input[type=range]{width:70px;}"
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

    btn = document.createElement("button");
    btn.id = "musicToggle";
    btn.title = "Music on/off";

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
    vol.addEventListener("input", function () {
      var v = parseInt(vol.value, 10);
      if (!isFinite(v)) v = 0;
      settings.vol = Math.max(0, Math.min(1, v / 100));
      audio.volume = settings.vol;
      saveSettings(settings);
    });

    wrap.appendChild(btn);
    wrap.appendChild(vol);
    wrap.appendChild(trackLabel);
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
