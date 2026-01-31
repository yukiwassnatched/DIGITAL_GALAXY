// Import the functions you need from the SDKs you need
// Firebase modular SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

/* ================= Firebase setup ================= */
const firebaseConfig = {
  apiKey: "AIzaSyBnthX89K-i7Ppuu4NYHymOxAfmpfn5gwA",
  authDomain: "digital-galaxy-b0529.firebaseapp.com",
  projectId: "digital-galaxy-b0529",
  storageBucket: "digital-galaxy-b0529.firebasestorage.app",
  messagingSenderId: "857678867018",
  appId: "1:857678867018:web:5db8f88a7744e450f654b3",
  measurementId: "G-9XRB8BFSJP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const badgeTiers = [
  { xp: 50, name: "Star Initiate 🌟" },
  { xp: 150, name: "Cosmic Tracker 🛰️" },
  { xp: 350, name: "Nebula Cartographer 🌌" },
  { xp: 450, name: "Galaxy Surveyor 🔭" },
  { xp: 750, name: "Stellar Architect ✨" },
  { xp: 900, name: "Astral Guardian 🛡️" },
  { xp: 1250, name: "Master of the Void 🕳️" },
  { xp: 3000, name: "THANOS" }
];

const badgeGradients = {
  "Star Initiate 🌟": "linear-gradient(135deg, #1a1a2e, #162447)",
  "Cosmic Tracker 🛰️": "linear-gradient(135deg, #162447, #1f4068)",
  "Nebula Cartographer 🌌": "linear-gradient(135deg, #1f4068, #2a2d43)",
  "Galaxy Surveyor 🔭": "linear-gradient(135deg, #1b1b2f, #3a3a5c)",
  "Stellar Architect ✨": "linear-gradient(135deg, #fca311, #ffba08)",
  "Astral Guardian 🛡️": "linear-gradient(135deg, #8ac6d1, #4d9fbe)",
  "Master of the Void 🕳️": "linear-gradient(135deg, #0d1b2a, #1a1a2e)",
  "THANOS": "linear-gradient(135deg, #6a0572, #9d0191)"
};


const xpBarFill = document.getElementById("xpBarFill");
const xpProgressText = document.getElementById("xpProgressText");

/* ================= Cookies ================= */
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(name + "="))
    ?.split("=")[1];
}

/* ================= Auth Check ================= */
const userId = getCookie("userId");
const condition = getCookie("condition");

if (!userId || condition !== "game") {
  alert("You are not assigned to the game version.");
  window.location.href = "index.html";
}

document.cookie = `userId=${userId}; path=/; max-age=${365 * 24 * 60 * 60}`;
document.cookie = `condition=game; path=/; max-age=${365 * 24 * 60 * 60}`;

// ================= QUEST SYSTEM =================
const quests = [
  { id: 1, name: "Draw at least 3 stars today", type: "daily", xp: 20, completed: false },
  { id: 2, name: "Submit a star observation", type: "daily", xp: 10, completed: false },
  { id: 3, name: "Log stars 5 days in a row", type: "weekly", xp: 50, completed: false },
  { id: 4, name: "Unlock a new badge", type: "special", xp: 30, completed: false }
];

function loadQuests() {
  const saved = JSON.parse(localStorage.getItem("quests") || "{}");
  const today = new Date().toDateString();
  const currentWeek = getWeekKey();

  // Reset daily quests
  if (saved.lastDaily !== today) {
    quests.filter(q => q.type === "daily").forEach(q => q.completed = false);
    saved.lastDaily = today;
  }

  // Reset weekly quests
  if (saved.week !== currentWeek) {
    quests.filter(q => q.type === "weekly").forEach(q => q.completed = false);
    saved.week = currentWeek;
  }

  // Restore saved quest completion
  for (const quest of quests) {
    if (saved[quest.id]) quest.completed = saved[quest.id];
  }

  localStorage.setItem("quests", JSON.stringify({ ...saved, lastDaily: saved.lastDaily, week: saved.week }));
}

// ---------- WEEK CALCULATION ----------
function getWeekKey() {
  const d = new Date();
  const year = d.getFullYear();
  const week = Math.floor(
    (d - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000)
  );
  return `${year}-week-${week}`;
}

