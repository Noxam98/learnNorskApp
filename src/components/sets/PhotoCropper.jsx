import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";

const FULL = { x: 0, y: 0, w: 1, h: 1 };
const clamp = (n) => Math.max(0, Math.min(1, n));

export default function PhotoCropper({ src, ll, busy, onCancel, onApply }) {
    const stageRef = useRef(null);
    const imageRef = useRef(null);
    const dragRef = useRef(null);
    const [crop, setCrop] = useState(FULL);
    const [metrics, setMetrics] = useState(null);

    const measure = () => {
        const stage = stageRef.current?.getBoundingClientRect();
        const image = imageRef.current?.getBoundingClientRect();
        if (!stage || !image || !image.width || !image.height) return;
        setMetrics({
            left: image.left - stage.left, top: image.top - stage.top,
            width: image.width, height: image.height,
        });
    };
    useEffect(() => {
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);
    const point = (e) => metrics ? {
        x: clamp((e.clientX - stageRef.current.getBoundingClientRect().left - metrics.left) / metrics.width),
        y: clamp((e.clientY - stageRef.current.getBoundingClientRect().top - metrics.top) / metrics.height),
    } : null;
    const start = (e) => {
        const p = point(e);
        if (!p || busy) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = p;
        setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
    };
    const move = (e) => {
        if (!dragRef.current) return;
        const p = point(e);
        if (!p) return;
        const a = dragRef.current;
        setCrop({
            x: Math.min(a.x, p.x), y: Math.min(a.y, p.y),
            w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y),
        });
    };
    const finish = () => {
        dragRef.current = null;
        setCrop((value) => value.w < .02 || value.h < .02 ? FULL : value);
    };
    const overlay = metrics ? {
        left: metrics.left + crop.x * metrics.width,
        top: metrics.top + crop.y * metrics.height,
        width: crop.w * metrics.width,
        height: crop.h * metrics.height,
    } : undefined;

    return (
        <>
            <div className="muted" style={{ marginBottom: "var(--sp-2)", fontSize: "var(--fs-13)" }}>{ll.cropHint}</div>
            <div className="crop-stage" ref={stageRef}
                onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
                <img ref={imageRef} src={src} alt="" onLoad={measure} draggable={false} />
                {overlay && <div className="crop-selection" style={overlay} />}
            </div>
            <div className="import-actions">
                <button className="btn btn--ghost" disabled={busy} onClick={onCancel}>{ll.cancel}</button>
                <button className="btn btn--ghost" disabled={busy} onClick={() => setCrop(FULL)}>
                    <Icon n="repeat" sm /> {ll.cropReset}
                </button>
                <button className="btn btn--accent" disabled={busy} onClick={() => onApply(crop)}>
                    {busy ? <BtnSpinner /> : <Icon n="crop" sm />} {busy ? ll.cropApplying : ll.cropApply}
                </button>
            </div>
        </>
    );
}
