package space.learnnorsk.app.addword

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import space.learnnorsk.app.MainActivity
import space.learnnorsk.app.R
import java.util.concurrent.Executors

/**
 * Шит «добавить выделенное слово», цель `ACTION_PROCESS_TEXT`.
 *
 * Открывается поверх чужого приложения (Chrome, читалка), поэтому:
 *  - никакого WebView — только нативные вьюхи, шит виден сразу;
 *  - сеть исключительно на фоновом пуле, main-thread не блокируется вообще;
 *  - `finish()` возвращает пользователя ровно туда, откуда он пришёл.
 *
 * Тонкость, ради которой всё написано: выделяют СКЛОНЁННУЮ форму («gikk»), а `/sets/{id}/words`
 * принимает только лемму («gå»). Разрешение делает `/pool/search` + [WordResolver] — см. там,
 * почему нельзя брать первый результат.
 */
class AddWordActivity : Activity() {

    private companion object {
        const val TAG = "NorskAddWord"
    }

    private val io = Executors.newFixedThreadPool(2)
    private val ui = Handler(Looper.getMainLooper())
    private val api by lazy { NorskApi(applicationContext) }

    private lateinit var selectionView: TextView
    private lateinit var wordView: TextView
    private lateinit var translationView: TextView
    private lateinit var alternativesView: TextView
    private lateinit var setsView: Spinner
    private lateinit var statusView: TextView
    private lateinit var primaryButton: Button
    private lateinit var cancelButton: Button

    /** Нормализованный выделенный текст — то, что мы ищем. */
    private var query = ""
    private var candidates: List<SearchItem> = emptyList()
    private var chosen: SearchItem? = null
    private var sets: List<SetInfo> = emptyList()
    /** true, если поиск не доехал: добавляем «вслепую» через очередь. */
    private var searchOffline = false
    private var busy = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        query = WordResolver.normalize(extractText(intent))
        if (query.isEmpty()) {
            finish()
            return
        }

        setContentView(R.layout.activity_add_word)
        bindViews()

        // Нет токена — предлагаем войти, дальше не идём (запросы всё равно вернут 401).
        if (TokenStore.access(applicationContext) == null) {
            showLoginRequired()
            return
        }

        // Спиннер заполняем из кеша СРАЗУ: шит должен быть рабочим до первого ответа сети.
        sets = AddWordPrefs.cachedSets(applicationContext)
        renderSets(sets)
        setStatus(getString(R.string.norsk_searching), error = false)
        primaryButton.isEnabled = sets.isNotEmpty()

