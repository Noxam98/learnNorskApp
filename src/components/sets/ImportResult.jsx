import { Icon } from "../ui/Icon.jsx";

export default function ImportResult({ result, ll, onRetry, onMore, onDone }) {
    const s = result?.summary || {};
    const failed = result?.failed || [];
    const rows = [
        [ll.importAdded, s.added || 0],
        [ll.importAlready, s.already_in_set || 0],
        [ll.importReused, s.reused_from_pool || 0],
        [ll.importCreated, s.created || 0],
        [ll.importSkipped, s.skipped || 0],
    ];
    const partial = failed.length > 0 || (s.skipped || 0) > 0;
    return (
        <div className="import-result">
            <div className={"import-result__icon" + (partial ? " is-partial" : "")}>
                <Icon n={partial ? "alert" : "check"} lg />
            </div>
            <b className="import-result__title">{partial ? ll.importPartial : ll.importComplete}</b>
            <div className="import-result__stats">
                {rows.map(([label, value]) => (
                    <div key={label}><span>{label}</span><b>{value}</b></div>
                ))}
            </div>
            {!!failed.length && (
                <div className="import-failed">
                    <b>{ll.importFailedCount.replace("{n}", String(failed.length))}</b>
                    <div>{failed.map((item) => item.word).filter(Boolean).join(", ")}</div>
                </div>
            )}
            <div className="import-actions">
                {failed.length > 0 && <button className="btn btn--ghost" onClick={onRetry}>
                    <Icon n="repeat" sm /> {ll.importRetry}
                </button>}
                <button className="btn btn--ghost" onClick={onMore}>
                    <Icon n="plus" sm /> {ll.importMore}
                </button>
                <button className="btn btn--accent" onClick={onDone}>
                    <Icon n="check" sm /> {ll.importDone}
                </button>
            </div>
        </div>
    );
}
