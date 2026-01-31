/* tracker.js
   Lightweight client-side tracking utilities used by the study.
   Responsibilities:
   - set/read small cookie values used across the app
   - record simple interaction counts
   - compute week-of-study and auto-save lightweight progress

   This file intentionally avoids complex dependencies so it can
   run in any page quickly. */

// Simple cookie setter/getter helpers (no expiration control)
function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
}

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(name + "="))
    ?.split("=")[1];
}

// Initialize study/session timestamps if not already present
if (!getCookie("studyStart")) {
  setCookie("studyStart", Date.now());
}

if (!getCookie("sessionStart")) {
  setCookie("sessionStart", Date.now());
}

// Compute which study week we're in (1-based)
function getCurrentWeek() {
  const start = parseInt(getCookie("studyStart"));
  const now = Date.now();
  return Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

// Log a named interaction in a small JSON cookie map
function logInteraction(type) {
  const interactions = JSON.parse(getCookie("interactions") || "{}");
  interactions[type] = (interactions[type] || 0) + 1;
  setCookie("interactions", JSON.stringify(interactions));
}

// ---------- SAVE PROGRESS ----------
// Sends a compact snapshot to the server. Called periodically.
function saveProgress() {
  const sessionStart = parseInt(getCookie("sessionStart"));
  const totalTime = Math.floor((Date.now() - sessionStart) / 1000);
  const week = `week${getCurrentWeek()}`;

  fetch("/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: getCookie("userId"),
      condition: getCookie("condition"),
      weeklyTime: { [week]: totalTime },
      totalTime,
      interactions: JSON.parse(getCookie("interactions") || "{}")
    })
  });
}

// Auto-save every minute to reduce data loss risk
setInterval(saveProgress, 60000);
