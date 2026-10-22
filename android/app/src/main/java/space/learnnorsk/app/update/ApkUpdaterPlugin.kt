package space.learnnorsk.app.update

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * Самообновление APK (схема SmartTube): скачать новую сборку и отдать системному установщику.
 * Регистрируется в MainActivity ДО `super.onCreate()`.
 *
 * Контракт с вебом (см. src/native/apkUpdate.js):
 *   - `canInstall()` → `{ allowed }` — разрешена ли нам установка APK (Android 8+: per-app
 *     «Установка неизвестных приложений»); без него установщик просто не откроется;
 *   - `openInstallSettings()` — открыть эту настройку для нашего пакета;
 *   - `downloadAndInstall({ url, sha256 })` — скачать (событие `progress` `{ percent }`),
 *     проверить и открыть установщик. Резолвится, когда установщик показан.
 *
 * Проверки перед установкой: только https; sha256 из манифеста релиза (если передан);
 * пакет в архиве — НАШ и его versionCode больше установленного. Подпись сверит сам Android:
 * обновление встаёт поверх только с тем же ключом.
 */
@CapacitorPlugin(name = "ApkUpdater")
class ApkUpdaterPlugin : Plugin() {

    @PluginMethod
    fun canInstall(call: PluginCall) {
        val allowed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else true
        call.resolve(JSObject().put("allowed", allowed))
    }

    @PluginMethod
    fun openInstallSettings(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
        call.resolve()
    }

    @PluginMethod
    fun downloadAndInstall(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank() || !url.startsWith("https://")) {
            call.reject("https url required")
            return
        }
        val expected = (call.getString("sha256") ?: "").lowercase()
        // сеть и диск — не на главном потоке; resolve/reject и события мост доставит сам
        Thread {
            try {
                val file = download(url, expected)
                verifyPackage(file)
                install(file)
                call.resolve()
            } catch (e: Exception) {
                call.reject(e.message ?: "update failed", e)
            }
        }.start()
    }

    private fun download(url: String, expected: String): File {
        val dir = File(context.cacheDir, "apk-update").apply { mkdirs() }
        dir.listFiles()?.forEach { it.delete() }   // прошлые попытки не копим
        val out = File(dir, "learnnorsk.apk")
        // GitHub отдаёт ассет релиза редиректом на свой CDN (https → https) — по умолчанию следуем
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 20_000
        conn.readTimeout = 30_000
        conn.instanceFollowRedirects = true
        try {
            if (conn.responseCode != HttpURLConnection.HTTP_OK) throw IOException("HTTP ${conn.responseCode}")
            val total = conn.contentLengthLong
            val digest = MessageDigest.getInstance("SHA-256")
            conn.inputStream.use { input ->
                out.outputStream().use { output ->
                    val buf = ByteArray(64 * 1024)
                    var done = 0L
                    var lastPct = -1
                    while (true) {
                        val n = input.read(buf)
                        if (n < 0) break
                        output.write(buf, 0, n)
                        digest.update(buf, 0, n)
                        done += n
                        if (total > 0) {
                            val pct = (done * 100 / total).toInt()
                            if (pct != lastPct) {
                                lastPct = pct
                                notifyListeners("progress", JSObject().put("percent", pct))
                            }
                        }
                    }
                }
            }
            if (expected.isNotEmpty()) {
                val got = digest.digest().joinToString("") { "%02x".format(it) }
                if (got != expected) {
                    out.delete()
                    throw SecurityException("checksum mismatch")
                }
            }
        } finally {
            conn.disconnect()
        }
        return out
    }

    private fun verifyPackage(file: File) {
        val pm = context.packageManager
        val archive = pm.getPackageArchiveInfo(file.path, 0) ?: throw IOException("not an apk")
        if (archive.packageName != context.packageName) throw SecurityException("foreign package")
        val installed = pm.getPackageInfo(context.packageName, 0)
        if (PackageInfoCompat.getLongVersionCode(archive) <= PackageInfoCompat.getLongVersionCode(installed)) {
            throw IllegalStateException("not newer")
        }
    }

    private fun install(file: File) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        context.startActivity(intent)
    }
}
