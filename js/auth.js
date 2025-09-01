// js/auth.js

// Firebase init (config file is separate)
import { db } from "../config/firebase-config.js";
import { collection, getDocs, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// EmailJS init
(function(){
  emailjs.init("YOUR_EMAILJS_PUBLIC_KEY");
})();

async function loadUsers() {
  const response = await fetch("data/users.json");
  return response.json();
}

async function loginUser(email, password) {
  const users = await loadUsers();

  // Check local JSON
  let user = users.find(u => u.email === email && u.password === password);

  // Or check Firebase (for updated accounts)
  if (!user) {
    const userDoc = await getDoc(doc(db, "users", email));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.password === password) {
        user = data;
      }
    }
  }

  if (!user) {
    alert("Invalid credentials");
    return false;
  }

  // Send verification code
  const code = Math.floor(100000 + Math.random() * 900000);
  localStorage.setItem("verifyCode", code);

  await emailjs.send("service_id", "template_id", {
    to_email: user.email,
    to_name: user.name,
    message: `Your verification code is ${code}`
  });

  // Show modal for verification
  document.getElementById("verifyModal").style.display = "block";
  localStorage.setItem("pendingUser", JSON.stringify(user));
}

function verifyCode(inputCode) {
  const correct = localStorage.getItem("verifyCode");
  if (inputCode == correct) {
    const user = JSON.parse(localStorage.getItem("pendingUser"));
    localStorage.setItem("currentUser", JSON.stringify(user));

    // Save login state to Firebase (for cross-device persistence)
    setDoc(doc(db, "sessions", user.email), { loggedIn: true, timestamp: Date.now() });

    window.location.href = "intro.html";
  } else {
    alert("Incorrect code");
  }
}

function logoutUser() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    setDoc(doc(db, "sessions", user.email), { loggedIn: false });
  }
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// Expose globally
window.loginUser = loginUser;
window.verifyCode = verifyCode;
window.logoutUser = logoutUser;
