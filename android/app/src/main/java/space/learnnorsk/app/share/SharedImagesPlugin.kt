package space.learnnorsk.app.share

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray

/**
 * Мост «расшаренная картинка → JS» (A4). Регистрируется в MainActivity ДО `super.onCreate()`.
 *
 * Контракт с вебом (см. src/native/sharedImages.js):
 *   - `consume()` → `{ images: string[] }` — забрать накопленные data-URL и очистить очередь;
 *   - событие `sharedImages` (без данных) — «в очереди что-то появилось, забери».
 *
 * Событие шлём с `retainUntilConsumed = true`: приложение могло быть закрыто в момент шаринга,
 * и картинка будет готова раньше, чем WebView успеет поднять JS и подписаться. Retain-событие
 * дождётся подписчика; данные при этом всё равно едут не в событии, а через `consume()` —
 * очередь атомарна, поэтому «событие + стартовый consume» не могут задвоить картинки.
 */
@CapacitorPlugin(name = "SharedImages")
class SharedImagesPlugin : Plugin() {

    override fun load() {
        instance = this
    }

    override fun handleOnDestroy() {
        if (instance === this) instance = null
        super.handleOnDestroy()
    }

    @PluginMethod
    fun consume(call: PluginCall) {
        val ret = JSObject()
        ret.put("images", JSONArray(SharedImages.drain()))
        call.resolve(ret)
    }

    /** Пнуть веб: в очереди появились картинки. */
    fun emitPending() {
        notifyListeners("sharedImages", JSObject(), true)
    }

    companion object {
        @Volatile
        private var instance: SharedImagesPlugin? = null

        @JvmStatic
        fun notifyPending() {
            val plugin = instance
            if (plugin == null) Log.w("NorskShare", "плагин не готов — картинки ждут в очереди")
            plugin?.emitPending()
        }
    }
}