function completeQuest(id) {
  const quest = quests.find(q => q.id === id);
  if (!quest || quest.completed) return;

  quest.completed = true;

  const saved = JSON.parse(localStorage.getItem("quests") || "{}");
  saved[quest.id] = true;
  localStorage.setItem("quests", JSON.stringify(saved));

  awardXP(quest.xp);

  const questOverlay = document.getElementById("questOverlay");
  if (questOverlay) {
    questOverlay.textContent = `Quest Completed: ${quest.name} +${quest.xp} XP`;
    questOverlay.classList.remove("hidden");
    setTimeout(() => questOverlay.classList.add("hidden"), 3000);
  }

  renderQuests();
}

function renderQuests() {
  const list = document.getElementById("questList");
  if (!list) return;

  list.innerHTML = "";
  for (const quest of quests) {
    const li = document.createElement("li");
    li.textContent = quest.name;
    if (quest.completed) li.classList.add("completed");
    list.appendChild(li);
  }
}

loadQuests();
renderQuests();

/* ================= STREAK SYSTEM ================= */
function getCurrentStreak() {
  const dates = JSON.parse(localStorage.getItem("starLogDates") || "[]")
    .map(d => new Date(d).toDateString())
    .sort((a, b) => new Date(a) - new Date(b));

  let streak = 0;
  const today = new Date();
  let dayCheck = new Date(today);

  for (let i = dates.length - 1; i >= 0; i--) {
    if (new Date(dates[i]).toDateString() === dayCheck.toDateString()) {
      streak++;
      dayCheck.setDate(dayCheck.getDate() - 1); // previous day
    } else if (new Date(dates[i]) < dayCheck) {
      break; // break streak if a day is missed
    }
  }

  return streak;
}

function renderStreak() {
  const streakEl = document.getElementById("streakDisplay");
  if (!streakEl) return;

  const streak = getCurrentStreak();
  streakEl.textContent = `🔥 Current Streak: ${streak} day${streak > 1 ? "s" : ""}`;
}

/* ================= XP + Badge (RESTORED FROM COOKIES) ================= */
let xp = Number(getCookie("xp")) || 0;
let badge = getCookie("badge") || "None";

const xpEl = document.getElementById("xp");
const badgeEl = document.getElementById("badge");

// render restored values immediately
xpEl.textContent = `XP: ${xp}`;
badgeEl.textContent = `Badge: ${badge}`;

/* ================= XP FUNCTIONS ================= */
function awardXP(amount) {
  xp += amount;

  setCookie("xp", xp);
  xpEl.textContent = `XP: ${xp}`;

  checkForNewBadge();
  updateXPBar();

  // XP animation
  xpEl.classList.add("bump");
  setTimeout(() => xpEl.classList.remove("bump"), 300);

  const float = document.createElement("div");
  float.className = "xp-float";
  float.textContent = `+${amount} XP`;

  const rect = xpEl.getBoundingClientRect();
  float.style.left = rect.left + "px";
  float.style.top = rect.top + "px";

  document.body.appendChild(float);
  setTimeout(() => float.remove(), 1000);
}

function updateXPBar() {
  // find next tier
  const nextTier = badgeTiers.find(tier => tier.xp > xp);

  if (!nextTier) {
    xpBarFill.style.width = "100%";
    xpProgressText.textContent = "MAX LEVEL REACHED 🌠";
    return;
  }

  const prevTierXP =
    badgeTiers
      .filter(t => t.xp <= xp)
      .slice(-1)[0]?.xp || 0;

  const progress =
    ((xp - prevTierXP) / (nextTier.xp - prevTierXP)) * 100;

  xpBarFill.style.width = `${Math.min(progress, 100)}%`;

  xpProgressText.textContent =
    `${xp} / ${nextTier.xp} XP — Next badge: ${nextTier.name}`;
}


function checkForNewBadge() {
  let unlockedBadge = badge;

  for (const tier of badgeTiers) {
    if (xp >= tier.xp) {
      unlockedBadge = tier.name;
    }
  }

  if (unlockedBadge !== badge) {
    badge = unlockedBadge;

    setCookie("badge", badge);
    badgeEl.textContent = `Badge: ${badge}`;
    completeQuest(4);

    const overlayBadge = document.getElementById("overlayBadge");
    if (overlayBadge) {
      overlayBadge.textContent = `🏅 ${badge}`;
    }
  }
  // ----- Change background gradient -----
  const newGradient = badgeGradients[badge];
  if (newGradient) {
    document.body.style.background = newGradient;
    document.body.style.transition = "background 1s ease"; // smooth fade
  }
  updateXPBar();
}

// ensure badge is correct on load
checkForNewBadge();
updateXPBar();

