/* Read session cookies and route the participant to the
   appropriate version (Control or Gamified). Small helper
   functions are intentionally unobtrusive and synchronous. */

// Read a cookie value by name. Returns the string value or null.
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';')[0].trim();
  return null;
}

// When the page loads, validate session cookies and show which
// experimental condition the user has been assigned to. Clicking
// the continue button redirects the user to the correct page.
document.addEventListener("DOMContentLoaded", () => {
  const userId = getCookie("userId");
  const condition = getCookie("condition");

  if (!userId || !condition) {
    alert("Session missing. Please log in again.");
    window.location.href = "index.html";
    return;
  }

  const versionMessage = document.getElementById("versionMessage");
  versionMessage.innerText = `You have been assigned to the ${condition === "control" ? "Control" : "Gamified"} version.`;

  const continueBtn = document.getElementById("continueBtn");
  continueBtn.addEventListener("click", () => {
    if (condition === "control") {
      window.location.href = "/control.html";
    } else if (condition === "game") {
      window.location.href = "/game.html";
    } else {
      alert("Invalid condition. Contact the researcher.");
      window.location.href = "index.html";
    }
  });
});
