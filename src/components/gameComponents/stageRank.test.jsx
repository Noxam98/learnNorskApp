import { describe, it, expect } from "vitest";
import { stageRank } from "./gameShared.jsx";

// Fix #5: неизвестная клетка (нестандартное направление) не должна падать в серый rank 0 —
// дефолт берётся по РЕЖИМУ (первый сегмент cell).
describe("stageRank mode fallback", () => {
    it("точные ключи из RAMP_RANK не меняются", () => {
        expect(stageRank("card")).toBe(0);
        expect(stageRank("choice_int2no")).toBe(1);
        expect(stageRank("choice_no2int")).toBe(2);
        expect(stageRank("build_int2no")).toBe(3);
        expect(stageRank("input_int2no")).toBe(4);
        expect(stageRank("cloze_1")).toBe(1);
    });

    it("клетки без точного ключа берут дефолт по режиму", () => {
        expect(stageRank("cloze_int2no")).toBe(3);   // cloze → 3
        expect(stageRank("cloze_no2int")).toBe(3);
        expect(stageRank("build_no2int")).toBe(3);    // build → 3
        expect(stageRank("order_no2int")).toBe(3);    // order → 3
        expect(stageRank("cells_no2int")).toBe(4);    // cells → 4
        expect(stageRank("choice_something")).toBe(2); // choice → 2
    });

    it("пустая/неизвестная клетка → 0", () => {
        expect(stageRank(null)).toBe(0);
        expect(stageRank(undefined)).toBe(0);
        expect(stageRank("totallyunknown")).toBe(0);
    });
});
