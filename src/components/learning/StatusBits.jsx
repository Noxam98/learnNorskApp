// Общие примитивы статусов «Учёбы»: бейдж статуса, индикатор силы, точка-маркер.
// Используются всеми вкладками раздела. Классы — из study.css (дизайн-хендофф).
import { Icon } from "../ui/Icon.jsx";

const META = {
    new:      { fill: "new",    badge: "new",    icon: "spark-dot" },
    learning: { fill: "learn",  badge: "learn",  icon: "book" },
    review:   { fill: "review", badge: "review", icon: "repeat" },
    mastered: { fill: "master", badge: "master", icon: "check" },
    weak:     { fill: "weak",   badge: "weak",   icon: "alert" },
    archived: { fill: "master", badge: "master", icon: "archive" },
};

export const STATUS_ORDER = ["new", "learning", "review", "mastered", "weak", "archived"];

export const STATUS_LABELS = {
    ru:  { new: "Новое", learning: "Учу", review: "Повторение", mastered: "Выучено", weak: "Слабое", archived: "Архив" },
    en:  { new: "New", learning: "Learning", review: "Review", mastered: "Mastered", weak: "Weak", archived: "Archived" },
    ukr: { new: "Нове", learning: "Вчу", review: "Повторення", mastered: "Вивчено", weak: "Слабке", archived: "Архів" },
    pl:  { new: "Nowe", learning: "Uczę się", review: "Powtórka", mastered: "Opanowane", weak: "Słabe", archived: "Archiwum" },
    lt:  { new: "Nauja", learning: "Mokausi", review: "Kartojimas", mastered: "Išmokta", weak: "Silpna", archived: "Archyvas" },
};

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
            <Icon n={m.icon} sm /> {statusLabel(status, lang)}
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
