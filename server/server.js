/* server.js
  Small Express server used for the Digital Galaxy study.

  Responsibilities:
  - serve static files from `public/`
  - accept a minimal `/login` POST for participant allocation
  - persist lightweight allocation state in `server/data.json`

  This file intentionally keeps logic simple and synchronous
  so the allocation rules are easy to inspect. */

const express = require("express"); // Express framework
const fs = require("fs"); // For file system access
const path = require("path"); // For file paths
const session = require("express-session"); // For session management
const cookieParser = require("cookie-parser"); // To read cookies


const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies and serve the front-end from `public/`.
app.use(express.json()); // Parse JSON request bodies
app.use(express.static("public")); // Serve static files
app.use(cookieParser()); // To read cookies

// *
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mySecretKey123", // use strong env secret in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 28,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  })
);

// Redirect homepage based on session condition
app.get("/", (req, res) => {
  // Check if session exists
  if (req.session.userId && req.session.condition) {
    const page = req.session.condition === "control" ? "/control.html" : "/game.html";
    return res.redirect(page);
  }

  // If no session, check cookie
  const userIdFromCookie = req.cookies?.userId; // or use JS to read cookie
  if (userIdFromCookie) {
    const data = loadData();
    // Look for user in JSON
    let condition = null;
    if (Object.values(data.control).some(u => u.userId === userIdFromCookie)) {
      condition = "control";
    } else if (Object.values(data.game).some(u => u.userId === userIdFromCookie)) {
      condition = "game";
    }
    if (condition) {
      // Restore session
      req.session.userId = userIdFromCookie;
      req.session.condition = condition;
      const page = condition === "control" ? "/control.html" : "/game.html";
      return res.redirect(page);
    }
  }

  // Not logged in → show login page
  res.sendFile(path.join(__dirname, "public", "login.html"));
});


// ====== CONFIGURATION ======
// Allowed participant passwords (pre-issued codes used by participants) and are given along with website address
const PASSWORDS = [
  "DG01", "DG02", "DG03", "DG04", "DG05",
  "DG06", "DG07", "DG08"
];

// Simple JSON file used as a tiny on-disk store for allocation state.
const DATA_FILE = path.join(__dirname, "data.json");

// Maximum participants allowed per condition
const MAX_PER_GROUP = 4;

// ====== DATA HANDLING ======
// Very small synchronous helpers to read/write the JSON store.
// It logs any used passwords 
function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const emptyData = { control: {}, game: {}, usedPasswords: [] };
      fs.writeFileSync(DATA_FILE, JSON.stringify(emptyData, null, 2));
      return emptyData;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      control: parsed.control || {},
      game: parsed.game || {},
      usedPasswords: parsed.usedPasswords || []
    };
  } catch (err) {
    // On error return a safe empty structure so the server can continue. Participant pool is small and cookies will save progress if they log in again
    console.error("Data load error:", err);
    return { control: {}, game: {}, usedPasswords: [] };
  }
}

function saveData(data) {
  // Synchronous write; acceptable here because the dataset is tiny.
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

//  HELPER FUNCTIONS 
// Count how many participant shells are stored per condition.
function getCounts(data) {
  return {
    control: Object.keys(data.control || {}).length,
    game: Object.keys(data.game || {}).length
  };
}

// Simple allocation policy:
// - If both arms are full, return null (study full)
// - If one arm is full, place new participant in the other arm
// - Otherwise randomly assign 50/50
function assignCondition(counts) {
  if (counts.control >= MAX_PER_GROUP && counts.game >= MAX_PER_GROUP) return null;
  if (counts.control >= MAX_PER_GROUP) return "game";
  if (counts.game >= MAX_PER_GROUP) return "control";
  return Math.random() < 0.5 ? "control" : "game";
}

//  LOGIN + RANDOMIZATION 
// Minimal endpoint used by the front-end to validate a pre-issued
// password and allocate a participant to a condition.
app.post("/login", (req, res) => {
  const { password } = req.body;
  const data = loadData();

  if (!PASSWORDS.includes(password)) return res.status(401).json({ error: "Invalid password" });
  if (data.usedPasswords.includes(password)) return res.status(403).json({ error: "Password already used" });

  const counts = getCounts(data);
  const condition = assignCondition(counts);
  if (!condition) return res.status(403).json({ error: "Study full" });

  const userNumber = counts[condition] + 1;
  const userId = `${condition}_${userNumber}`;

  data.usedPasswords.push(password);
  data[condition][userNumber] = { userId };

  saveData(data);

  // Save session info
  req.session.userId = userId;
  req.session.condition = condition;

  // Save cookie to persist across Render restarts
  res.cookie("userId", userId, { 
    maxAge: 1000 * 60 * 60 * 24 * 28, 
    sameSite: "lax", 
    secure: process.env.NODE_ENV === "production"
  });

  return res.json({ success: true, userId, condition });
});

//  START SERVER 
app.listen(PORT, () => {
  console.log(`Digital Galaxy running at http://localhost:${PORT}`);
});
