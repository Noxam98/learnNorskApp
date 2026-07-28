// Привести техническую ошибку API к короткому локализованному сообщению, не теряя черновик формы.
export function importErrorText(error, ll, fallback) {
    const message = String(error?.message || "");
    if (/too (large|many|long)|413/i.test(message)) return ll.importTooLarge;
    if (/429|слишком много/i.test(message)) return ll.importRate;
    if (/failed|503|provider|ocr_failed|parse_failed/i.test(message)) return ll.importProvider;
    return fallback;
}
