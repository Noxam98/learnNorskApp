// Ужать выбранную картинку перед отправкой (меньше байт по сети и меньше токенов vision-модели).
const IMG_MAX_DIM = 1280, IMG_QUALITY = 0.72;

// Прочитать файл-картинку и ужать до IMG_MAX_DIM по большей стороне (JPEG) → data-URL.
export function downscaleImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const im = new Image();
        im.onload = () => {
            URL.revokeObjectURL(url);
            let w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
            const big = Math.max(w, h);
            if (big > IMG_MAX_DIM) { const k = IMG_MAX_DIM / big; w = Math.round(w * k); h = Math.round(h * k); }
            const c = document.createElement("canvas"); c.width = w; c.height = h;
            c.getContext("2d").drawImage(im, 0, 0, w, h);
            try { resolve(c.toDataURL("image/jpeg", IMG_QUALITY)); } catch (e) { reject(e); }
        };
        im.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        im.src = url;
    });
}

// Повернуть уже ужатое изображение на четверть оборота без отправки исходного тяжёлого файла.
export function rotateImage(dataUrl, quarterTurns = 0) {
    const turns = ((quarterTurns % 4) + 4) % 4;
    if (!turns) return Promise.resolve(dataUrl);
    return new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => {
            const swap = turns % 2 === 1;
            const c = document.createElement("canvas");
            c.width = swap ? im.naturalHeight : im.naturalWidth;
            c.height = swap ? im.naturalWidth : im.naturalHeight;
            const ctx = c.getContext("2d");
            if (!ctx) { reject(new Error("Canvas unavailable")); return; }
            ctx.translate(c.width / 2, c.height / 2);
            ctx.rotate(turns * Math.PI / 2);
            ctx.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
            try { resolve(c.toDataURL("image/jpeg", IMG_QUALITY)); } catch (e) { reject(e); }
        };
        im.onerror = reject;
        im.src = dataUrl;
    });
}

// Вырезать нормализованную область {x,y,w,h} из уже повёрнутого изображения.
export function cropImage(dataUrl, crop) {
    const box = crop || { x: 0, y: 0, w: 1, h: 1 };
    return new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => {
            const sx = Math.max(0, Math.round(im.naturalWidth * box.x));
            const sy = Math.max(0, Math.round(im.naturalHeight * box.y));
            const sw = Math.max(1, Math.min(im.naturalWidth - sx, Math.round(im.naturalWidth * box.w)));
            const sh = Math.max(1, Math.min(im.naturalHeight - sy, Math.round(im.naturalHeight * box.h)));
            const c = document.createElement("canvas");
            c.width = sw; c.height = sh;
            const ctx = c.getContext("2d");
            if (!ctx) { reject(new Error("Canvas unavailable")); return; }
            ctx.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
            try { resolve(c.toDataURL("image/jpeg", IMG_QUALITY)); } catch (e) { reject(e); }
        };
        im.onerror = reject;
        im.src = dataUrl;
    });
}
