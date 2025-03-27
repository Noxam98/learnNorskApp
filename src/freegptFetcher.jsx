import ky from "ky";

export const fetchWord = async (prompt) =>{
    let resultFetch = {}

      const url = 'https://learn-norsk-backend.fly.dev/generate/?prompt='+prompt;

      const json = await ky.get(url, {timeout: 120000}).json();
    console.log(json)

    return json

  }