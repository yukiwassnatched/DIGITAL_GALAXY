/* server.js
  Small Express server used for the Digital Galaxy study.

  Responsibilities:
  - serve static files from `public/`
  - accept a minimal `/login` POST for participant allocation
  - persist allocation state in Firebase Firestore
*/

const express = require("express");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const admin = require("firebase-admin");
const serviceAccount = JSON.parse(
  fs.readFileSync(".env/firebaseKey.json", "utf8")
); // Firebase service account key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore(); // Firestore database reference

// APP SETUP 
const app = express();
const PORT = process.env.PORT || 3000; // Use environment port or default to 3000

// MIDDLEWARE

app.use(express.json());
app.use(express.static("public")); 
app.use(cookieParser());

app.use( // Session middleware
  session({
    secret: process.env.SESSION_SECRET || "mySecretKey123",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 28,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// CONFIGURATION 
const PASSWORDS = [
  "DG01", "DG02", "DG03", "DG04", "DG05",
  "DG06", "DG07", "DG08", "DG09", "DG10"
];

const MAX_PER_GROUP = 5; // Max participants per condition

// HELPER FUNCTIONS 

// Count participants per condition from Firestore
async function getCounts() {
  const snapshot = await db.collection("participants").get();
  let control = 0;
  let game = 0;

  snapshot.forEach(doc => { // Iterate through each participant
    const data = doc.data();
    if (data.condition === "control") control++;
    if (data.condition === "game") game++;
  });

  return { control, game };
}

// Assign condition using real database counts
async function assignCondition() {
  const counts = await getCounts();

  if (counts.control >= MAX_PER_GROUP && counts.game >= MAX_PER_GROUP) return null;
  if (counts.control >= MAX_PER_GROUP) return "game";
  if (counts.game >= MAX_PER_GROUP) return "control";
  return Math.random() < 0.5 ? "control" : "game";
}

// ROUTES 
app.get("/", async (req, res) => {
  try {
    // 1️⃣ Check session first
    if (req.session.userId && req.session.condition) {
      const page = req.session.condition === "control" ? "/control.html" : "/game.html";
      return res.redirect(page);
    }

    // 2️⃣ Check cookie and restore session from Firebase
    const userIdFromCookie = req.cookies?.userId;
    if (userIdFromCookie) {
      const doc = await db.collection("participants").doc(userIdFromCookie).get();
      if (doc.exists) {
        const { condition } = doc.data();

        // restore session for this tab
        req.session.userId = userIdFromCookie;
        req.session.condition = condition;

        const page = condition === "control" ? "/control.html" : "/game.html";
        return res.redirect(page);
      }
    }

    // 3️⃣ Default: show login page
    res.sendFile(path.join(__dirname, "public", "login.html"));
  } catch (err) {
    console.error("Error in GET /:", err);
    res.status(500).send("Server error");
  }
});


// LOGIN + RANDOMIZATION 
app.post("/login", async (req, res) => {
  const { password } = req.body;

  if (!PASSWORDS.includes(password)) {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    // Check if password already used
    const passwordDoc = await db.collection("usedPasswords").doc(password).get();
    if (passwordDoc.exists) {
      return res.status(403).json({ error: "Password already used" });
    }

    // Assign condition using counts from Firestore
    const countsSnapshot = await db.collection("participants").get();
    let controlCount = 0;
    let gameCount = 0;
    countsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.condition === "control") controlCount++;
      if (data.condition === "game") gameCount++;
    });

    let condition;
    if (controlCount >= MAX_PER_GROUP && gameCount >= MAX_PER_GROUP) {
      return res.status(403).json({ error: "Study full" });
    } else if (controlCount >= MAX_PER_GROUP) {
      condition = "game";
    } else if (gameCount >= MAX_PER_GROUP) {
      condition = "control";
    } else {
      condition = Math.random() < 0.5 ? "control" : "game";
    }

    // Generate user ID
    const userNumber = condition === "control" ? controlCount + 1 : gameCount + 1;
    const userId = `${condition}_${userNumber}`;

    // Save participant to Firebase
    await db.collection("participants").doc(userId).set({
      userId,
      condition,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark password as used
    await db.collection("usedPasswords").doc(password).set({
      password,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save session
    req.session.userId = userId;
    req.session.condition = condition;

    // Save cookie for persistent login
    res.cookie("userId", userId, {
      maxAge: 1000 * 60 * 60 * 24 * 28, // 28 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.json({ success: true, userId, condition });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

//  START SERVER 
app.listen(PORT, () => {
  console.log(`Digital Galaxy is running on http://localhost:${PORT}`);
});
