import axios from "axios";

const fallback = "http://localhost:5000/api";

// Shared Axios instance pointed at the SafeShelf API.
// VITE_API_BASE_URL is set in .env (local) or Vercel project env (production).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? fallback,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});
