import { describe, expect, it, vi } from "vitest";
import api from "../tools/api.js";
import { importWordsInBatches } from "./importBatches.js";

vi.mock("../tools/api.js", () => ({ default: { setImportWords: vi.fn() } }));

describe("importWordsInBatches", () => {
    it("шлёт по 20, объединяет счётчики и сообщает прогресс", async () => {
        api.setImportWords
            .mockResolvedValueOnce({
                words: [{ pool_id: 1 }],
                summary: { requested: 20, added: 18, already_in_set: 2, reused_from_pool: 15, created: 3 },
                failed: [],
            })
            .mockResolvedValueOnce({
                words: [{ pool_id: 2 }],
                summary: { requested: 20, added: 19, failed: 1, reused_from_pool: 10, created: 9 },
                failed: [{ word: "bad", translation: "", reason: "not_recognized" }],
            })
            .mockResolvedValueOnce({
                words: [{ pool_id: 3 }],
                summary: { requested: 5, added: 5, reused_from_pool: 5 },
                failed: [],
            });
        const items = Array.from({ length: 45 }, (_, i) => ({ word: `w${i}`, translation: "" }));
        const progress = vi.fn();

        const result = await importWordsInBatches({ setId: 7, items, lang: "ru", onProgress: progress });

        expect(api.setImportWords).toHaveBeenCalledTimes(3);
        expect(api.setImportWords.mock.calls.map((call) => call[1].items.length)).toEqual([20, 20, 5]);
        expect(result.summary).toMatchObject({
            requested: 45, added: 42, already_in_set: 2,
            reused_from_pool: 30, created: 12, failed: 1,
        });
        expect(result.failed).toHaveLength(1);
        expect(result.words).toEqual([{ pool_id: 3 }]);
        expect(progress.mock.calls.map(([p]) => p.done)).toEqual([0, 20, 40, 45]);
    });
});
