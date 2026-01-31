/* control.js
   Control condition client logic. Responsible for:
   - verifying the user is assigned to the 'control' condition
   - tracking simple interaction counts
   - submitting observation data and session logs to Firestore */

// Firebase modular SDK imports (v9 style)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/*  Firebase setup  */
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

/*  Helper: read cookie  */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";")[0].trim();
  return null;
}

/*  Main logic  */
document.addEventListener("DOMContentLoaded", () => {
  const userId = getCookie("userId");
  const condition = getCookie("condition");

  // Redirect away if the user is not part of the control arm
  if (!userId || condition !== "control") {
    alert("You are not assigned to the control version. Please log in again.");
    window.location.href = "index.html";
    return;
  }

  /*  Session timing  */
  // Persist a session start timestamp (used to compute time-on-task)
  let sessionStart = parseInt(getCookie("sessionStart")) || Date.now();
  document.cookie = `sessionStart=${sessionStart}; path=/`;

  // Simple map of interaction counts tracked in a cookie
  let interactions = JSON.parse(getCookie("interactions") || "{}");

  /*  Track form interactions  */
  // Increment per-control interaction counts when inputs change
  document.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("change", () => {
      const id = el.id || el.name;
      interactions[id] = (interactions[id] || 0) + 1;
      document.cookie = `interactions=${JSON.stringify(interactions)}; path=/`;
    });
  });

  /*  Submit handler  */
  document.getElementById("submitBtn").addEventListener("click", async () => {
    const dateObserved = document.getElementById("dateObserved").value;
    const sawStars = document.getElementById("sawStars").value === "yes";
    const starCount = document.getElementById("starCount").value;
    const patternDescription = document.getElementById("patternDescription").value;

    if (!dateObserved) {
      alert("Please select a date.");
      return;
    }

    const totalTime = Math.floor((Date.now() - sessionStart) / 1000);

    try {
      // Save the control log to Firestore (anonymized userId)
      await addDoc(collection(db, "star_logs_control"), {
        userId: userId,                 // anonymized ID
        condition: condition,           // "control"
        dateObserved: dateObserved,
        sawStars: sawStars,
        starCountEstimate: sawStars ? Number(starCount || 0) : null,
        patternDescription: sawStars ? patternDescription : null,

        // Motivation / engagement metrics
        totalSessionTimeSeconds: totalTime,
        interactions: interactions,

        timestamp: serverTimestamp(),
        studyKey: "mySecretKey123" // This doesn't contribute to the data, it only makes sure that the data submission is only from this study and not other sources/websites if the keys from the beginning of the code were hacked
      });

      alert("Observation submitted successfully.");

      // reset session interaction tracking after successful submit
      interactions = {};
      document.cookie = `interactions={}; path=/`;

    } catch (err) {
      console.error(err);
      alert("Error submitting data.");
    }
  });

  /*  Save on page close (failsafe)  */
  // Attempt to persist a brief session summary when the tab/window closes
  window.addEventListener("beforeunload", async () => {
    const totalTime = Math.floor((Date.now() - sessionStart) / 1000);

    try {
      await addDoc(collection(db, "control_session_logs"), {
        userId: userId,
        condition: condition,
        totalSessionTimeSeconds: totalTime,
        interactions: interactions,
        timestamp: serverTimestamp(),
        studyKey: "mySecretKey123"
      });
    } catch (e) {
      // Best-effort save on unload; failure is non-fatal
      console.warn("Session save failed on unload");
    }
  });

  console.log("control.js initialized");
});
