// @vitest-environment jsdom
// Сеть под вынос AskWordModal из WordInfoModal: вопрос уходит в api.askWord(no, q, lang),
// ответ показывается. LLM/сеть замоканы.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import AskWordModal from "./AskWordModal.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({ default: { askWord: vi.fn() } }));

const t = {
    askWord: "Спросить о слове", cancel: "Отмена", asking: "Спрашиваю…", askSend: "Отправить",
    askPlaceholder: "Вопрос?", descUnavailable: "—", unexpectedError: "Ошибка",
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("AskWordModal", () => {
    it("при open=false ничего не рендерит", () => {
        const { container } = render(<AskWordModal open={false} no="hund" lang="ru" t={t} onClose={() => {}} />);
        expect(container).toBeEmptyDOMElement();
    });

    // poolId прокидывается ОБЯЗАТЕЛЬНО: без него бэк берёт старшего омонима и отвечает про
    // другое значение слова (карточка сущ. `mot` → ответ про предлог `mot`).
    it("задаёт вопрос и показывает ответ нейросети (с pool_id омонима)", async () => {
        api.askWord.mockResolvedValue({ answer: "Это домашнее животное." });
        render(<AskWordModal open no="hund" poolId={42} lang="ru" t={t} onClose={() => {}} />);
        fireEvent.change(screen.getByPlaceholderText("Вопрос?"), { target: { value: "Что это?" } });
        fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
        await waitFor(() => expect(api.askWord).toHaveBeenCalledWith("hund", "Что это?", "ru", 42));
        expect(await screen.findByText("Это домашнее животное.")).toBeInTheDocument();
    });
});
