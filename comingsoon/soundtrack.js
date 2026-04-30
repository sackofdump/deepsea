// Bricked Up soundtrack: 25-track playlist (s1..s8 + sa1..sa17). Every
// fresh page load builds a new cycle that opens with sa9, then s2, then
// a shuffle of the remaining 23 tracks. After all 25 tracks have played
// the cycle regenerates with the same rules. Top-right widget (just
// left of the gear sign) for on/off + prev/next + volume. Music defaults
// ON; first user interaction unblocks the browser autoplay gate.
(function () {
  "use strict";

  // Full pool, in deterministic order. The cycle pulls from this list.
  var ALL_TRACKS = [
    "s1.mp3", "s2.mp3", "s3.mp3", "s4.mp3",
    "s5.mp3", "s6.mp3", "s7.mp3", "s8.mp3",
    "sa1.mp3",  "sa2.mp3",  "sa3.mp3",  "sa4.mp3",
    "sa5.mp3",  "sa6.mp3",  "sa7.mp3",  "sa8.mp3",  "sa9.mp3",
    "sa10.mp3", "sa11.mp3", "sa12.mp3", "sa13.mp3",
    "sa14.mp3", "sa15.mp3", "sa16.mp3", "sa17.mp3",
  ];
  var FIRST_TRACK  = "sa9.mp3";
  var SECOND_TRACK = "s2.mp3";
  // All tracks live in /music/. Centralizing the prefix means moving the
  // folder later is a one-line change.
  var TRACK_DIR = "../music/";

  var SETTINGS_KEY = "brickedUp_music_v1";
  var POSITION_KEY = "brickedUp_music_pos_v1";
  var COLLAPSED_KEY = "brickedUp_music_collapsed_v1";

  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { on: true, vol: 0.05, sfxVol: 0.05 };
      var obj = JSON.parse(raw);
      return {
        on:     typeof obj.on     === "boolean" ? obj.on : true,
        vol:    typeof obj.vol    === "number"  ? Math.max(0, Math.min(1, obj.vol))    : 0.05,
        sfxVol: typeof obj.sfxVol === "number"  ? Math.max(0, Math.min(1, obj.sfxVol)) : 0.05,
      };
    } catch (e) {
      return { on: true, vol: 0.05, sfxVol: 0.05 };
    }
  }
  function saveSettings(s) {
    // Only on/off + volumes are persisted. Cycle position resets each load.
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        on: s.on, vol: s.vol, sfxVol: s.sfxVol,
      }));
    } catch (e) {}
  }

  // Fisher–Yates shuffle in place.
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // sa9 first, s2 second, then a fresh shuffle of everything else. No
  // duplicates within a cycle — guaranteed since `rest` is the unique
  // ALL_TRACKS minus the two pinned tracks.
  function buildCycle() {
    var rest = ALL_TRACKS.filter(function (t) {
      return t !== FIRST_TRACK && t !== SECOND_TRACK;
    });
    shuffle(rest);
    return [FIRST_TRACK, SECOND_TRACK].concat(rest);
  }

  var settings = loadSettings();
  saveSettings(settings);

  var cycle = buildCycle();
  var idx = 0; // position within `cycle`

  var audio = new Audio();
  audio.preload = "auto";
  audio.volume = settings.vol;
  audio.src = TRACK_DIR + cycle[idx];

  var btn, vol, trackLabel, prevBtn, nextBtn, sfxVol;

  function refreshUI() {
    if (!btn) return;
    btn.textContent = settings.on ? "🎵 ON" : "🎵 OFF";
    btn.classList.toggle("off", !settings.on);
    trackLabel.textContent = "Track " + (idx + 1) + "/" + cycle.length;
  }

  // Step the cursor by `delta`. After advancing past the end of a cycle,
  // build a fresh cycle (sa9, s2, new shuffle of the rest) and restart
  // at position 0. Going back past 0 wraps to the last track of the
  // current cycle for parity with the prev button's previous behavior.
  function jump(delta) {
    var n = cycle.length;
    var next = idx + delta;
    if (next >= n) {
      cycle = buildCycle();
      idx = 0;
    } else if (next < 0) {
      idx = n - 1;
    } else {
      idx = next;
    }
    audio.src = TRACK_DIR + cycle[idx];
    if (settings.on) audio.play().catch(function () {});
    refreshUI();
  }

  audio.addEventListener("ended", function () { jump(1); });
  // If a track 404s or fails to decode, skip to the next so one bad file
  // doesn't kill the playlist.
  audio.addEventListener("error", function () { jump(1); });

  function injectStyles() {
    if (document.getElementById("music-ctrl-style")) return;
    // Matches the gear button's blue control-panel theme + width so the two
    // sit flush together in the top-right corner.
    var css = ""
      // Anchored just left of the gear sign (.gear-btn is right:20 top:20
      // width:84 in style.css). Width tracks gear-btn at every breakpoint.
      + ".music-ctrl{"
      +   "position:fixed;top:20px;right:120px;z-index:99998;"
      +   "display:flex;flex-direction:column;align-items:stretch;gap:0;"
      +   "padding:0;width:84px;overflow:hidden;"
      +   "background:linear-gradient(180deg,#2c4a64 0%,#1a2e44 60%,#0d1b2a 100%);"
      +   "color:#cfe7ff;border:1px solid rgba(120,200,255,0.55);"
      +   "border-radius:10px;font-family:'Sora',sans-serif;"
      +   "box-shadow:0 0 14px rgba(80,180,255,0.25),"
      +     "inset 0 1px 0 rgba(255,255,255,0.06),"
      +     "inset 0 -3px 0 rgba(0,0,0,0.4);"
      + "}"
      + ".music-ctrl .music-row{"
      +   "display:flex;align-items:center;justify-content:center;"
      +   "gap:4px;padding:4px 6px;"
      + "}"
      + ".music-ctrl .music-row + .music-row{"
      +   "border-top:1px solid rgba(120,200,255,0.15);"
      + "}"
      + ".music-ctrl .music-row-label{padding:2px 6px;}"
      + ".music-ctrl button{"
      +   "background:rgba(120,200,255,0.12);color:#cfe7ff;"
      +   "border:1px solid rgba(120,200,255,0.4);"
      +   "padding:3px 6px;font-weight:800;font-size:10px;cursor:pointer;"
      +   "border-radius:4px;letter-spacing:.6px;font-family:inherit;"
      +   "text-shadow:0 1px 2px rgba(0,0,0,0.6);"
      +   "transition:background .15s ease,border-color .15s ease,transform .08s ease;"
      + "}"
      + ".music-ctrl button:hover{"
      +   "background:rgba(120,200,255,0.22);"
      +   "border-color:rgba(170,220,255,0.85);"
      + "}"
      + ".music-ctrl button:active{transform:translateY(1px);}"
      + ".music-ctrl button.off{"
      +   "background:rgba(80,80,80,0.35);color:#888;"
      +   "border-color:rgba(120,120,120,0.4);"
      + "}"
      + ".music-ctrl button.music-step{flex:1;min-width:0;padding:2px 0;font-size:11px;}"
      + ".music-ctrl .music-toggle{width:100%;text-align:center;font-size:10px;letter-spacing:1px;}"
      + ".music-ctrl input[type=range]{"
      +   "flex:1;width:100%;accent-color:#7ac0ff;cursor:pointer;margin:0;min-width:0;"
      + "}"
      + ".music-ctrl .music-track{"
      +   "font-size:9px;color:#cfe7ff;letter-spacing:.5px;font-weight:700;"
      +   "width:100%;text-align:center;font-variant-numeric:tabular-nums;"
      +   "text-shadow:0 1px 1px rgba(0,0,0,0.6);white-space:nowrap;opacity:.85;"
      + "}"
      + ".music-ctrl .music-vol-icon{"
      +   "font-size:10px;color:#cfe7ff;font-weight:700;flex-shrink:0;"
      + "}"
      // Header doubles as the drag handle; collapse button lives on its right.
      + ".music-ctrl .music-header{"
      +   "display:flex;align-items:center;justify-content:space-between;"
      +   "gap:4px;padding:3px 6px;cursor:grab;"
      +   "background:rgba(120,200,255,0.08);"
      +   "border-bottom:1px solid rgba(120,200,255,0.2);"
      +   "user-select:none;touch-action:none;"
      + "}"
      + ".music-ctrl.music-dragging .music-header{cursor:grabbing;}"
      + ".music-ctrl .music-grip{"
      +   "font-size:10px;color:rgba(207,231,255,0.55);letter-spacing:-1px;"
      +   "pointer-events:none;font-weight:900;line-height:1;"
      + "}"
      + ".music-ctrl .music-title{"
      +   "font-size:11px;flex:1;text-align:center;pointer-events:none;line-height:1;"
      + "}"
      + ".music-ctrl .music-collapse{"
      +   "background:transparent;border:1px solid rgba(120,200,255,0.35);"
      +   "color:#cfe7ff;width:16px;height:16px;padding:0;font-size:13px;"
      +   "line-height:13px;border-radius:3px;font-weight:700;cursor:pointer;"
      +   "display:flex;align-items:center;justify-content:center;"
      + "}"
      + ".music-ctrl .music-collapse:hover{"
      +   "background:rgba(120,200,255,0.18);border-color:rgba(170,220,255,0.85);"
      + "}"
      + ".music-ctrl.collapsed .music-body{display:none;}"
      // Gear-btn shrinks at 720 (→72px) and 380 (→64px); track those.
      + "@media (max-width:720px){"
      +   ".music-ctrl{top:12px;right:96px;width:72px;}"
      + "}"
      + "@media (max-width:380px){"
      +   ".music-ctrl{right:84px;width:64px;}"
      +   ".music-ctrl button{font-size:9px;}"
      + "}"
      // Very narrow — drop below the gear so they don't collide.
      + "@media (max-width:320px){"
      +   ".music-ctrl{top:auto;bottom:12px;right:12px;width:84px;}"
      + "}";
    var s = document.createElement("style");
    s.id = "music-ctrl-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function loadPosition() {
    try {
      var raw = localStorage.getItem(POSITION_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (obj && typeof obj.left === "number" && typeof obj.top === "number") {
        return obj;
      }
    } catch (e) {}
    return null;
  }
  function savePosition(pos) {
    try { localStorage.setItem(POSITION_KEY, JSON.stringify(pos)); } catch (e) {}
  }
  function loadCollapsed() {
    try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch (e) { return false; }
  }
  function saveCollapsed(c) {
    try { localStorage.setItem(COLLAPSED_KEY, c ? "1" : "0"); } catch (e) {}
  }

  // Move widget to absolute pixel coords, clamped to viewport so it can't
  // be dragged off-screen and lost.
  function applyPosition(wrap, pos) {
    if (!pos) return;
    var maxLeft = Math.max(0, window.innerWidth  - wrap.offsetWidth);
    var maxTop  = Math.max(0, window.innerHeight - wrap.offsetHeight);
    var left = Math.max(0, Math.min(maxLeft, pos.left));
    var top  = Math.max(0, Math.min(maxTop,  pos.top));
    wrap.style.right  = "auto";
    wrap.style.bottom = "auto";
    wrap.style.left   = left + "px";
    wrap.style.top    = top  + "px";
  }

  // Pointer-based drag from the header. Clicks on the collapse button (or
  // any nested control) are excluded so they keep working.
  function attachDrag(wrap, handle) {
    var dragging = false, moved = false;
    var startX = 0, startY = 0, origLeft = 0, origTop = 0;
    handle.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest && ev.target.closest("button,input")) return;
      var rect = wrap.getBoundingClientRect();
      origLeft = rect.left; origTop = rect.top;
      startX = ev.clientX; startY = ev.clientY;
      dragging = true; moved = false;
      try { handle.setPointerCapture(ev.pointerId); } catch (e) {}
      wrap.classList.add("music-dragging");
      ev.preventDefault();
    });
    handle.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      var dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      moved = true;
      applyPosition(wrap, { left: origLeft + dx, top: origTop + dy });
    });
    function endDrag(ev) {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(ev.pointerId); } catch (e) {}
      wrap.classList.remove("music-dragging");
      if (moved) {
        var rect = wrap.getBoundingClientRect();
        savePosition({ left: rect.left, top: rect.top });
      }
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
  }

  function buildUI() {
    injectStyles();
    var wrap = document.createElement("div");
    wrap.className = "music-ctrl";

    // Header: drag handle (grip + title) + collapse button
    var header = document.createElement("div");
    header.className = "music-header";
    var grip = document.createElement("span");
    grip.className = "music-grip";
    grip.textContent = "⋮⋮";
    var headerTitle = document.createElement("span");
    headerTitle.className = "music-title";
    headerTitle.textContent = "🎵";
    var collapseBtn = document.createElement("button");
    collapseBtn.className = "music-collapse";
    collapseBtn.title = "Collapse";
    collapseBtn.textContent = "−";
    header.appendChild(grip);
    header.appendChild(headerTitle);
    header.appendChild(collapseBtn);

    // Body — everything that hides on collapse.
    var body = document.createElement("div");
    body.className = "music-body";

    // Toggle row (full width)
    var rowToggle = document.createElement("div");
    rowToggle.className = "music-row";
    btn = document.createElement("button");
    btn.id = "musicToggle";
    btn.className = "music-toggle";
    btn.title = "Music on/off";
    rowToggle.appendChild(btn);

    // Prev | Next row
    var rowSteps = document.createElement("div");
    rowSteps.className = "music-row";
    prevBtn = document.createElement("button");
    prevBtn.className = "music-step";
    prevBtn.title = "Previous track";
    prevBtn.textContent = "⏮";
    nextBtn = document.createElement("button");
    nextBtn.className = "music-step";
    nextBtn.title = "Next track";
    nextBtn.textContent = "⏭";
    rowSteps.appendChild(prevBtn);
    rowSteps.appendChild(nextBtn);

    // 🎶 + music volume slider
    var rowVol = document.createElement("div");
    rowVol.className = "music-row";
    var volIcon = document.createElement("span");
    volIcon.className = "music-vol-icon";
    volIcon.textContent = "🎶";
    vol = document.createElement("input");
    vol.type = "range";
    vol.id = "musicVol";
    vol.min = "0"; vol.max = "100"; vol.step = "1";
    vol.value = String(Math.round(settings.vol * 100));
    vol.title = "Music volume";
    rowVol.appendChild(volIcon);
    rowVol.appendChild(vol);

    // Track N/25 label
    var rowTrack = document.createElement("div");
    rowTrack.className = "music-row music-row-label";
    trackLabel = document.createElement("span");
    trackLabel.className = "music-track";
    rowTrack.appendChild(trackLabel);

    // 🔊 + SFX volume slider. SFX values are read live from localStorage by
    // sfx.js, so persisting on input is the only wire-up we need from here.
    var rowSfx = document.createElement("div");
    rowSfx.className = "music-row";
    var sfxIcon = document.createElement("span");
    sfxIcon.className = "music-vol-icon";
    sfxIcon.textContent = "🔊";
    sfxVol = document.createElement("input");
    sfxVol.type = "range";
    sfxVol.id = "sfxVol";
    sfxVol.min = "0"; sfxVol.max = "100"; sfxVol.step = "1";
    sfxVol.value = String(Math.round(settings.sfxVol * 100));
    sfxVol.title = "SFX volume";
    rowSfx.appendChild(sfxIcon);
    rowSfx.appendChild(sfxVol);

    // SFX label
    var rowSfxLabel = document.createElement("div");
    rowSfxLabel.className = "music-row music-row-label";
    var sfxLabel = document.createElement("span");
    sfxLabel.className = "music-track";
    sfxLabel.textContent = "SFX";
    rowSfxLabel.appendChild(sfxLabel);

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
    sfxVol.addEventListener("input", function () {
      var v = parseInt(sfxVol.value, 10);
      if (!isFinite(v)) v = 0;
      settings.sfxVol = Math.max(0, Math.min(1, v / 100));
      saveSettings(settings);
      // Quick confirmation blip so the player can hear the level.
      if (window.brickedUpSfx && window.brickedUpSfx.pickup) {
        window.brickedUpSfx.pickup("rare");
      }
    });

    body.appendChild(rowToggle);
    body.appendChild(rowSteps);
    body.appendChild(rowVol);
    body.appendChild(rowTrack);
    body.appendChild(rowSfx);
    body.appendChild(rowSfxLabel);

    wrap.appendChild(header);
    wrap.appendChild(body);
    document.body.appendChild(wrap);

    // Restore collapsed state + saved position.
    if (loadCollapsed()) {
      wrap.classList.add("collapsed");
      collapseBtn.textContent = "+";
      collapseBtn.title = "Expand";
    }
    collapseBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var c = wrap.classList.toggle("collapsed");
      collapseBtn.textContent = c ? "+" : "−";
      collapseBtn.title = c ? "Expand" : "Collapse";
      saveCollapsed(c);
    });

    attachDrag(wrap, header);
    applyPosition(wrap, loadPosition());

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
