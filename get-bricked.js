// Sitewide "GET BRICKED" event banner. Auto-injects a fixed top-center
// promo button with a live countdown to the 24h Bricked Up event end.
// Pages opt in by including <script src="get-bricked.js"></script>.
//
// Single source of truth for the event end time — keep this in sync with
// EVENT_CONFIG.endAt in bricked-up.html.
(function () {
  "use strict";

  var END = new Date(2026, 3, 29, 23, 59, 59).getTime(); // Apr 29 2026 23:59:59 local
  // Absolute path so this works from /, /mobile/, or any other subpath.
  var HREF = "/bricked-up.html";

  function injectStyles() {
    if (document.getElementById("get-bricked-style")) return;
    var css = ""
      + ".gb-banner{"
      +   "position:fixed;top:8px;left:50%;transform:translateX(-50%);"
      +   "z-index:99999;display:flex;align-items:center;gap:10px;"
      +   "padding:8px 18px;border-radius:8px;border:2px solid #1a1a1a;"
      +   "background:#ffea2a;color:#1a1a1a;font-family:'Sora',sans-serif;"
      +   "font-weight:800;letter-spacing:1.5px;font-size:13px;"
      +   "text-decoration:none;text-transform:uppercase;cursor:pointer;"
      +   "box-shadow:0 3px 0 #1a1a1a,0 8px 18px rgba(0,0,0,.45);"
      +   "transition:transform .12s ease,box-shadow .12s ease;"
      +   "max-width:calc(100vw - 24px);"
      + "}"
      + ".gb-banner:hover{transform:translate(-50%,-2px);box-shadow:0 5px 0 #1a1a1a,0 10px 22px rgba(0,0,0,.55);}"
      + ".gb-banner:active{transform:translate(-50%,1px);box-shadow:0 1px 0 #1a1a1a,0 4px 10px rgba(0,0,0,.4);}"
      + ".gb-banner .gb-stripe{"
      +   "width:14px;height:18px;border:1px solid #1a1a1a;"
      +   "background:repeating-linear-gradient(135deg,#1a1a1a 0 4px,#ffea2a 4px 8px);"
      + "}"
      + ".gb-banner .gb-title{display:flex;align-items:center;gap:6px;}"
      + ".gb-banner .gb-sub{"
      +   "font-weight:600;font-size:11px;letter-spacing:.6px;opacity:.85;"
      +   "border-left:1px solid rgba(0,0,0,.35);padding-left:8px;"
      + "}"
      + ".gb-banner.gb-here{background:#1a1a1a;color:#ffea2a;cursor:default;}"
      + ".gb-banner.gb-here:hover{transform:translateX(-50%);box-shadow:0 3px 0 #ffea2a,0 8px 18px rgba(0,0,0,.45);}"
      + ".gb-banner.gb-here .gb-sub{border-left-color:rgba(255,234,42,.35);}"
      + ".gb-banner.gb-ended{background:#555;color:#ccc;cursor:default;}"
      + ".gb-banner.gb-ended:hover{transform:translateX(-50%);}"
      + ".gb-banner.gb-ended .gb-stripe{background:repeating-linear-gradient(135deg,#222 0 4px,#555 4px 8px);}"
      + "@media (max-width:520px){"
      +   ".gb-banner{font-size:11px;padding:6px 12px;letter-spacing:.8px;}"
      +   ".gb-banner .gb-sub{font-size:10px;padding-left:6px;}"
      + "}";
    var s = document.createElement("style");
    s.id = "get-bricked-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function isHerePage() {
    // Treat the bricked-up page as "here" so the banner reads as a status
    // indicator rather than a self-link. Match on filename, not full path.
    var p = (location.pathname || "").toLowerCase();
    return p.endsWith("/bricked-up.html") || p.endsWith("bricked-up.html");
  }

  function fmtCountdown(ms) {
    if (ms <= 0) return "ENDED";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    return pad(h) + ":" + pad(m) + ":" + pad(sec);
  }

  function build() {
    var here = isHerePage();
    var a = document.createElement(here ? "div" : "a");
    a.className = "gb-banner" + (here ? " gb-here" : "");
    if (!here) {
      a.href = HREF;
      a.title = "Try the 24-hour Bricked Up event";
    } else {
      a.title = "You're in the Bricked Up event";
    }
    var stripe = document.createElement("span");
    stripe.className = "gb-stripe";
    var title = document.createElement("span");
    title.className = "gb-title";
    title.textContent = "🧱 GET BRICKED";
    var sub = document.createElement("span");
    sub.className = "gb-sub";
    var label = document.createElement("span");
    label.id = "gb-countdown";
    sub.appendChild(document.createTextNode(here ? "LIVE · " : "24h · "));
    sub.appendChild(label);
    a.appendChild(stripe);
    a.appendChild(title);
    a.appendChild(sub);
    return { el: a, label: label };
  }

  function tick(label, el) {
    var ms = END - Date.now();
    label.textContent = fmtCountdown(ms);
    if (ms <= 0) {
      el.classList.add("gb-ended");
      el.classList.remove("gb-here");
      if (el.tagName === "A") el.removeAttribute("href");
      return; // stop the loop
    }
    setTimeout(function () { tick(label, el); }, 1000);
  }

  function mount() {
    injectStyles();
    var built = build();
    document.body.appendChild(built.el);
    tick(built.label, built.el);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
