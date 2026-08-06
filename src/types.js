// @ts-check
// Центральные JSDoc-типы основных структур приложения. Это НЕ рантайм-код (файл пустой на выходе),
// а единый источник форм данных для проверки типов (jsconfig "checkJs"/пофайловый `// @ts-check`)
// и автодополнения в редакторе. Использование в других файлах:
//   /** @typedef {import('../types.js').GameWord} GameWord */
//   /** @type {GameWord} */ (someWord)
// Многие объекты несут лишние поля из БД — поэтому ключевые формы расширены `& Record<string, any>`,
// чтобы доступ к прочим полям не считался ошибкой, но важные поля были зафиксированы.

/**
 * Язык интерфейса (он же ключ перевода помимо 'no').
 * @typedef {'ru' | 'ukr' | 'en' | 'pl' | 'lt'} UiLang
 */

/**
 * Переводы слова: норвежский + один/несколько целевых языков.
 * @typedef {{ no: string[] } & Partial<Record<UiLang, string[]>>} Translate
 */

/**
 * Грамматические формы (колонка word_pool.forms). Структура зависит от части речи
 * (сущ.: gender/def_sg/indef_pl/def_pl; глагол: present/past/perfect; прил.: neuter/plural/...).
 * @typedef {Record<string, any>} Forms
 */

/**
 * Слово в формате игр (выход toGameWord). Помимо перечисленного несёт прочие поля из БД.
 * @typedef {{
 *   id: number,
 *   pool_id: number,
 *   no?: string,
 *   translate: Translate,
 *   forms?: Forms | null,
 *   part_of_speech?: string,
 *   options?: { w: string, alt?: string | null }[],
 *   distractors?: string[],
 *   cloze?: { blank: string, answer: string, options: string[] },
 *   grammar?: boolean,
 *   target?: { field: string, value: string },
 *   prompt?: { kind?: string, formLabel?: string, lemma?: string },
 *   scoring?: { typoForgive?: boolean },
 * } & Record<string, any>} GameWord
 */

/**
 * Клетка рампы SRS (имя ступени). Обычные слова: card → choice_int2no → choice_no2int (на слух) →
 * build_int2no → input_int2no. Служебные: card → cloze_1 → cloze_2 → cloze_3.
 * Грамматика (overlay поверх выученных): choice_gender / input_indefpl — отдельный тир.
 * @typedef {'card' | 'choice_no2int' | 'choice_int2no' | 'build_int2no' | 'input_int2no'
 *          | 'cloze_1' | 'cloze_2' | 'cloze_3' | 'choice_gender' | 'input_indefpl'} RampCell
 */

/**
 * Элемент системной сессии с бэка: одно слово + назначенная ступень рампы.
 * @typedef {{
 *   pool_id?: number, id?: number, no?: string, translate?: Translate, forms?: Forms | null,
 *   mode?: string, direction?: string | null, step?: RampCell | string | null, audit?: boolean,
 * } & Record<string, any>} SessionElement
 */

/**
 * Нормализованный элемент (выход toElements): игра монтируется на одном слове.
 * @typedef {{ mode: string, dir: string, step: RampCell | string | null, repeat?: boolean, listen?: boolean, gw: GameWord }} NormElement
 */

/**
 * Состояние стейт-машины игрового цикла.
 * @typedef {'ASKING' | 'CORRECT' | 'INCORRECT' | 'FINISHED'} GameStatus
 */

/**
 * Сегмент полосы прогресса. Строка — легаси (экзамен/обычные игры). Объект { state, rank } —
 * системная сессия: state управляет видом, rank (0..4) задаёт оттенок стадии (0 серый … 4 зелёный).
 * @typedef {'ok' | 'err' | 'now' | 'done' | 'card' | '' | 'mst'} SegState
 * @typedef {SegState | { state: SegState | 'future', rank: number }} ProgressSeg
 */

/**
 * Сила (длительность) вибрации.
 * @typedef {'low' | 'mid' | 'high'} VibeStrength
 */

/**
 * Состояние systemStore (zustand).
 * @typedef {{
 *   currentLanguage: UiLang,
 *   theme: 'light' | 'dark',
 *   toast: string,
 *   showArticles: boolean,
 *   showVerbAa: boolean,
 *   soundOn: boolean,
 *   soundVolume: number,
 *   vibration: boolean,
 *   vibrationStrength: VibeStrength,
 *   setCurrentLanguage: (l: UiLang) => void,
 *   setTheme: (t: 'light' | 'dark') => void,
 *   toggleTheme: () => void,
 *   showToast: (text: string) => void,
 *   setShowArticles: (v: boolean) => void,
 *   setShowVerbAa: (v: boolean) => void,
 *   setSoundOn: (v: boolean) => void,
 *   setSoundVolume: (v: number) => void,
 *   setVibration: (v: boolean) => void,
 *   setVibrationStrength: (v: VibeStrength) => void,
 * }} SystemState
 */

export {};
