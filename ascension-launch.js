// Sitewide "Ascension launch" banner. Auto-injects a fixed top-center
// promo button counting down to 9:30 PM CDT on Apr 29 2026 — when
// Ascension unlocks. Once the launch instant passes the banner flips
// to a "LIVE NOW" link to /comingsoon/. Pages opt in by including
// <script src="ascension-launch.js"></script>; the Ascension page
// itself is auto-detected and skipped.
//
// Single source of truth for the launch time — keep this in sync with
// TALENT_LAUNCH_TS in game-bricked-up.js.
(function () {
  "use strict";

  // Launch gate killed — banner is now a permanent "play Ascension"
  // promo. Set LAUNCH to a positive value if you want to re-enable a
  // countdown later (e.g. Date.UTC(2026, 3, 30, 2, 30, 0) for 9:30 CDT).
  var LAUNCH = 0;
  var HREF = "/comingsoon/";

  function injectStyles() {
    if (document.getElementById("ascension-launch-style")) return;
    var css = ""
      // Sit BELOW the GET BRICKED banner so they stack while both run.
      // Once GET BRICKED expires (Apr 30 02:00 UTC) this stays at 52px;
      // mild gap above is acceptable for the half-hour overlap window.
      + ".al-banner{"
      +   "position:fixed;top:52px;left:50%;transform:translateX(-50%);"
      +   "z-index:99998;display:flex;align-items:center;gap:10px;"
      +   "padding:8px 18px;border-radius:8px;border:2px solid #c8a050;"
      +   "background:linear-gradient(180deg,#1a0008 0%,#0a0010 100%);"
      +   "color:#e8e0d0;font-family:'Sora',sans-serif;"
      +   "font-weight:800;letter-spacing:1.5px;font-size:13px;"
      +   "text-decoration:none;text-transform:uppercase;cursor:pointer;"
      +   "box-shadow:0 0 18px rgba(200,160,80,0.35),0 4px 14px rgba(0,0,0,.55);"
      +   "transition:transform .12s ease,box-shadow .12s ease,filter .15s ease;"
      +   "max-width:calc(100vw - 24px);"
      + "}"
      + ".al-banner:hover{transform:translate(-50%,-2px);filter:brightness(1.12);box-shadow:0 0 26px rgba(200,160,80,0.6),0 6px 18px rgba(0,0,0,.7);}"
      + ".al-banner:active{transform:translate(-50%,1px);box-shadow:0 0 14px rgba(200,160,80,0.4),0 2px 8px rgba(0,0,0,.5);}"
      + ".al-banner .al-mark{font-size:18px;line-height:1;color:#a8123a;text-shadow:0 0 8px rgba(168,18,58,0.6);}"
      + ".al-banner .al-title{display:flex;align-items:center;gap:6px;color:#a8123a;text-shadow:0 0 6px rgba(168,18,58,0.6);}"
      + ".al-banner .al-sub{"
      +   "font-weight:600;font-size:11px;letter-spacing:.8px;opacity:.95;"
      +   "border-left:1px solid rgba(200,160,80,.45);padding-left:8px;color:#c8a050;"
      + "}"
      + ".al-banner.al-live{border-color:#56a040;box-shadow:0 0 22px rgba(86,160,64,0.55),0 4px 14px rgba(0,0,0,.55);}"
      + ".al-banner.al-live .al-mark{color:#56a040;text-shadow:0 0 10px rgba(86,160,64,0.7);}"
      + ".al-banner.al-live .al-title{color:#e8e0d0;text-shadow:0 0 6px rgba(216,200,144,0.45);}"
      + ".al-banner.al-live .al-sub{color:#8ed26a;border-left-color:rgba(86,160,64,.55);}"
      + "@media (max-width:520px){"
      +   ".al-banner{font-size:11px;padding:6px 12px;letter-spacing:.8px;top:48px;}"
      +   ".al-banner .al-sub{font-size:10px;padding-left:6px;}"
      + "}";
    var s = document.createElement("style");
    s.id = "ascension-launch-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // Skip the banner on the Ascension page itself.
  function onAscensionPage() {
    var p = (location.pathname || "").toLowerCase();
    return p.indexOf("/comingsoon") !== -1;
  }

  function fmtCountdown(ms) {
    if (ms <= 0) return "LIVE";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    if (h > 0) return pad(h) + ":" + pad(m) + ":" + pad(sec);
    return pad(m) + ":" + pad(sec);
  }

  function build() {
    var a = document.createElement("a");
    a.className = "al-banner";
    a.href = HREF;
    a.title = "Ascension unlocks at 9:30 PM CDT";
    var mark = document.createElement("span");
    mark.className = "al-mark";
    mark.textContent = "⛧";
    var title = document.createElement("span");
    title.className = "al-title";
    title.textContent = "ASCENSION";
    var sub = document.createElement("span");
    sub.className = "al-sub";
    var label = document.createElement("span");
    label.id = "al-countdown";
    sub.appendChild(document.createTextNode("UNLOCKS IN "));
    sub.appendChild(label);
    a.appendChild(mark);
    a.appendChild(title);
    a.appendChild(sub);
    return { el: a, label: label, sub: sub };
  }

  function setLive(el, sub) {
    el.classList.add("al-live");
    el.title = "Play Ascension";
    sub.textContent = "";
    sub.appendChild(document.createTextNode("LIVE NOW · CLICK TO PLAY"));
  }

  function tick(label, el, sub) {
    var ms = LAUNCH - Date.now();
    if (ms <= 0) {
      setLive(el, sub);
      return; // stop the loop
    }
    label.textContent = fmtCountdown(ms);
    setTimeout(function () { tick(label, el, sub); }, 1000);
  }

  function mount() {
    if (onAscensionPage()) return;
    injectStyles();
    var built = build();
    document.body.appendChild(built.el);
    if (Date.now() >= LAUNCH) {
      setLive(built.el, built.sub);
    } else {
      tick(built.label, built.el, built.sub);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
