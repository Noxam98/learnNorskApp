// @vitest-environment jsdom
// Стрелка перехода между ступенями рампы: стоит над ТОЙ парой пипсов, между которыми переход,
// и смотрит в его направлении (вперёд при повышении, назад при откате). Горизонталь задаётся
// через --lo/--hi, из них CSS считает центр — проверяем именно эти индексы.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

vi.mock("../tools/sound.js", () => ({ playSound: vi.fn() }));
vi.mock("../../store/systemStore.jsx", () => ({
    useSystemStore: (sel) => sel({ currentLanguage: "ru", soundOn: false }),
}));

import { RampCheer, RampDrop } from "./gameShared.jsx";

afterEach(cleanup);

const arrowOf = (container) => container.querySelector(".rampcheer__arrow");
const idx = (el) => [el.style.getPropertyValue("--lo"), el.style.getPropertyValue("--hi")];

describe("стрелка перехода рампы", () => {
    it("повышение rank-1 → rank: дуга над этой парой точек, вперёд", () => {
        const { container } = render(<RampCheer word={{ step: "build_int2no" }} rank={3} gmode="build" />);
        const a = arrowOf(container);
        expect(a).toBeTruthy();
        expect(idx(a)).toEqual(["2", "3"]);          // между 2-й и 3-й точкой
        expect(a.className).not.toContain("is-back"); // вперёд
    });

    it("вход на первую ступень: дуга над самой первой точкой (пипса «0» нет)", () => {
        const { container } = render(<RampCheer word={{ step: "choice_int2no" }} rank={1} gmode="choice" />);
        expect(idx(arrowOf(container))).toEqual(["1", "1"]);
    });

    it("откат rank → rank-1: та же дуга, но зеркальная (назад)", () => {
        const { container } = render(<RampDrop word={{ step: "build_int2no" }} rank={3} />);
        const a = arrowOf(container);
        expect(idx(a)).toEqual(["2", "3"]);
        expect(a.className).toContain("is-back");
    });

    it("откат трека форм produce→choose: дуга охватывает прыжок 4→2", () => {
        const { container } = render(<RampDrop word={{ form_track: true, stage: "produce" }} rank={4} />);
        const a = arrowOf(container);
        expect(idx(a)).toEqual(["2", "4"]);
        expect(a.className).toContain("is-back");
    });

    it("«Слово выучено!» — пипсов и стрелки нет (свой праздничный вид)", () => {
        const { container } = render(
            <RampCheer word={{ step: "input_int2no" }} rank={4} gmode="input" firstTry />);
        expect(arrowOf(container)).toBeNull();
    });
});
