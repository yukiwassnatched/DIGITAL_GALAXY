# Digital Galaxy
## **Project Overview**
- **Purpose:** Study whether gamification of citizen-science tasks increases participant motivation and engagement. This is a project for AP CAPSTONE RESEARCH. 
- **Core idea:** Both conditions (Control vs Game) ask participants the same observational tasks; the Game version adds an XP system, badges, quests, a drawing canvas, and an idle/overlay screen to increase game-like feedback.

## **How to Run (local)**
- **Install dependencies:** Node.js is required. From the repo root run:

```bash
npm install
```
- **Start server:**

```bash
node server/server.js
```
- **Open the app:** visit `http://localhost:3000` in your browser.

## **How to run for an actaul website**
- The website uses *Render* to run. It is under a web service. 
- Due to a small participant pool, there is not a lot of traffic, therefore the server resets. 

## **Study Design (brief)**
- **Control:** participants complete observation forms and submit the same data as the game version.
- **Game:** same tasks, plus gamified features: an XP/level bar, badges, quests, a canvas for sketching sky patterns, and an idle overlay for atmosphere.
- **Allocation:** participants are assigned on login to either `control` or `game` until each version reaches its configured capacity.

### **Game Mechanics**
- **XP & Badges:** users earn XP for actions and unlock named badges at tier thresholds; the UI updates an XP bar and badge label.
- **Quests & Streaks:** daily/weekly quests and a streak tracker provide additional goals and rewards.
- **Canvas:** a square drawing area lets participants visualize the pattern they saw in the sky (touch + mouse support).
- **Idle screen:** after inactivity the idle overlay appears to reinforce a game-like feel.

### **Data & Privacy**
- **Minimal on-server state:** the server stores allocation metadata and used passwords in `server/data.json`.
- **Anonymized IDs:** the server emits short anonymized IDs (e.g., `control_1`) for participant records; research data is saved to Firestore from the client (see `public/js/game.js` and `public/js/control.js`).
- **Local persistence:** client state (quests, streaks, small XP values) is stored in `localStorage` and lightweight cookies. No PII is stored in this repo.

### **Key Files**
- **Server:** [server/server.js](server/server.js) — static serving + `/login` allocation endpoint (simple JSON store: `server/data.json`).
- **Public pages:** [public/index.html](public/index.html), [public/assigned.html](public/assigned.html), [public/control.html](public/control.html), [public/game.html](public/game.html).
- **Client scripts:** [public/js/game.js](public/js/game.js) (gamified logic), [public/js/control.js](public/js/control.js) (control-version logic), [public/js/login.js](public/js/login.js), [public/js/tracker.js](public/js/tracker.js).
- **Styles:** [public/css/styles.css](public/css/styles.css), [public/css/game.css](public/css/game.css), [public/css/control.css](public/css/control.css), [public/css/assigned.css](public/css/assigned.css).

## **Development Notes**
- The server uses a tiny synchronous JSON file as the allocation store for simplicity and auditability. Thus it only stores used passwords and whether users were assigned correctly. It is not made for a larger participant pool; replace with a database for larger deployments that require a password and authentication system.
- Firebase is used by the client to store observation submissions and log how long they took to submit and if they interacted with elements targeted toward user input (see `public/js/game.js` and `public/js/control.js`) — the project includes a Firebase config in the client for study use.
- Firebase is through a **Google account** with **2 Factor Authentication.** The researcher always **logs out of Google and logs back in through a safe password and 2 Factor Authentication**. This is to ensure there are no data leaks. 
- Render resets their servers if there is no traffic. That means [server/data.json](server/data.json) does clear. But, cookies are saved so user progress is not hindered. 
- To reset allocations during development, edit or delete `server/data.json`.
- ***The code is not perfect! Due to time limitations, some bugs may occur. Please proceed with caution and patience***


## **Troubleshooting**
- If you hit allocation limits, either increase `MAX_PER_GROUP` in [server/server.js](server/server.js) or clear `server/data.json`.
- If the game UI appears to misbehave, open the browser console for client-side errors and verify network calls to Firestore or the local server.

## **Calls for a future study**
- More participants to compare the full extent of inducing participation with gamification
- Add more diverse activites (like roam around world, leaderboard, etc)
- A CSP with a different theme (earth-science, biology, etc)

