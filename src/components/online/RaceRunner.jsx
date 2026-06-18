/* Бегущий зверь для «Гонки слов» — силуэт с покадровой анимацией бега.
   Смотрит вправо, viewBox 0 0 96 54. Общий каркас тела/ног, своя голова/морда/хвост.
   Порт дизайн-макета (race-lanes.jsx) под ES-модули. */

export const ANIMAL_LIST = ["fox", "hare", "reindeer", "wolf", "elk", "lynx"];
export const ANIMAL_EMOJI = { fox: "🦊", hare: "🐇", reindeer: "🦌", wolf: "🐺", elk: "🫎", lynx: "🐆" };
// фирменный цвет каждого зверя (для аватара и силуэта)
export const ANIMAL_COLORS = { fox: "#CE4A21", hare: "#3E8E9C", reindeer: "#3C7A4E", wolf: "#5E54B8", elk: "#A9781A", lynx: "#C24E8E" };
const ANIMAL_NAMES = {
    ru: { fox: "Лиса", hare: "Заяц", reindeer: "Олень", wolf: "Волк", elk: "Лось", lynx: "Рысь" },
    en: { fox: "Fox", hare: "Hare", reindeer: "Reindeer", wolf: "Wolf", elk: "Elk", lynx: "Lynx" },
    ukr: { fox: "Лис", hare: "Заєць", reindeer: "Олень", wolf: "Вовк", elk: "Лось", lynx: "Рись" },
    pl: { fox: "Lis", hare: "Zając", reindeer: "Renifer", wolf: "Wilk", elk: "Łoś", lynx: "Ryś" },
    lt: { fox: "Lapė", hare: "Kiškis", reindeer: "Šiaurės elnias", wolf: "Vilkas", elk: "Briedis", lynx: "Lūšis" },
};
export function animalLabel(type, lang) { return (ANIMAL_NAMES[lang] || ANIMAL_NAMES.en)[type] || type; }

// Стойка/посадка ног под каждого зверя: [плечоX, длина] для дальн./ближн. передних и задних.
const ANIMAL_RIG = {
    fox: { hf: [30, 15], hn: [34, 15], ff: [60, 15], fn: [64, 15] },
    hare: { hf: [26, 17], hn: [32, 17], ff: [63, 12], fn: [67, 12] },
    reindeer: { hf: [28, 17], hn: [34, 17], ff: [61, 17], fn: [67, 17] },
    wolf: { hf: [29, 15], hn: [35, 15], ff: [59, 16], fn: [65, 16] },
    elk: { hf: [27, 19], hn: [34, 19], ff: [60, 18], fn: [67, 18] },
    lynx: { hf: [33, 13], hn: [37, 13], ff: [57, 13], fn: [61, 13] },
};

// Одна нога вертикальной длины L, симметрична относительно локального x=0 (опора у плеча = y0).
function legPath(L) {
    L = L || 15;
    const k = (L - 4).toFixed(1), a = (L - 1).toFixed(1), b = (L + 0.4).toFixed(1);
    return `M-1.9,0 L1.9,0 L1.25,${k} L1.7,${a} Q1.7,${b} 0.4,${b} L-0.6,${b} Q-1.7,${b} -1.5,${a} L-1.15,${k} Z`;
}

