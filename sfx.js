// Bricked Up sound effects, synthesized in-browser via Web Audio. No
// audio files needed — every sound is a few oscillators + envelopes,
// shaped to read as construction-site mechanical (square/triangle waves
// rather than sine pads).
//
// Public API on window.brickedUpSfx:
//   spin()       — slot reels rolling (deceleration ticks)
//   reelStop()   — single thud as each reel locks in
//   bonus(tier)  — slot result fanfare keyed by tier name
//                  ("shark"|"mini"|"minor"|"major"|"jackpot")
//
// Volume follows the music slider (settings.vol from soundtrack.js'
// localStorage entry). SFX gain is music_vol * 0.7 so it sits under
// the soundtrack at the same slider position.
(function () {
  "use strict";

  var ctx = null;
  var unlocked = false;

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) {
      return null;
    }
    return ctx;
  }

  function unlock() {
    var c = ensureCtx();
    if (!c) return;
    if (c.state === "suspended") {
      c.resume().catch(function () {});
    }
    unlocked = true;
  }

  // Browser autoplay policy: AudioContext starts suspended until a user
  // gesture. Capture-phase listeners on every interaction surface so the
  // first click/key/touch unsuspends without competing with game handlers.
  function attachUnlock() {
    var fire = function () { unlock(); };
    ["click", "keydown", "touchstart", "pointerdown"].forEach(function (ev) {
      document.addEventListener(ev, fire, { capture: true });
    });
  }
  attachUnlock();

  // Read music volume (0..1) directly from soundtrack.js's localStorage
  // record. SFX rides 70% of the music slider so the two stay balanced
  // at any setting, including silent.
  function sfxVol() {
    try {
      var raw = localStorage.getItem("brickedUp_music_v1");
      if (!raw) return 0.25 * 0.7;
      var obj = JSON.parse(raw);
      var v = (typeof obj.vol === "number") ? obj.vol : 0.25;
      return Math.max(0, Math.min(1, v)) * 0.7;
    } catch (e) {
      return 0.25 * 0.7;
    }
  }

  // Schedule an oscillator with attack/release envelope. Frequencies
  // are in Hz; `freqEnd` (optional) sweeps via exponential ramp so
  // pitch slides sound natural.
  function tone(opts) {
    var c = ensureCtx();
    if (!c || !unlocked) return;
    var t0 = c.currentTime + (opts.delay || 0);
    var dur = opts.dur || 0.1;
    var freqStart = opts.freq || 440;
    var freqEnd = opts.freqEnd || freqStart;
    var type = opts.type || "sine";
    var peak = (opts.gain != null ? opts.gain : 0.3) * sfxVol();
    if (peak <= 0) return;
    var attack  = opts.attack  || 0.005;
    var release = opts.release || 0.05;

    var osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(0.01, freqEnd), t0 + dur);
    }

    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.setValueAtTime(peak, Math.max(t0 + attack, t0 + dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Short white-noise burst (good for impact hits / brick smashes).
  function noise(opts) {
    var c = ensureCtx();
    if (!c || !unlocked) return;
    var t0 = c.currentTime + (opts.delay || 0);
    var dur = opts.dur || 0.15;
    var peak = (opts.gain != null ? opts.gain : 0.3) * sfxVol();
    if (peak <= 0) return;
    var sampleCount = Math.floor(c.sampleRate * dur);
    var buffer = c.createBuffer(1, sampleCount, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < sampleCount; i++) data[i] = (Math.random() * 2 - 1);
    var src = c.createBufferSource();
    src.buffer = buffer;

    var g = c.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    var filter = c.createBiquadFilter();
    filter.type = opts.filter || "highpass";
    filter.frequency.setValueAtTime(opts.cutoff || 1000, t0);

    src.connect(filter).connect(g).connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  window.brickedUpSfx = {
    // Decelerating tick stream that fits the ~1.6s slot animation
    // (reels stop at 900/1250/1600ms inside spinSlot).
    spin: function () {
      var t = 0;
      var i = 0;
      while (t < 1.55 && i < 40) {
        // Gap grows from 0.06s to ~0.16s — tick rate slows toward stop.
        var gap = 0.06 + (t / 1.6) * 0.10;
        tone({
          delay:   t,
          dur:     0.04,
          freq:    700,
          type:    "square",
          gain:    0.12,
          attack:  0.001,
          release: 0.01,
        });
        t += gap;
        i += 1;
      }
    },
    // Reel locks: a low kick + soft thud noise.
    reelStop: function () {
      tone({
        dur: 0.12, freq: 220, freqEnd: 80, type: "sine",
        gain: 0.4, attack: 0.001, release: 0.06,
      });
      noise({ dur: 0.08, gain: 0.22, filter: "lowpass", cutoff: 400 });
    },
    // Tier-keyed result fanfare. Each tier gets its own motif.
    bonus: function (tier) {
      if (tier === "shark") {
        // Bonk! — descending square then a soft thud
        tone({ dur: 0.20, freq: 480, freqEnd: 80, type: "square", gain: 0.32 });
        noise({ delay: 0.05, dur: 0.18, gain: 0.20, filter: "lowpass", cutoff: 700 });
      } else if (tier === "mini") {
        // Brick Delivery: backup-truck beeps
        for (var i = 0; i < 3; i++) {
          tone({
            delay: i * 0.18, dur: 0.10, freq: 880,
            type: "square", gain: 0.26,
          });
        }
      } else if (tier === "minor") {
        // Bricklayer's Trance: rising 3-note chime (C5 E5 G5)
        [523.25, 659.25, 783.99].forEach(function (f, n) {
          tone({
            delay: n * 0.10, dur: 0.20, freq: f,
            type: "sine", gain: 0.28, release: 0.08,
          });
        });
      } else if (tier === "major") {
        // Master Brickworks: fanfare (C5 E5 G5 C6) + shimmer
        [523.25, 659.25, 783.99, 1046.50].forEach(function (f, n) {
          tone({
            delay: n * 0.10, dur: 0.22, freq: f,
            type: "triangle", gain: 0.3, release: 0.10,
          });
        });
        tone({
          delay: 0.55, dur: 0.5, freq: 1568, freqEnd: 1046,
          type: "sine", gain: 0.20, release: 0.25,
        });
      } else if (tier === "jackpot") {
        // GET BRICKED: brick-smash hit + sustained chord + ascending
        // arpeggio + sustained finale. Layered so it feels like a
        // proper payout.
        noise({ dur: 0.16, gain: 0.50, filter: "highpass", cutoff: 800 });
        // Triad pad (C major, low octave): C4 E4 G4
        [261.63, 329.63, 392.00].forEach(function (f) {
          tone({
            delay: 0.05, dur: 0.45, freq: f,
            type: "triangle", gain: 0.16, release: 0.20,
          });
        });
        // Ascending run
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach(function (f, n) {
          tone({
            delay: 0.50 + n * 0.08, dur: 0.10, freq: f,
            type: "square", gain: 0.20,
          });
        });
        // Sustained finale (high C)
        tone({
          delay: 0.95, dur: 0.7, freq: 1046.50,
          type: "triangle", gain: 0.32, release: 0.35,
        });
      }
    },
  };
})();
