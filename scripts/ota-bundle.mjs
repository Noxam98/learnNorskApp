// Живое обновление веб-части приложения (OTA): после `vite build` пакуем dist в zip и кладём
// рядом манифест. APK (Capacitor) раз в запуск читает манифест с прода, качает zip и
// подменяет вшитую веб-часть плагином @capgo/capacitor-updater — фикс фронта доходит до
// приложения без переустановки APK (см. src/native/otaUpdate.js).
//
// Результат — в dist/ota/:
//   <build>.zip   — весь dist (index.html в корне архива — так требует плагин), без самой ota/;
//   latest.json   — { version: <build>, url: "<build>.zip", checksum: <sha256 hex>, minNative }.
// minNative — минимальный versionCode APK, которому этот веб совместим (поле otaMinNative в
// package.json; поднимать, когда меняется нативная часть: плагины, манифест, Kotlin-код).
//
// Запускается только в сборке для Vercel (npm run build:web): в APK архив обновления самого
// себя не нужен, поэтому `npm run build` (CI, android:sync) ota/ не создаёт.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const OTA_DIR = "ota";
const FIXED_MTIME = new Date("2020-01-01T00:00:00Z");   // ZIP хранит даты только в 1980–2099

/** Все файлы dist (рекурсивно), кроме ota/ и скрытых — плагин спотыкается о лишние dot-файлы. */
function collect(root, dir = root, out = {}) {
    for (const name of readdirSync(dir)) {
        if (name.startsWith(".")) continue;
        const full = join(dir, name);
        const rel = relative(root, full).split(sep).join("/");
        if (rel === OTA_DIR) continue;
        if (statSync(full).isDirectory()) collect(root, full, out);
        else out[rel] = readFileSync(full);
    }
    return out;
}

/**
 * Собрать zip и манифест в <distDir>/ota. Возвращает манифест.
 * @param {{ distDir: string, minNative: number }} p
 */
export function buildOta({ distDir, minNative }) {
    const version = JSON.parse(readFileSync(join(distDir, "version.json"), "utf8")).build;
    if (!version) throw new Error("dist/version.json без build — сначала vite build");
    const files = collect(distDir);
    if (!files["index.html"]) throw new Error("в dist нет index.html");
    // mtime фиксируем: одинаковый dist → одинаковый zip (и checksum), сборка воспроизводима
    const zip = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [v, { mtime: FIXED_MTIME }]])), { level: 9 });
    const checksum = createHash("sha256").update(zip).digest("hex");
    const out = join(distDir, OTA_DIR);
    mkdirSync(out, { recursive: true });
    const zipName = `${version}.zip`;
    writeFileSync(join(out, zipName), zip);
    const manifest = { version, url: zipName, checksum, minNative };
    writeFileSync(join(out, "latest.json"), JSON.stringify(manifest));
    return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const minNative = Number(pkg.otaMinNative);
    if (!Number.isInteger(minNative) || minNative < 1) throw new Error("package.json: нужен otaMinNative (целое ≥ 1)");
    const m = buildOta({ distDir: join(root, "dist"), minNative });
    console.log(`ota: ${m.url} (minNative ${m.minNative}, sha256 ${m.checksum.slice(0, 12)}…)`);
}
