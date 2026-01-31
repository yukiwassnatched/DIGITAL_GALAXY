/* Handles the initial login interaction. Clears stale session
   cookies, posts the password to the server, and on success sets
   fresh session cookies then navigates to `assigned.html`. */

async function login() {
  const password = document.getElementById("password").value.trim();

  // Clear old cookies to avoid leaking previous session state
  ["userId","condition","interactions","sessionStart"].forEach(c => {
    document.cookie = `${c}=; Max-Age=0; path=/`;
  });

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Login failed. Try again.");
      return;
    }

    // Establish session cookies used by subsequent pages
    document.cookie = `userId=${data.userId}; path=/`;
    document.cookie = `condition=${data.condition}; path=/`;
    document.cookie = `interactions={}; path=/`;
    document.cookie = `sessionStart=${Date.now()}; path=/`;

    // Redirect the user to the assignment page (which will route them)
    window.location.href = "assigned.html";

  } catch (err) {
    console.error(err);
    alert("Network error. Please try again.");
  }
}
