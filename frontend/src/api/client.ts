import axios from "axios";

const fallback = "http://localhost:5000/api";

/** Axios instance targeting the SafeShelf API — wire calls from modules when ready. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? fallback,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});
