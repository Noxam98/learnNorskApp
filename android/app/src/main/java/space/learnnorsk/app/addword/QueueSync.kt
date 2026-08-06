package space.learnnorsk.app.addword

import android.content.Context
import android.util.Log
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Досыл очереди отложенных слов. Дёргается из MainActivity при открытии приложения —
 * это единственный момент, когда мы точно знаем, что юзер онлайн-ish и токены свежие.
 *
 * Никаких WorkManager/JobScheduler: фича «слово попадёт в набор к следующему открытию»
 * не стоит фонового процесса и разрешения на пробуждение.
 */
object QueueSync {
    private const val TAG = "NorskQueue"
    private val running = AtomicBoolean(false)
    private val pool = Executors.newSingleThreadExecutor()

    /** Неблокирующий запуск. Повторные вызовы, пока идёт синк, игнорируются. */
    fun syncAsync(ctx: Context) {
        val app = ctx.applicationContext
        if (PendingQueue.size(app) == 0) return
        if (!running.compareAndSet(false, true)) return
        pool.execute {
            try {
                flush(app)
            } catch (e: Throwable) {
                Log.w(TAG, "sync crashed: ${e.message}")
            } finally {
                running.set(false)
            }
        }
    }

    /** Блокирующий проход по очереди. Возвращает, сколько слов реально доехало в наборы. */
    fun flush(ctx: Context): Int {
        val items = PendingQueue.read(ctx)
        if (items.isEmpty()) return 0
        if (TokenStore.access(ctx) == null) return 0   // разлогинились — очередь ждёт входа

        val api = NorskApi(ctx)
        val left = mutableListOf<PendingWord>()
        var done = 0
        for (i in items.indices) {
            val item = items[i]
            when (send(api, item)) {
                Outcome.DONE -> done++
                Outcome.DEAD -> Log.i(TAG, "dropping '${item.text}': unresolvable")
                Outcome.RETRY -> {
                    val next = item.copy(attempts = item.attempts + 1)
                    if (next.attempts >= PendingQueue.MAX_ATTEMPTS) {
                        Log.i(TAG, "dropping '${item.text}': ${next.attempts} failed attempts")
                    } else {
                        left.add(next)
                    }
                }
                // Сеть отвалилась посреди прохода — остаток очереди не трогаем, дожмём в следующий раз.
                Outcome.ABORT -> {
                    left.addAll(items.subList(i, items.size))
                    PendingQueue.replaceAll(ctx, left)
                    return done
                }
            }
        }
        PendingQueue.replaceAll(ctx, left)
        return done
    }

    private enum class Outcome { DONE, RETRY, DEAD, ABORT }

    private fun send(api: NorskApi, item: PendingWord): Outcome = try {
        // Лемму могли не успеть выяснить в офлайне — разрешаем сейчас.
        val lemma = item.lemma ?: run {
            val q = WordResolver.normalize(item.text)
            val best = WordResolver.best(q, api.search(q))
            // Не в пуле = нужен /pool/generate, а он под LLM-квотой. Молча жечь чужую квоту
            // в фоне мы не будем: такие слова юзер догенерит руками из приложения.
            if (best != null && best.inPool) best.word else null
        }
        if (lemma == null) Outcome.DEAD
        else {
            api.addWordByLemma(item.setId, lemma)
            Outcome.DONE
        }
    } catch (e: OfflineException) {
        Outcome.ABORT
    } catch (e: ApiException) {
        when {
            e.status == 429 || e.status >= 500 -> Outcome.RETRY
            e.status == 401 -> Outcome.ABORT     // рефреш уже не помог — ждём входа в приложении
            else -> Outcome.DEAD                 // 400 «No words», 404 удалённый набор
        }
    } catch (e: Exception) {
        Outcome.RETRY
    }
}
