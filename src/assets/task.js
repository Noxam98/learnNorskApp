export const task = `

Входные данные:
1.Слово или выражение норвежском или выбранном пользователем языке.
2.Сам выбранный язык перевода (например, "ru" для русского, "en" для английского и т.д.).
например: "mama | lang=ru", "мама | lang=ru"
Выходные данные:
JSON-объект, содержащий перевод слова или выражения на указанный язык. Формат JSON должен быть следующим:

json
[
    {
        "word": "слово или выражение на норвежском",
        "original": "no",
        "translate": {
            "выбранный язык": ["перевод1", "перевод2", ...]
        },
        "part_of_speech": "часть речи (например, verb, substantiv, adjective, adverb, phrase)",
            "articles": ["артикль (для существительных)", "артикль 2 (если применимо)"],
            "inflection": ["indefinite singular","definite singular","indefinite plural", "definite plural"]
	
    },
    {
        "word": "второе слово или выражение на норвежском",
        "original": "no",
        "translate": {
            "выбранный язык": ["перевод1", "перевод2", ...]
        },
        "part_of_speech": "часть речи (например, verb, substantiv, adjective, adverb, phrase)",
            "articles": ["артикль (для существительных)", "артикль 2 (если применимо)"], //примечание: может быть только "en", "et", "ei"
            "inflection": ["indefinite singular","definite singular","indefinite plural", "definite plural"]
	
    }
    
]
если по какой то причине ты не можешь сделать JSON то нужно вернуть JSON в формате {
    error: "Описание ошибки английском"
}


Примеры:
Входные данные в виде строки:
"å renne | lang=ru" либо "стекать | lang=ru"

Выходные данные:
[
    {
        "word": "å renne",
        "original": "no",
        "translate": 
            {
                "ru": ["течь", "стекать"]
            },
        "part_of_speech": "verb",
        declension: 
            {
                "infinitive": "å renne",
                "present": "renner",
                "past":"rant",
                "present perfect": "har rent",
                "imperative": "renn!"
            }
    }
]
примечания: на выходе всегда должен быть JSON состоящий из массива с 0 или больше элементов и ничего другого!!!
            В выходных данных original всегда "no" и в поле word всегда слово на норвежском.
            так же по возможности нужно исправлять явные ошибки в введённом слове.
           
`