        io.execute { loadSets() }
        io.execute { lookup() }
    }

    override fun onDestroy() {
        io.shutdownNow()
        super.onDestroy()
    }

    // ---- Разметка ---------------------------------------------------------------------

    private fun bindViews() {
        selectionView = findViewById(R.id.norsk_selection)
        wordView = findViewById(R.id.norsk_word)
        translationView = findViewById(R.id.norsk_translation)
        alternativesView = findViewById(R.id.norsk_alternatives)
        setsView = findViewById(R.id.norsk_sets)
        statusView = findViewById(R.id.norsk_status)
        primaryButton = findViewById(R.id.norsk_primary)
        cancelButton = findViewById(R.id.norsk_cancel)

        selectionView.text = query
        wordView.text = query
        translationView.text = ""

        // Тап по затемнению = закрыть, как у настоящего bottom-sheet. Сам шит клики съедает.
        findViewById<View>(R.id.norsk_scrim).setOnClickListener { finish() }
        cancelButton.setOnClickListener { finish() }
        alternativesView.setOnClickListener { showCandidatePicker() }
        primaryButton.setOnClickListener { onPrimary() }

        // Жестовая навигация: без этого кнопка уезжает под системную полосу.
        val sheet = findViewById<View>(R.id.norsk_sheet)
        val basePadding = sheet.paddingBottom
        ViewCompat.setOnApplyWindowInsetsListener(sheet) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            v.setPadding(v.paddingLeft, v.paddingTop, v.paddingRight, basePadding + bars.bottom)
            insets
        }
    }

    private fun showLoginRequired() {
        setStatus(getString(R.string.norsk_need_login), error = false)
        setsView.visibility = View.GONE
        alternativesView.visibility = View.GONE
        primaryButton.text = getString(R.string.norsk_open_app)
        primaryButton.isEnabled = true
        primaryButton.setOnClickListener {
            startActivity(
                Intent(this, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            )
            finish()
        }
    }

    private fun renderSets(list: List<SetInfo>) {
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, list.map { it.name })
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        setsView.adapter = adapter
        val last = AddWordPrefs.lastSetId(applicationContext)
        val idx = list.indexOfFirst { it.id == last }
        if (idx >= 0) setsView.setSelection(idx)
    }

    private fun selectedSet(): SetInfo? = sets.getOrNull(setsView.selectedItemPosition)

    private fun setStatus(text: String?, error: Boolean) {
        if (text.isNullOrEmpty()) {
            statusView.visibility = View.GONE
            return
        }
        statusView.visibility = View.VISIBLE
        statusView.text = text
        statusView.setTextColor(
            resources.getColor(if (error) R.color.norsk_error else R.color.norsk_text_muted, theme)
        )
    }

    // ---- Загрузка ---------------------------------------------------------------------

    private fun loadSets() {
        val loaded = try {
            api.sets()
        } catch (e: Exception) {
            Log.w(TAG, "sets failed: ${e.message}")
            return                                   // остаёмся на кеше, добавление всё равно возможно
        }
        AddWordPrefs.cacheSets(applicationContext, loaded)
        ui.post {
            if (isFinishing || loaded.isEmpty()) {
                if (loaded.isEmpty() && sets.isEmpty()) {
                    setStatus(getString(R.string.norsk_no_sets), error = true)
                    primaryButton.isEnabled = false
                }
                return@post
            }
            val keepId = selectedSet()?.id ?: AddWordPrefs.lastSetId(applicationContext)
            sets = loaded
            renderSets(loaded)
            loaded.indexOfFirst { it.id == keepId }.takeIf { it >= 0 }?.let { setsView.setSelection(it) }
            if (!busy) primaryButton.isEnabled = true
        }
    }

    private fun lookup() {
        val results = try {
            api.search(query)
        } catch (e: OfflineException) {
            ui.post { onSearchOffline() }
            return
        } catch (e: Exception) {
            Log.w(TAG, "search failed: ${e.message}")
            ui.post { onSearchOffline() }
            return
        }
        val ranked = WordResolver.rank(query, results)
        ui.post { onSearchDone(ranked) }
    }

    private fun onSearchOffline() {
        if (isFinishing) return
        searchOffline = true
        setStatus(getString(R.string.norsk_offline_hint), error = false)
        primaryButton.isEnabled = sets.isNotEmpty()
    }

    private fun onSearchDone(ranked: List<SearchItem>) {
        if (isFinishing) return
        candidates = ranked
        val best = ranked.firstOrNull()
        if (best == null) {
            // Бэкенд не знает слова вообще: ни пул, ни ordbank, ни лексикон. Генерация — шанс.
            setStatus(getString(R.string.norsk_not_found), error = true)
            primaryButton.text = getString(R.string.norsk_generate)
            primaryButton.isEnabled = sets.isNotEmpty()
            return
        }
        applyChoice(best)
        alternativesView.visibility = if (ranked.size > 1) View.VISIBLE else View.GONE
    }

    private fun applyChoice(item: SearchItem) {
        chosen = item
        wordView.text = item.word
        // Показываем исходное выделение только если оно отличается от леммы — иначе шум.
        selectionView.visibility = if (item.word.equals(query, true)) View.GONE else View.VISIBLE
        translationView.text = describe(item)
        if (item.inPool) {
            setStatus(null, error = false)
            primaryButton.text = getString(R.string.norsk_add)
        } else {
            setStatus(getString(R.string.norsk_not_in_pool), error = false)
            primaryButton.text = getString(R.string.norsk_generate)
        }
        primaryButton.isEnabled = sets.isNotEmpty() && !busy
    }

    /** «идти, ходить · verb» — перевод на языке устройства плюс часть речи. */
    private fun describe(item: SearchItem): String {
        val lang = AddWordPrefs.translationLangs().firstOrNull { !item.translate[it].isNullOrEmpty() }
        val words = lang?.let { item.translate[it] }?.take(3)?.joinToString(", ").orEmpty()
        val pos = item.partOfSpeech
        return listOf(words, pos).filter { it.isNotBlank() }.joinToString(" · ")
    }

    private fun showCandidatePicker() {
        val labels = candidates.map { item ->
            val hint = describe(item)
            if (hint.isBlank()) item.word else "${item.word} — $hint"
        }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle(R.string.norsk_choose_word)
            .setItems(labels) { _, which -> candidates.getOrNull(which)?.let { applyChoice(it) } }
            .show()
    }

    // ---- Действие ---------------------------------------------------------------------

    private fun onPrimary() {
        val set = selectedSet() ?: return
        val item = chosen
        when {
            // Сети не было — кладём в очередь сырой текст, лемму выясним при синке.
            searchOffline && item == null -> queueAndFinish(null, set)
            item == null -> generateThenAdd(query, set)          // поиск ничего не нашёл
            item.inPool -> addLemma(item.word, set)
            else -> generateThenAdd(item.word, set)              // известно банку, но не пулу
        }
    }

    private fun setBusy(text: String) {
        busy = true
        primaryButton.isEnabled = false
        setStatus(text, error = false)
    }

    private fun clearBusy() {
        busy = false
        primaryButton.isEnabled = sets.isNotEmpty()
    }

    private fun addLemma(lemma: String, set: SetInfo) {
        setBusy(getString(R.string.norsk_adding))
        io.execute {
            try {
                api.addWordByLemma(set.id, lemma)
                ui.post { doneAndFinish(lemma, set) }
            } catch (e: OfflineException) {
                ui.post { queueAndFinish(lemma, set) }
            } catch (e: ApiException) {
                Log.w(TAG, "add failed: ${e.status} ${e.detail}")
                ui.post { fail(getString(R.string.norsk_failed)) }
            } catch (e: Exception) {
                ui.post { queueAndFinish(lemma, set) }
            }
        }
    }

    /**
     * Слова нет в пуле: сначала `/pool/generate` (он отдаёт `pool_id`, в отличие от поиска),
     * затем добавление по id. Ретраев нет — генерация под LLM-rate-limit, 429 штатен.
     */
    private fun generateThenAdd(word: String, set: SetInfo) {
        setBusy(getString(R.string.norsk_generating))
        io.execute {
            val generated = try {
                api.generate(word)
            } catch (e: OfflineException) {
                ui.post { queueAndFinish(null, set) }
                return@execute
            } catch (e: ApiException) {
                Log.w(TAG, "generate failed: ${e.status} ${e.detail}")
                val msg = if (e.status == 429) R.string.norsk_rate_limited else R.string.norsk_generate_failed
                ui.post { fail(getString(msg)) }
                return@execute
            } catch (e: Exception) {
                ui.post { fail(getString(R.string.norsk_generate_failed)) }
                return@execute
            }
            try {
                if (generated.poolId > 0) api.addWordById(set.id, generated.poolId)
                else api.addWordByLemma(set.id, generated.word)
                ui.post { doneAndFinish(generated.word, set) }
            } catch (e: OfflineException) {
                ui.post { queueAndFinish(generated.word, set) }
            } catch (e: Exception) {
                Log.w(TAG, "add after generate failed: ${e.message}")
                ui.post { fail(getString(R.string.norsk_failed)) }
            }
        }
    }

    private fun queueAndFinish(lemma: String?, set: SetInfo) {
        PendingQueue.add(
            applicationContext,
            PendingWord(text = query, lemma = lemma, setId = set.id, setName = set.name)
        )
        AddWordPrefs.setLastSetId(applicationContext, set.id)
        toast(getString(R.string.norsk_queued, lemma ?: query))
        finish()
    }

    private fun doneAndFinish(lemma: String, set: SetInfo) {
        AddWordPrefs.setLastSetId(applicationContext, set.id)
        toast(getString(R.string.norsk_added, lemma, set.name))
        finish()
    }

    private fun fail(message: String) {
        if (isFinishing) return
        clearBusy()
        setStatus(message, error = true)
    }

    private fun toast(text: String) {
        Toast.makeText(applicationContext, text, Toast.LENGTH_SHORT).show()
    }

    // ---- Вход -------------------------------------------------------------------------

    /** `EXTRA_PROCESS_TEXT` + запасные варианты, которыми пользуются нестандартные тулбары. */
    private fun extractText(intent: Intent?): String? {
        if (intent == null) return null
        return intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()
            ?: intent.getStringExtra(Intent.EXTRA_TEXT)
            ?: intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT_READONLY)?.toString()
    }
}
