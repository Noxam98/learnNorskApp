import OpenAI from "openai";
import { task } from "./assets/task";
// import {GPT_API}from 

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_GPT_API,
  dangerouslyAllowBrowser: true,
});

export const fetchWord = async (languageTranslate, prompt) => {
    const promptAnswer = await openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: task + 'Слово или слова для перевода: ' +`"${prompt}"` + " | lang=" + languageTranslate,
          },
        ],
        model: "gpt-4o",
      });       

      const textAnswerPrompt = promptAnswer.choices[0].message.content;
      const cuttedAnswer = textAnswerPrompt.substring(textAnswerPrompt.indexOf('['), textAnswerPrompt.lastIndexOf(']')+1) 
      if ((!cuttedAnswer.includes('[') && !cuttedAnswer.includes[']'])){
        return {error: 'Bad json from GPT. its returned mnot array. Try again or remake your request.'}
      }
      else
      try {
        const json = JSON.parse(cuttedAnswer)
            if(json.every(item => item.original === 'no' && item.translate.ru)){
              return({words: json})
          }
          else{
            return {error: 'Bad json from GPT. Try again or remake your request.'}
          }
      }
      catch(error){
        return{error: error.message + '/n/n' + JSON.stringify(cuttedAnswer) }
      }    
  }