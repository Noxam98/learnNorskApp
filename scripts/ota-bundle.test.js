// Упаковка веб-части для живого обновления APK: zip без самой ota/ и скрытых файлов,
// index.html в корне архива, манифест с sha256 этого zip, воспроизводимость.
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { buildOta } from "./ota-bundle.mjs";

function fakeDist() {
    const dir = mkdtempSync(join(tmpdir(), "ota-"));
    writeFileSync(join(dir, "index.html"), "<html></html>");
    writeFileSync(join(dir, "version.json"), JSON.stringify({ build: "abc123" }));
    writeFileSync(join(dir, ".DS_Store"), "x");
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets", "index-1.js"), "console.log(1)");
    return dir;
}

describe("buildOta", () => {
    it("zip + манифест в dist/ota, без ota/ и dot-файлов", () => {
        const dir = fakeDist();
        const m = buildOta({ distDir: dir, minNative: 11 });
        expect(m).toMatchObject({ version: "abc123", url: "abc123.zip", minNative: 11 });
        const zip = readFileSync(join(dir, "ota", "abc123.zip"));
        expect(m.checksum).toBe(createHash("sha256").update(zip).digest("hex"));
        expect(Object.keys(unzipSync(zip)).sort()).toEqual(["assets/index-1.js", "index.html", "version.json"]);
        expect(JSON.parse(readFileSync(join(dir, "ota", "latest.json"), "utf8"))).toEqual(m);
    });

    it("повторная сборка того же dist даёт тот же архив (ota/ прошлого прогона не попадает внутрь)", () => {
        const dir = fakeDist();
        const a = buildOta({ distDir: dir, minNative: 11 });
        const b = buildOta({ distDir: dir, minNative: 11 });
        expect(b.checksum).toBe(a.checksum);
    });

    it("без index.html / version.json — ошибка, а не пустой бандл", () => {
        const dir = mkdtempSync(join(tmpdir(), "ota-"));
        writeFileSync(join(dir, "version.json"), JSON.stringify({ build: "x" }));
        expect(() => buildOta({ distDir: dir, minNative: 1 })).toThrow("index.html");
    });
});
