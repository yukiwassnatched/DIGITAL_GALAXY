/* Simple client-side login helper used by the login page.
   It posts the password to the server, stores returned session
   tokens locally (here using localStorage) and navigates to
   the assignment page. Keep this file minimal for security. */

async function login() {
    const password = document.getElementById('password').value;

    // Basic client-side validation to avoid unnecessary requests
    if(!password) {
        alert('Please enter your password.');
        return;
    }

    // Send credentials to the server and expect a JSON response
    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
    });

    const data = await response.json();
    if (!data.success) {
        // Server-provided message (keeps client logic thin)
        alert(data.error);
        return;
    }

    // Persist minimal session identifiers locally for subsequent pages
    localStorage.setItem("userId", data.userId);
    localStorage.setItem("condition", data.condition);

    // Proceed to the assigned page which will route the user.
    window.location.href = "assigned.html";
}