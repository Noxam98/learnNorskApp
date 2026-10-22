// @vitest-environment jsdom
// Карточка слова Базы → «Изменить слово»: правка уходит по pool_id показанного омонима, карточка
// сразу показывает сохранённое (и перечитывает мету), а родитель получает onChanged — список Базы
// обновится (раньше после «Одобрено» в Базе висела старая карточка). Пункт правки — только когда
// бэк разрешает (canEdit), иначе он заведомо кончался 403. api/сторы замоканы.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

const loadData = vi.fn();
vi.mock("../../store/wordStore.jsx", () => ({
    useWordsStore: (sel) => sel({ addToLearning: vi.fn(), removeFromLearning: vi.fn(), loadData }),
}));
vi.mock("../../store/AuthStore.jsx", () => ({ useAuthStore: (sel) => sel({ user: { isAdmin: true } }) }));
vi.mock("../../store/systemStore.jsx", () => ({
    useSystemStore: Object.assign(() => {}, { getState: () => ({ showToast: vi.fn() }) }),
}));
vi.mock("./tts.js", () => ({ speakText: vi.fn(async () => {}), speakSequence: vi.fn(async () => {}) }));
vi.mock("../tools/api.js", () => ({
    default: {
        getPoolDescription: vi.fn(), getPoolSynonyms: vi.fn(), getPoolMeta: vi.fn(),
        editPoolWord: vi.fn(), generateWord: vi.fn(), adminDeletePoolWord: vi.fn(),
    },
}));

import { WordInfoModal } from "./WordInfoModal.jsx";
import api from "../tools/api.js";

const t = {
    actions: "Действия", editWord: "Изменить слово", save: "Сохранить", cancel: "Отмена", more: "Дополнительно",
    norwegianWord: "Норв.", translate: "Перевод", partOfSpeech: "Часть речи", editSaved: "Сохранено",
    russian: "Рус", ukrainian: "Укр", english: "Англ", polish: "Пол", lithuanian: "Лит", descUnavailable: "—",
};
const meta = (over = {}) => ({
    pool_id: 2, part_of_speech: "noun", translate: { no: ["mot"], ru: ["мужество"] }, topics: [], canEdit: true, ...over,
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const setup = (m) => {
    api.getPoolDescription.mockResolvedValue({ description: { ru: "описание" } });
    api.getPoolSynonyms.mockResolvedValue({ synonyms: [] });
    api.getPoolMeta.mockResolvedValue(m);
    const onChanged = vi.fn();
    render(<WordInfoModal open word="mot" poolId={2} lang="ru" t={t} onClose={() => {}} onChanged={onChanged} />);
    return onChanged;
};
const openMenu = async () => {
    await screen.findByText("мужество");                       // мета пришла — pool_id известен
    fireEvent.click(screen.getByRole("button", { name: /Действия/ }));
};

describe("WordInfoModal — правка слова", () => {
    it("сохранённая правка видна в карточке, родитель получает onChanged", async () => {
        const onChanged = setup(meta());
        await openMenu();
        fireEvent.click(await screen.findByText("Изменить слово"));
        fireEvent.change(await screen.findByDisplayValue("мужество"), { target: { value: "смелость" } });
        const saved = { approved: true, reason: "", no: "mot", part_of_speech: "noun", translate: { no: ["mot"], ru: ["смелость"] } };
        api.editPoolWord.mockResolvedValue(saved);
        api.getPoolMeta.mockResolvedValue(meta({ translate: saved.translate }));
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

        await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
        const [no, translate, , , poolId] = api.editPoolWord.mock.calls[0];
        expect([no, translate, poolId]).toEqual(["mot", { ru: ["смелость"] }, 2]);   // правим ИМЕННО этот омоним
        expect(loadData).toHaveBeenCalledWith(true);
        await waitFor(() => expect(api.getPoolMeta).toHaveBeenLastCalledWith("mot", 2, "ru"));   // мета перечитана
        expect(screen.queryByText("мужество")).toBeNull();
        expect((await screen.findAllByText("смелость")).length).toBeGreaterThan(0);
    });

    it("без права правки (canEdit=false) пункта «Изменить слово» нет", async () => {
        setup(meta({ canEdit: false }));
        await openMenu();
        expect(await screen.findByText("Переозвучить")).toBeInTheDocument();   // меню открылось (пункт с фолбэк-подписью)
        expect(screen.queryByText("Изменить слово")).toBeNull();
    });
});
