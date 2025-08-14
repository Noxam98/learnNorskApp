import ky from "ky";

export const fetchWord = async (prompt) =>{
    const url = `${import.meta.env.VITE_API_URL || "http://127.0.0.2:8000/"}generate/?prompt=${prompt}`;
    const json = await ky.get(url, {timeout: 120000}).json();
    return json
  }