// Грамм-упражнения (overlay род/формы): проверяем деривацию, на которой строятся
// грамм-ветки ChoiceGame/InputGame — верный ответ = target.value (а не перевод/лемма),
// варианты выбора = el.options (артикли), подписи форм локализованы, отдельный тир рампы.
import { describe, it, expect } from "vitest";
import { isGrammar, grammarAnswer, grammarOptions, FORM_LABEL, stageRank, foldLight } from "./gameShared.jsx";

// Контракт из бэка (зафиксирован): выбор рода и ввод неопр. мн.ч.
const genderEl = {
    pool_id: 1, no: "bok", part_of_speech: "noun", step: "choice_gender",
    grammar: true, mode: "choice", direction: "gender",
    target: { field: "gender", value: "ei" },
    prompt: { kind: "lemma+formLabel", formLabel: "gender", lemma: "bok" },
    options: [{ w: "en", alt: null }, { w: "ei", alt: null }, { w: "et", alt: null }],
    distractors: ["en", "et"],
};
const inputEl = {
    pool_id: 1, no: "bok", part_of_speech: "noun", step: "input_indefpl",
    grammar: true, mode: "input", direction: "indefpl",
    target: { field: "indef_pl", value: "bøker" },
    prompt: { kind: "lemma+formLabel", formLabel: "indef_pl", lemma: "bok" },
    scoring: { typoForgive: false },
};

describe("грамм-упражнения: деривация", () => {
    it("isGrammar ловит флаг grammar и/или наличие target", () => {
        expect(isGrammar(genderEl)).toBe(true);
        expect(isGrammar(inputEl)).toBe(true);
        expect(isGrammar({ target: { field: "x", value: "y" } })).toBe(true);   // без флага, но есть target
        expect(isGrammar({ no: "bok", translate: { no: ["bok"] } })).toBe(false); // обычное слово
        expect(isGrammar(null)).toBe(false);
    });

    it("ChoiceGame-ветка: верный ответ = target.value (артикль), а не перевод/лемма", () => {
        expect(grammarAnswer(genderEl)).toBe("ei");
    });

    it("ChoiceGame-ветка: варианты = три артикля из el.options (без потери, перемешанные)", () => {
        const opts = grammarOptions(genderEl);
        expect(opts).toHaveLength(3);
        expect([...opts].sort()).toEqual(["ei", "en", "et"]);   // ровно артикли, верный среди них
        expect(opts).toContain(grammarAnswer(genderEl));
    });

    it("InputGame-ветка: ожидаемый ввод = target.value (норв. форма), не el.no", () => {
        expect(grammarAnswer(inputEl)).toBe("bøker");
        expect(grammarAnswer(inputEl)).not.toBe(inputEl.no);
    });

    it("прощение опечаток для ввода формы выключено (scoring.typoForgive=false)", () => {
        expect(inputEl.scoring.typoForgive).toBe(false);
    });

    it("FormPrompt: подписи формы локализованы по prompt.formLabel", () => {
        expect(FORM_LABEL.ru.gender).toBeTruthy();
        expect(FORM_LABEL.ru.indef_pl).toBeTruthy();
        expect(FORM_LABEL.en.gender).toBeTruthy();
        expect(FORM_LABEL.en.indef_pl).toBeTruthy();
        // все языки реестра несут обе подписи (страж паритета на уровне теста)
        for (const lang of Object.keys(FORM_LABEL)) {
            expect(FORM_LABEL[lang].gender, `${lang}.gender`).toBeTruthy();
            expect(FORM_LABEL[lang].indef_pl, `${lang}.indef_pl`).toBeTruthy();
        }
    });

    it("foldLight: NFC-нормализация — å совпадает независимо от формы (NFD target vs NFC ввод)", () => {
        // target.value грамм-формы может прийти РАЗЛОЖЕННЫМ (NFD: a + U+030A combining ring), а ввод
        // с экранной клавы — прекомпозированным (NFC: U+00E5 å). Без NFC они НЕ совпали бы.
        // (ø/æ канонически не разлагаются — на них NFC=no-op; здесь проверяем именно å.)
        const aRingNFC = "b\u00E5l";              // «bål» — прекомпозированная å (U+00E5)
        const aRingNFD = "ba\u030Al";             // «bål» — a + combining ring (NFD)
        expect(aRingNFC).not.toBe(aRingNFD);         // на уровне code units строки реально различны
        expect(foldLight(aRingNFD)).toBe(foldLight(aRingNFC));   // …но после foldLight совпадают
        expect(foldLight(aRingNFD)).toBe(aRingNFC);  // нормализуется к прекомпозированной форме
        // обычный ASCII не затронут (NFC — no-op), регистр/пробелы как раньше
        expect(foldLight("Hund ")).toBe("hund");
        expect(foldLight("  a  b ")).toBe("a b");
    });

    it("прогресс-бар: грамматика/формы — по зелёной шкале стадий (выбор 2, ввод 4)", () => {
        expect(stageRank("choice_gender")).toBe(2);
        expect(stageRank("input_indefpl")).toBe(4);
        expect(stageRank("form_card")).toBe(0);
        expect(stageRank("form_choose")).toBe(2);
        expect(stageRank("form_produce")).toBe(4);
        // базовая рампа не сдвинулась
        expect(stageRank("card")).toBe(0);
        expect(stageRank("choice_int2no")).toBe(1);
        expect(stageRank("input_int2no")).toBe(4);
    });
});
