import { useState } from "react";
import { useSystemStore } from "../store/systemStore.jsx";
import { useAuthStore } from "../store/AuthStore.jsx";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { WordInfoModal } from "../components/ui/WordInfoModal.jsx";
import { posMeta, posLabel, POS_INFO, POS_ORDER, posApiKey } from "../components/ui/pos.js";
import { PoolBrowser } from "../components/pool/PoolBrowser.jsx";
import { usePoolSearch } from "./usePoolSearch.js";

// «База»: поиск/фильтры/пагинация пула + AI-добор. Логика — в usePoolSearch, разметка экрана —
// в PoolBrowser (он же переиспользуется в доборе слов в набор, см. SetPoolPicker).
export const PoolPage = () => {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const isAdmin = useAuthStore((s) => s.user?.isAdmin);
    const [posRefOpen, setPosRefOpen] = useState(false); // справочник частей речи
    const [descWord, setDescWord] = useState(null);      // слово, чьё описание открыто

    const pool = usePoolSearch(currentLanguage, t);

    return (
        <main className="shell words-main">
            <div className="page-head" style={{ marginBottom: "var(--sp-4)" }}>
                <div>
                    <p className="muted" style={{ margin: 0 }}>{t.poolDesc}</p>
                </div>
            </div>

            <PoolBrowser pool={pool} lang={currentLanguage} t={t} isAdmin={isAdmin}
                onCardClick={(w) => setDescWord(w)} />

            <Modal open={posRefOpen} onClose={() => setPosRefOpen(false)} title="Части речи — справочник" maxWidth={560}>
                {POS_ORDER.map((key) => {
                    const info = POS_INFO[key];
                    return (
                        <div key={key} style={{ fontSize: "var(--fs-13)", padding: "8px 0", borderBottom: "1px solid var(--surface-3)" }}>
                            <span className="row" style={{ gap: "var(--sp-2)", alignItems: "center" }}>
                                <b>{info.name}</b>
                                <span className={`chip pos ${posMeta(posApiKey(key)).cls}`} style={{ fontSize: "var(--fs-11)" }}>{posLabel(posApiKey(key), t)}</span>
                            </span>
                            <div className="muted" style={{ marginTop: 2 }}>{info.desc}{info.ex && <> · напр.: {info.ex}</>}</div>
                        </div>
                    );
                })}
            </Modal>

            <WordInfoModal open={!!descWord} word={descWord?.word} poolId={descWord?.pool_id}
                lang={currentLanguage} t={t} onClose={() => setDescWord(null)} />
        </main>
    );
};

export default PoolPage;
