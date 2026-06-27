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
