// Общие примитивы статусов «Учёбы»: бейдж статуса, индикатор силы, точка-маркер.
// Используются всеми вкладками раздела. Классы — из study.css (дизайн-хендофф).
import { Icon } from "../ui/Icon.jsx";
import { langGuard } from "../../interface/i18nGuard.js";

// Статусы для ОТОБРАЖЕНИЯ (приходят в dstatus с бэка): in_progress = начато-не-выучено (бывшие
// learning+review), repeat = выученное с подошедшим сроком повтора, mastered = выученное без срока.
// learning/review оставлены алиасами на случай внутреннего статуса.
const META = {
    new:         { fill: "new",    badge: "new",    icon: "spark-dot" },
    in_progress: { fill: "learn",  badge: "learn",  icon: null },
    repeat:      { fill: "review", badge: "review", icon: "repeat" },
    mastered:    { fill: "master", badge: "master", icon: "check" },
    weak:        { fill: "weak",   badge: "weak",   icon: "alert" },
    archived:    { fill: "master", badge: "master", icon: "archive" },
    learning:    { fill: "learn",  badge: "learn",  icon: null },   // алиас → in_progress
    review:      { fill: "learn",  badge: "learn",  icon: null },   // алиас → in_progress
};

export const STATUS_ORDER = ["new", "in_progress", "repeat", "mastered", "weak", "archived"];

export const STATUS_LABELS = langGuard({
    ru:  { new: "Новое", in_progress: "В процессе", repeat: "Повторение", mastered: "Выучено", weak: "Слабое", archived: "Архив", learning: "В процессе", review: "В процессе" },
    en:  { new: "New", in_progress: "In progress", repeat: "Review", mastered: "Mastered", weak: "Weak", archived: "Archived", learning: "In progress", review: "In progress" },
    ukr: { new: "Нове", in_progress: "У процесі", repeat: "Повторення", mastered: "Вивчено", weak: "Слабке", archived: "Архів", learning: "У процесі", review: "У процесі" },
    pl:  { new: "Nowe", in_progress: "W trakcie", repeat: "Powtórka", mastered: "Opanowane", weak: "Słabe", archived: "Archiwum", learning: "W trakcie", review: "W trakcie" },
    lt:  { new: "Nauja", in_progress: "Eigoje", repeat: "Kartojimas", mastered: "Išmokta", weak: "Silpna", archived: "Archyvas", learning: "Eigoje", review: "Eigoje" },
    lv:  { new: "Jauns", in_progress: "Procesā", repeat: "Atkārtojums", mastered: "Apgūts", weak: "Vājš", archived: "Arhīvs", learning: "Procesā", review: "Procesā" },
    ar:  { new: "جديد", in_progress: "قيد التقدّم", repeat: "مراجعة", mastered: "متقَن", weak: "ضعيف", archived: "مؤرشف", learning: "قيد التقدّم", review: "قيد التقدّم" },
}, "StatusBits.STATUS_LABELS");

export function statusMeta(status) { return META[status] || META.new; }
export function statusLabel(status, lang = "ru") { return (STATUS_LABELS[lang] || STATUS_LABELS.ru)[status] || status; }

function fillFor(status, value) {
    if (status && META[status]) return META[status].fill;
    if (value >= 85) return "master";
    if (value >= 50) return "review";
    if (value >= 1) return "learn";
    return "new";
}

export function StatusBadge({ status, lang = "ru" }) {
    const m = statusMeta(status);
    return (
        <span className={"sbadge sbadge--" + m.badge}>
            {m.icon && <Icon n={m.icon} sm />} {statusLabel(status, lang)}
        </span>
    );
}

export function StrengthBar({ value = 0, status, sm = false, showVal = false }) {
    const v = Math.max(0, Math.min(100, value || 0));
    return (
        <span className={"strength" + (sm ? " strength--sm" : "")}>
            <span className="strength__track">
                <span className={"strength__fill strength__fill--" + fillFor(status, v)} style={{ width: v + "%" }} />
            </span>
            {showVal && <span className="strength__val">{v}</span>}
        </span>
    );
}

export function StatusDot({ status }) {
    return <span className={"sdot sdot--" + statusMeta(status).badge} />;
}

// Прогресс по рампе (для «в процессе»): сколько ступеней пройдено из total. Цвет — «learn».
export function RampBar({ done = 0, total = 0, sm = false }) {
    const pct = total ? Math.round((100 * done) / total) : 0;
    return (
        <span className={"strength" + (sm ? " strength--sm" : "")} title={`${done}/${total}`}>
            <span className="strength__track">
                <span className="strength__fill strength__fill--learn" style={{ width: pct + "%" }} />
            </span>
            <span className="strength__val">{done}/{total}</span>
        </span>
    );
}
