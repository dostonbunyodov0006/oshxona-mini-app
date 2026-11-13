// src/app/tgapi.js — Telegram Bot API чақируви.
//
// Қоидалар:
//   • тармоқ узилса — 2 мартагача қайта уринади;
//   • 429 (Too Many Requests) келса — Telegram айтган retry_after гача
//     кутиб яна уринади (кўпи билан 5 сония);
//   • хато бўлса ЎЗИ хато ташламайди — { ok: false, description } қайтаради,
//     шунда битта одамга хабар кетмаса ҳам қолганларга кетаверади.

const TG_URINISH = 2;
const TG_KUTISH_MAX = 5;
const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {string} token   BOT_TOKEN (secret)
 * @param {string} method  sendMessage | editMessageText | deleteMessage | …
 * @param {object} payload Telegram API майдонлари
 * @returns {Promise<{ok:boolean, result?:any, error_code?:number, description?:string}>}
 */
export async function tg(token, method, payload) {
  for (let urinish = 0; ; urinish++) {
    let data;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = await res.json();
    } catch (e) {
      if (urinish < TG_URINISH) { await kut(700 * (urinish + 1)); continue; }
      console.error("tg тармоқ:", method, e);
      return { ok: false, error_code: 0, description: String(e) };
    }
    if (data && data.ok === false && data.error_code === 429 && urinish < TG_URINISH) {
      const s = Math.min(Math.max(Number(data.parameters && data.parameters.retry_after) || 1, 1), TG_KUTISH_MAX);
      await kut(s * 1000);
      continue;
    }
    if (data && data.ok === false) console.error("tg:", method, data.error_code, data.description);
    return data;
  }
}
