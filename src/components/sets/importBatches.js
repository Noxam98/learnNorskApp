import api from "../tools/api.js";

export const IMPORT_BATCH_SIZE = 20;

const emptySummary = () => ({
    requested: 0,
    added: 0,
    already_in_set: 0,
    reused_from_pool: 0,
    created: 0,
    skipped: 0,
    failed: 0,
});

// Разбиваем большой импорт на реальные серверные пачки: UI получает прогресс после каждой,
// а результат остаётся совместимым с одиночным /import-words.
export async function importWordsInBatches({ setId, items, lang, onProgress }) {
    const summary = emptySummary();
    const failed = [];
    let words = [];
    onProgress?.({ done: 0, total: items.length });
    for (let offset = 0; offset < items.length; offset += IMPORT_BATCH_SIZE) {
        const chunk = items.slice(offset, offset + IMPORT_BATCH_SIZE);
        const result = await api.setImportWords(setId, { items: chunk, lang });
        const part = result?.summary || {};
        for (const key of Object.keys(summary)) summary[key] += Number(part[key] || 0);
        failed.push(...(result?.failed || []));
        if (Array.isArray(result?.words)) words = result.words;
        onProgress?.({ done: Math.min(offset + chunk.length, items.length), total: items.length });
    }
    return { words, added: summary.added, summary, failed };
}
