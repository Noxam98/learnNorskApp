// @vitest-environment jsdom
// Аудит-сеть после фикса гонок сессии «Учёбы»:
//  (fix 1) busy-latch глушит onGameFinish, пока идёт добор последней карточки (loadingNext) —
//          тап по карточке в окне await не листает/не градуирует/не меняет фазу;
//  (fix 2) легаси «Ещё сессия» переигрывает СВЕЖИЕ due-слова, а не замороженный набор;
//  (fix 3) итог «до следующего уровня» пролистывает ПЕРЕВЫПОЛНЕННЫЕ уровни CEFR (как кольцо «Сегодня»).
// api/сторы/игры замоканы. Сторы-моки поддерживают И getState (хук), И селектор (вью).
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, render, act, waitFor, cleanup } from "@testing-library/react";

const take = vi.fn();
const prefetch = vi.fn().mockResolvedValue(null);      // код чейнит .then — мок обязан вернуть промис
const sysState = { soundOn: true, currentLanguage: "ru", showToast: vi.fn() };
const authState = { user: { gamePrefs: { newPerSession: 6, audio: true } } };
const sessState = { loading: false, next: null };
vi.mock("../../store/sessionStore.jsx", () => ({
    useSessionStore: Object.assign((sel) => sel(sessState), { getState: () => ({ take, prefetch }) }),
}));
vi.mock("../../store/systemStore.jsx", () => ({
    useSystemStore: Object.assign((sel) => sel(sysState), { getState: () => sysState }),
}));
vi.mock("../../store/AuthStore.jsx", () => ({
    useAuthStore: Object.assign((sel) => sel(authState), { getState: () => authState }),
}));

// Игры по-настоящему не рендерим: ChoiceGame ловит пропсы (чтобы дёрнуть onFinish), прочие — заглушки.
const choiceProps = [];
vi.mock("../gameComponents/ChoiceGame.jsx", () => ({ default: (p) => { choiceProps.push(p); return null; } }));
vi.mock("../gameComponents/InputGame.jsx", () => ({ default: () => null }));
vi.mock("../gameComponents/StudyGame.jsx", () => ({ default: () => null }));
vi.mock("../gameComponents/BuildGame.jsx", () => ({ default: () => null }));
vi.mock("../gameComponents/ClozeGame.jsx", () => ({ default: () => null }));
vi.mock("../gameComponents/OrderGame.jsx", () => ({ default: () => null }));
vi.mock("../gameComponents/CellsGame.jsx", () => ({ default: () => null }));

vi.mock("../tools/api.js", () => ({
    default: {
        learningAnswer: vi.fn(() => Promise.resolve()),
        learningStats: vi.fn(() => Promise.resolve({ due: 0, byStatus: {} })),
        learningGate: vi.fn(() => Promise.resolve({ open: false })),
        getPoolDistractors: vi.fn(() => Promise.resolve(null)),
        learningSkip: vi.fn(() => Promise.resolve({ ok: true })),
        learningReport: vi.fn(() => Promise.resolve({ ok: true })),
        learningStatus: vi.fn(() => Promise.resolve({ ok: true })),
        learningNextCards: vi.fn(() => Promise.resolve({ cards: [] })),
        learningDue: vi.fn(() => Promise.resolve({ words: [] })),
        getListenSession: vi.fn(() => Promise.resolve({ words: [], composition: {} })),
    },
}));

import { useLearningSession } from "./useLearningSession.js";
import LearningSession from "./LearningSession.jsx";
import api from "../tools/api.js";

const card = (pid) => ({ pool_id: pid, mode: "study", step: "card", direction: null, no: `w${pid}`, translate: { ru: [`п${pid}`] } });

afterEach(() => { cleanup(); vi.clearAllMocks(); choiceProps.length = 0; });

describe("useLearningSession — аудит гонок", () => {
    it("fix 1 — busy-latch: onGameFinish no-op, пока идёт добор ПОСЛЕДНЕЙ карточки (loadingNext)", async () => {
        take.mockResolvedValue({ elements: [card(1)] });                       // одна (=последняя) карточка
        let release;
        api.learningNextCards.mockReturnValue(new Promise((res) => { release = res; })); // добор зависает
        const { result } = renderHook(() => useLearningSession({ words: [], system: true, lang: "ru", newPerSession: 6, onClose: () => {} }));
        await waitFor(() => expect(result.current.phase).toBe("play"));
        // «не актуально» по последней карточке: дефицит>0 → ждём замену (промис висит) → loadingNext=true
        await act(async () => { result.current.skipCurrent(); });
        await waitFor(() => expect(result.current.loadingNext).toBe(true));
        // тап по (уже перевёрнутой) карточке в это окно НЕ должен листать / градуировать / менять фазу
        act(() => { result.current.onGameFinish({ total: 1, correct: 1 }, false, "input"); });
        expect(result.current.graduated).toBe(0);
        expect(result.current.phase).toBe("play");
        // отпускаем добор — пул пуст → сессия штатно уходит в итог
        await act(async () => { release({ cards: [] }); });
        await waitFor(() => expect(result.current.phase).toBe("summary"));
    });

    it("fix 2 — легаси «Ещё сессия» переигрывает СВЕЖИЕ due-слова, а не замороженный набор", async () => {
        api.learningDue.mockResolvedValue({ words: [{ pool_id: 42, no: "katt", translate: { ru: ["кошка"] } }] });
        const { result } = renderHook(() => useLearningSession({
            words: [{ pool_id: 1, no: "hund", translate: { ru: ["собака"] } }], system: false, lang: "ru", onClose: () => {},
        }));
        expect(result.current.legacyGw).toHaveLength(1);
        expect(result.current.legacyGw[0].id).toBe(1);
        await act(async () => { await result.current.again(); });
        expect(api.learningDue).toHaveBeenCalled();
        expect(result.current.phase).toBe("play");
        expect(result.current.legacyGw).toHaveLength(1);
        expect(result.current.legacyGw[0].id).toBe(42);                        // играем свежие due, а не старые
    });

    it("fix 3 — итог: «до следующего уровня» пролистывает перевыполненные уровни CEFR", async () => {
        // masteredAll=600 перекрывает A2(100) и B1(500); первая незакрытая цель — B2(700) → «до B2: 100».
        api.learningStats.mockResolvedValue({
            due: 0, streak: 3, currentLevel: "A1",
            byStatus: { mastered: 600 },
            byLevel: { A2: { target: 100 }, B1: { target: 500 }, B2: { target: 700 } },
        });
        // легаси-путь: стартует в play с ChoiceGame — финишируем игру, чтобы попасть в итог
        const { container } = render(
            <LearningSession words={[{ pool_id: 1, no: "hund", translate: { ru: ["собака"] } }]} lang="ru" onClose={() => {}} />
        );
        await waitFor(() => expect(choiceProps.length).toBeGreaterThan(0));
        await act(async () => { choiceProps.at(-1).onFinish({ correct: 1, total: 1 }); });
        await waitFor(() => expect(container.textContent).toContain("B2"));
        expect(container.textContent).toContain("100");                        // до B2 осталось 100 слов
        expect(container.textContent).not.toContain("A2");                     // перекрытый уровень не показываем (иначе «до A2: 0»)
    });
});
