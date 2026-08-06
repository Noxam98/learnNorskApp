package space.learnnorsk.app;

import android.view.View;
import android.webkit.WebView;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.Bridge;
import java.util.Locale;

/**
 * Системные отступы (A10).
 *
 * <p>Android 15+ навязывает edge-to-edge всем приложениям с targetSdk 35+, а с targetSdk 36
 * отключить это уже нечем (флаг windowOptOutEdgeToEdgeEnforcement игнорируется). То есть окно
 * ВСЕГДА рисуется под статус-баром и жестовой полосой, и вопрос только в том, кто и как их
 * компенсирует.
 *
 * <p>Штатный плагин Capacitor {@code SystemBars} в этой сборке уходит в режим «passthrough»
 * (WebView 140+ и {@code viewport-fit=cover} в index.html): WebView остаётся во весь экран, а
 * реальные инсеты уезжают в CSS-переменные. Для веб-страницы это значит, что ЛЮБОЙ проскролленный
 * контент проезжает под часами и иконками батареи — паддинг сверху скроллится вместе со страницей.
 * Именно это и ловилось на экране входа с открытой клавиатурой.
 *
 * <p>Поэтому забираем раскладку инсетов себе (наш слушатель ставится после загрузки плагинов и
 * заменяет плагинный) и делаем гибрид:
 *
 * <ul>
 *   <li><b>верх и бока</b> — паддинг на контейнере WebView. Контент физически не может залезть под
 *       статус-бар/вырез, ни в каком скролле и ни на каком экране: ни существующем, ни будущем.
 *       Освободившуюся полосу красит сам контейнер (фирменный цвет, см. colors_chrome.xml);</li>
 *   <li><b>низ</b> — НЕ паддингом, а числом в {@code --safe-area-inset-bottom}: у приложения уже
 *       вся вёрстка низа (таб-бар, грипы, клавиатура игр) сделана через эту переменную, фон панелей
 *       уходит под жестовую полосу — это красиво и, в отличие от верха, ничему не мешает;</li>
 *   <li><b>клавиатура</b> — паддинг снизу на высоту IME, чтобы WebView ужимался над клавиатурой
 *       (в edge-to-edge окно само по себе больше не резайзится, adjustResize не работает).</li>
 * </ul>
 *
 * <p>Наружу (в Chromium) инсеты системных панелей отдаём нулями, иначе к нашему паддингу
 * добавится ещё и {@code env(safe-area-inset-*)} и отступ удвоится.
 */
final class SystemInsets {

    private SystemInsets() {}

    /**
     * Ставит слушатель инсетов на контейнер WebView. Вызывать ПОСЛЕ {@code super.onCreate()}:
     * к этому моменту мост создан и плагин SystemBars уже повесил свой слушатель, который мы
     * осознанно перекрываем.
     */
    static void apply(Bridge bridge) {
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null || !(webView.getParent() instanceof View)) return;

        final View host = (View) webView.getParent();
        host.setBackgroundColor(ContextCompat.getColor(host.getContext(), R.color.norsk_system_chrome));

        ViewCompat.setOnApplyWindowInsetsListener(host, (v, insets) -> {
            int bars = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets safe = insets.getInsets(bars);
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            boolean keyboard = insets.isVisible(WindowInsetsCompat.Type.ime());

            v.setPadding(safe.left, safe.top, safe.right, keyboard ? ime.bottom : 0);
            injectSafeAreaCss(bridge, keyboard ? 0 : safe.bottom);

            // Не CONSUMED: WebView должен получить событие, иначе Chromium не пересчитает свои
            // переменные. Просто обнуляем то, что уже компенсировали паддингом.
            return new WindowInsetsCompat.Builder(insets).setInsets(bars, Insets.NONE).build();
        });
        host.requestApplyInsets();
    }

    /**
     * Пишет инсеты в те же CSS-переменные, что и плагин SystemBars (см. app.css): верх/бока —
     * нули, снизу — реальная жестовая полоса в dp.
     */
    private static void injectSafeAreaCss(Bridge bridge, int bottomPx) {
        WebView webView = bridge.getWebView();
        if (webView == null) return;
        float density = webView.getResources().getDisplayMetrics().density;
        final int bottomDp = density > 0 ? (int) (bottomPx / density) : 0;

        bridge.executeOnMainThread(() -> {
            WebView view = bridge.getWebView();
            if (view == null) return;
            String script = String.format(
                Locale.US,
                "try {" +
                "  var s = document.documentElement.style;" +
                "  s.setProperty('--safe-area-inset-top', '0px');" +
                "  s.setProperty('--safe-area-inset-right', '0px');" +
                "  s.setProperty('--safe-area-inset-left', '0px');" +
                "  s.setProperty('--safe-area-inset-bottom', '%dpx');" +
                "} catch (e) {}",
                bottomDp
            );
            view.evaluateJavascript(script, null);
        });
    }
}
