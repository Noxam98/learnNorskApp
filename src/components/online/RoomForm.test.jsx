// @vitest-environment jsdom
// Smoke-сеть под вынос RoomForm из OnlinePage: модалка рендерится, закрывается по open=false,
// и кнопка подтверждения отдаёт введённое имя + дефолтные настройки наружу (onConfirm).
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { RoomForm } from "./RoomForm.jsx";

afterEach(cleanup);

// Минимальные словари: RoomForm всюду подставляет дефолты через `|| "…"`, тема — t.topics.
const t = { cancel: "Отмена", topics: {} };
const to = {};

function renderForm(props = {}) {
    return render(
        <RoomForm open onClose={() => {}} theme="dark" t={t} to={to}
            title="Создать комнату" confirmLabel="Создать" onConfirm={() => {}} {...props} />,
    );
}

describe("RoomForm", () => {
    it("при open=false ничего не рендерит", () => {
        const { container } = render(
            <RoomForm open={false} onClose={() => {}} theme="dark" t={t} to={to} onConfirm={() => {}} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("рендерит диалог с заголовком и кнопкой подтверждения", () => {
        renderForm();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Создать комнату")).toBeInTheDocument();
        expect(screen.getByText("Создать")).toBeEnabled();   // source=pool по умолчанию → форма валидна
    });

    it("onConfirm получает введённое имя и дефолтные настройки (game=quiz)", () => {
        const onConfirm = vi.fn();
        renderForm({ onConfirm, initialName: "Моя комната" });
        fireEvent.click(screen.getByText("Создать"));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        const [name, settings] = onConfirm.mock.calls[0];
        expect(name).toBe("Моя комната");
        expect(settings.game).toBe("quiz");
        expect(settings.count).toBe(7);
    });

    it("крестик/Отмена вызывают onClose", () => {
        const onClose = vi.fn();
        renderForm({ onClose });
        fireEvent.click(screen.getByText("Отмена"));
        expect(onClose).toHaveBeenCalled();
    });
});
