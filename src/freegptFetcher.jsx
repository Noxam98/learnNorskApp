import ky from "ky";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export const fetchWord = async (prompt) => {
    const url = `${BASE_URL}/generate/?prompt=${encodeURIComponent(prompt)}`;
    return await ky.get(url, { timeout: 120000 }).json();
};