/* ================= Canvas Drawing ================= */
const canvas = document.getElementById("starCanvas");
const ctx = canvas.getContext("2d");

let starsDrawn = 0;

/* ----- Resize canvas to match CSS size ----- */
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* ----- Draw star helper ----- */
function drawStar(x, y) {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  starsDrawn++;
}

/* ----- Mouse support ----- */
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  drawStar(e.clientX - rect.left, e.clientY - rect.top);
});

canvas.addEventListener("mousemove", (e) => {
  if (e.buttons !== 1) return;
  const rect = canvas.getBoundingClientRect();
  drawStar(e.clientX - rect.left, e.clientY - rect.top);
});

/* ----- Touch support (mobile) ----- */
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  drawStar(touch.clientX - rect.left, touch.clientY - rect.top);
});

/* ----- Clear canvas ----- */
document.getElementById("clearCanvas").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  starsDrawn = 0;
});

/// ================= Idle Detection =================
let idleTimer;
const idleTime = 60 * 1000; // 1 minute
let hasInteracted = false;

function showIdleScreen() {
  document.getElementById("idleOverlay").classList.remove("hidden");
}

function hideIdleScreen() {
  document.getElementById("idleOverlay").classList.add("hidden");
}

function resetIdleTimer() {
  hideIdleScreen();
  if (!hasInteracted) return; // don't start timer until first interaction
  clearTimeout(idleTimer);
  idleTimer = setTimeout(showIdleScreen, idleTime);
}

// Only mark as interacted on real actions
function markInteraction() {
  if (!hasInteracted) hasInteracted = true;
  resetIdleTimer();
}

renderStreak();

// Listen for interactions
document.addEventListener("mousemove", markInteraction);
document.addEventListener("keydown", markInteraction);
canvas.addEventListener("mousedown", markInteraction);
canvas.addEventListener("mouseup", markInteraction);

/* ================= Submit ================= */
document.getElementById("submitBtn").addEventListener("click", async () => {
  // ================= VALIDATION =================
  const dateObserved = document.getElementById("dateObserved").value;
  const sawStars = document.getElementById("sawStars").value === "yes";
  const starCount = document.getElementById("starCount").value;
  const patternDescription = document.getElementById("patternDescription").value;

  if (!dateObserved) {
    alert("Please select a date.");
    return;
  }

  const drawingData = canvas.toDataURL();

  // ================= FIREBASE SUBMISSION =================
  try {
    // Submit observation data to Firestore
    await addDoc(collection(db, "star_logs_game"), {
      userId,
      condition,
      dateObserved,
      sawStars,
      starCountEstimate: sawStars ? Number(starCount || 0) : null,
      patternDescription: sawStars ? patternDescription : null,
      drawing: sawStars ? drawingData : null,
      timestamp: serverTimestamp(),
      studyKey: "mySecretKey123"
    });

    // ================= REWARD PLAYER =================
    // Generate random XP between 1-25
    const randomXP = Math.floor(Math.random() * 25) + 1;

    // Award XP and update badge/bar
    awardXP(randomXP);

    // Track drawn stars for quest
    // Track today's submission for streak
    let dates = JSON.parse(localStorage.getItem("starLogDates") || "[]");
    const today = new Date().toDateString();
    if (!dates.includes(today)) dates.push(today);
    if (dates.length > 7) dates.shift();
    localStorage.setItem("starLogDates", JSON.stringify(dates));

    // Update streak display
    renderStreak();

    // Daily quest: draw at least 3 stars
    if (starsDrawn >= 3) {
      completeQuest(1);
    }
    starsDrawn = 0;

    // Daily quest: submit a star observation
    if (sawStars) completeQuest(2);

    // Weekly quest: 5-day streak
    if (getCurrentStreak() >= 5) completeQuest(3);

    // Badge unlock quest handled in checkForNewBadge()
    checkForNewBadge();

    // ================= SHOW REWARD OVERLAY =================
    const overlayXP = document.getElementById("overlayXP");
    overlayXP.textContent = `+${randomXP} XP`;

    const overlayBadge = document.getElementById("overlayBadge");
    overlayBadge.textContent = `🏅 ${badge}`;

    // Display reward overlay
    const overlay = document.getElementById("missionOverlay");
    overlay.classList.remove("hidden");

    document.getElementById("closeOverlay").onclick = () => {
      overlay.classList.add("hidden");
    };

  } catch (err) {
    console.error(err);
    alert("Submission failed.");
  }
});