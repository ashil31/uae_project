// src/api/config.js

// Auto switch between local and deployed URLs
const isLocalhost = window.location.hostname === "localhost";

export const serverUrl = isLocalhost
  ? "http://localhost:4000/api"
  : "https://uae-project-1.onrender.com/api";

export const ImageUrl = isLocalhost
  ? "http://localhost:4000"
  : "https://uae-project-1.onrender.com";
