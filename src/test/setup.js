// Глобальный setup для vitest: расширяет expect матчерами jest-dom
// (toBeInTheDocument, toBeDisabled, …). В node-окружении просто регистрирует
// матчеры (DOM не трогает на импорте) — безопасно для не-render тестов.
import "@testing-library/jest-dom/vitest";
