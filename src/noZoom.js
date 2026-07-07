// Полностью блокируем масштабирование приложения — ведём себя как нативное.
// Viewport (user-scalable=no, maximum-scale=1) закрывает Android и большинство браузеров;
// двойной тап-зум гасит CSS (touch-action: manipulation в tokens.css). Здесь добираем остальное:
//   • iOS Safari игнорирует user-scalable → ловим pinch-жесты (gesture*) и гасим;
//   • pinch на прочих тач-браузерах → touchmove с ≥2 касаниями;
//   • десктоп: масштаб браузера через Ctrl/⌘ + колесо и Ctrl/⌘ + (+ / - / = / 0).
// Двойной тап через JS НЕ трогаем — иначе проглатывались бы быстрые тапы по кнопкам (CSS достаточно).
const stop = (e) => e.preventDefault();

// iOS Safari: pinch-жесты (только там есть gesture*-события)
for (const ev of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(ev, stop, { passive: false });
}

// pinch на прочих тач-браузерах: два и более одновременных касания
document.addEventListener("touchmove", (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Десктоп: масштаб колесом с Ctrl/⌘
window.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
}, { passive: false });

// Десктоп: масштаб с клавиатуры Ctrl/⌘ + (+ - = 0)
window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault();
}, { passive: false });