function AnimalShape({ type }) {
    switch (type) {
        case "hare":
            return (<>
                <path className="rn-tail" d="M27,27 C22,25 20,28 23,30 C25,29 27,29 29,29 Z" />
                <path className="rn-body" d="M30,32 C24,32 22,27 27,24 C24,22 26,18 31,19 L48,20 C52,18 57,18 60,21 C63,20 66,18 67,15 C68,13 70,14 69,17 C68,21 65,24 61,25 C58,27 54,27 50,26 L44,26 C44,29 40,31 35,31 L31,32 Z" />
                <path className="rn-ear" d="M59,20 C56,10 58,3 61,3 C64,3 63,12 61,20 Z" />
                <path className="rn-ear rn-ear--2" d="M63,20 C62,11 64,5 67,7 C70,9 67,15 65,20 Z" />
                <circle className="rn-eye" cx="63" cy="18" r="0.9" />
            </>);
        case "reindeer":
            return (<>
                <path className="rn-tail" d="M27,25 C24,24 23,27 26,28 C27,27 28,27 29,27 Z" />
                <path className="rn-body" d="M28,31 C23,31 21,26 25,23 C23,21 25,18 29,19 L48,19 C52,16 56,16 58,20 C61,21 65,22 69,21 L75,20 C77,21 77,24 74,25 C70,26 64,26 60,25 L55,25 C54,28 51,30 46,30 L32,31 Z" />
                <path className="rn-antler" d="M66,19 C66,13 62,11 59,7 M66,16 L61,15 M67,13 L63,9 M67,19 C69,13 73,12 76,8 M68,15 L73,15 M67,13 L71,9" />
                <circle className="rn-eye" cx="71" cy="19" r="0.9" />
            </>);
        case "wolf":
            return (<>
                <path className="rn-tail" d="M28,26 C19,26 13,31 13,37 C17,34 23,31 29,31 Z" />
                <path className="rn-body" d="M28,32 C22,32 20,27 25,24 C22,22 24,18 29,19 L47,19 C50,16 54,16 56,20 C60,21 65,22 70,21 C74,20 79,19 85,18 C87,17 87,19 85,20 C79,23 74,24 69,25 C65,26 61,26 57,25 L53,25 C52,28 49,30 44,30 L31,32 Z" />
                <path className="rn-ear" d="M51,18 L50,11 L57,17 Z" />
                <circle className="rn-eye" cx="72" cy="20" r="0.9" />
            </>);
        case "elk":
            return (<>
                <path className="rn-tail" d="M28,25 C25,24 24,27 27,28 C28,27 29,27 30,27 Z" />
                <path className="rn-body" d="M28,32 C23,32 21,26 26,23 C24,20 27,17 31,19 C32,14 36,13 39,17 L51,19 C55,16 59,16 61,20 C65,21 70,22 74,20 C76,19 79,20 76,23 C72,25 66,25 62,24 L57,24 C56,27 53,29 48,29 L33,31 Z" />
                <path className="rn-antler rn-antler--palm" d="M67,17 C64,11 59,9 54,10 C58,7 64,8 66,4 C68,8 71,9 75,7 C73,12 70,14 68,16 Z" />
                <circle className="rn-eye" cx="72" cy="19" r="0.9" />
            </>);
        case "lynx":
            return (<>
                <path className="rn-tail" d="M29,25 C25,25 24,28 27,29 C28,28 29,27 30,27 Z" />
                <path className="rn-body" d="M29,31 C24,31 22,27 26,24 C24,22 26,19 30,20 L47,20 C50,17 54,17 56,21 C59,22 63,22 66,21 C68,20 71,21 68,23 C65,25 61,25 57,24 L53,24 C53,27 50,29 45,29 L33,30 Z" />
                <path className="rn-ear" d="M51,19 L50,13 L53,17 L54,11 L56,18 Z" />
                <circle className="rn-eye" cx="64" cy="19" r="0.9" />
            </>);
        case "fox":
        default:
            return (<>
                <path className="rn-tail" d="M28,25 C16,22 10,28 14,34 C18,31 24,30 30,31 Z" />
                <path className="rn-body" d="M28,31 C23,31 21,26 25,23 C22,21 24,18 28,19 L46,19 C49,15 52,16 53,20 C58,21 63,22 67,21 C71,20 76,18 83,14 C85,13 86,15 84,17 C79,21 74,24 69,25 C65,26 61,26 57,25 L53,25 C52,28 49,30 44,30 L31,31 Z" />
                <path className="rn-ear" d="M50,18 L49,10 L56,16 Z" />
                <circle className="rn-eye" cx="70" cy="20" r="0.9" />
            </>);
    }
}

export function RaceRunner({ state = "neutral", emoji = false, color = "#CE4A21", animal = "fox", frolic = false }) {
    const rootCls = "runner" + (frolic ? " runner--frolic" : "");
    if (emoji) {
        return (
            <div className={rootCls + " runner--emoji"} data-state={state} data-animal={animal} style={{ "--animal": color }}>
                <div className="runner__dust"><span /><span /><span /><span /></div>
                <div className="runner__dizzy" aria-hidden="true"><span>★</span><span>✦</span><span>★</span></div>
                <div className="runner__emoji" aria-hidden="true">{ANIMAL_EMOJI[animal] || "🦊"}</div>
                <div className="runner__spark" aria-hidden="true" />
            </div>
        );
    }
    const rig = ANIMAL_RIG[animal] || ANIMAL_RIG.fox;
    const Leg = ({ cls, spec }) => (
        <g transform={`translate(${spec[0]},30)`}><g className={"rn-leg " + cls}><path d={legPath(spec[1])} /></g></g>
    );
    return (
        <div className={rootCls} data-state={state} data-animal={animal} style={{ "--animal": color }}>
            <div className="runner__dust"><span /><span /><span /><span /></div>
            <div className="runner__dizzy" aria-hidden="true"><span>★</span><span>✦</span><span>★</span></div>
            <svg className="runner__svg" viewBox="0 0 96 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <g className="rn-legs rn-legs--far">
                    <Leg cls="rn-leg--hf" spec={rig.hf} />
                    <Leg cls="rn-leg--ff" spec={rig.ff} />
                </g>
                <g className="rn-body-grp"><AnimalShape type={animal} /></g>
                <g className="rn-legs rn-legs--near">
                    <Leg cls="rn-leg--hn" spec={rig.hn} />
                    <Leg cls="rn-leg--fn" spec={rig.fn} />
                </g>
            </svg>
            <div className="runner__spark" aria-hidden="true" />
        </div>
    );
}

export default RaceRunner;
