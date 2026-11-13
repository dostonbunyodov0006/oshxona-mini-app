// src/app/eslatma.js — Ошхона эслатмаси: 09:00, 09:20, 09:30 (Telegram хабар).
//
// Эрталаб ишчининг Telegram'ига хабар боради: бугунги овқат + «🍽 Белгилаш»
// тугмаси. Тугма мини аппнинг Ошхона бўлимини дарров очади.
//
// УЧ БОСҚИЧ (09:00 / 09:20 / 09:30), чунки 09:45 да ҳисоб ёпилади:
//   • хабар ФАҚАТ ҳали ҲЕЧ НИМА белгиламаганларга кетади — «ейман» босган
//     ҳам, «емайман» босган ҳам рўйхатдан чиқади (олдиндан белгилаб
//     қўйганлар ҳам тинч қолади);
//   • ҳар янги босқич олдингисининг хабарини ЎЧИРАДИ (deleteMessage), шунда
//     одамда ҳар доим БИТТА эслатма туради — иккита ёнма-ён турмайди;
//   • матн босқичга қараб ўзгаради: «Ҳайрли тонг» → «ҳали белгиламадингиз,
//     25 дақиқа қолди» → «Охирги эслатма, 15 дақиқа қолди».
//
// Босқич соат ДАҚИҚАСИДАН аниқланади (bosqichOl), шу сабаб cron битта:
// «0,20,30 4 * * *» (04:xx UTC = 09:xx Тошкент).
//
// Кунига ҳар босқич БИР МАРТА (app:osh:eslatma:<сана>[:b2|:b3]) — cron қайта
// юрса ҳам такрор кетмайди. Якшанба — дам олиш куни, эслатма йўқ. Одам ботни
// ҳали очмаган бўлса Telegram рад этади — у ўтказиб юборилади, қолганларга
// кетаверади.
import { kvGet } from "../kv.js";
import { tg } from "./tgapi.js";
import * as O from "./oshxona.js";
import * as R from "./rollar.js";

const KALIT = (sana, bosqich = 1) => `app:osh:eslatma:${sana}${bosqich > 1 ? `:b${bosqich}` : ""}`;
// Юборилган хабарлар id си — кейинги босқичда ўчириш учун: [{uid, id}]
const XABAR = (sana) => `app:osh:eslatma:xabar:${sana}`;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 09:00 → 1, 09:20 → 2, 09:30 → 3 (Тошкент дақиқаси = UTC дақиқаси) */
export function bosqichOl(hozir = Date.now()) {
  const d = new Date(hozir).getUTCMinutes();
  return d < 10 ? 1 : d < 25 ? 2 : 3;
}

/** Мини апп ҳаволаси — ?bolim=… билан керакли бўлим дарров очилади */
export function appHavola(env, bolim) {
  const asos = String((env && env.APP_URL) || "").replace(/\/?$/, "/");
  return `${asos}?bolim=${encodeURIComponent(bolim)}`;
}

/** Шу одам қайси овқатларни белгилай олади: ['t'] | ['t','k'] | ['k'] */
export function kerakliOvqatlar(uid, rollar) {
  if (R.faqatUjinmi(uid, rollar)) return ["k"];
  return R.ujinKoradimi(uid, null, rollar) ? ["t", "k"] : ["t"];
}

export function ishchiMatni(menyu, ujin, faqatUjin = false, bosqich = 1) {
  const tushlik = menyu && menyu.tushlik;
  const kechki = menyu && menyu.kechki;
  let t = bosqich === 1 ? "🍽 <b>Ҳайрли тонг!</b>\n\n"
        : bosqich === 2 ? "⏰ <b>Эслатма — ҳали белгиламадингиз!</b>\n\n"
        : "⚠️ <b>Охирги эслатма!</b>\n\n";
  if ((tushlik && !faqatUjin) || (ujin && kechki)) {
    t += "Бугунги овқат:\n";
    if (!faqatUjin) t += `☀️ Тушлик — <b>${esc(tushlik || "киритилмаган")}</b>\n`;
    if (ujin) t += `🌙 Кечки — <b>${esc(kechki || "киритилмаган")}</b>\n`;
    t += "\n";
  }
  t += "Овқат ейишингиз ёки емаслигингизни белгилаб қўйинг 👇\n";
  t += `⏰ <b>${O.YOPISH_MATN || "09:45"}</b> гача`;
  if (bosqich === 3) t += " — <b>15 дақиқа</b> қолди!";
  else if (bosqich === 2) t += " — <b>25 дақиқа</b> қолди";
  return t;
}

/**
 * @param {number} bosqich 1 = 09:00, 2 = 09:20, 3 = 09:30
 * @returns {Promise<{yuborildi:number, otkazildi:number, bosqich?:number, ochirildi?:number, belgilagan?:number, sabab?:string}>}
 */
export async function eslatmaYubor(env, hozir = Date.now(), bosqich = 1) {
  if (!env.BOT_TOKEN || !env.ACCESS_KV) return { yuborildi: 0, otkazildi: 0, sabab: "созланмаган" };
  if (!env.APP_URL) return { yuborildi: 0, otkazildi: 0, sabab: "APP_URL йўқ" };
  if (O.yakshanbami(hozir)) return { yuborildi: 0, otkazildi: 0, sabab: "якшанба" };

  const sana = O.bugun(hozir);
  if (await kvGet(env, KALIT(sana, bosqich), null)) return { yuborildi: 0, otkazildi: 0, bosqich, sabab: "бугун юборилган" };
  // Аввал белгилаймиз — хабарлар ярмида узилса ҳам эртага эмас, бугун қайта юборилмасин
  await env.ACCESS_KV.put(KALIT(sana, bosqich), JSON.stringify({ vaqt: new Date(hozir).toISOString() }),
                          { expirationTtl: 3 * 86400 });

  const [rollar, menyuH, ovozlar] = await Promise.all([
    R.rollarOl(env), O.menyuOl(env, O.haftaKod(sana)), O.ovozlarOl(env, sana),
  ]);
  const menyu = menyuH.menyu[sana] || null;

  // Ким нимани белгилаб бўлган (уларга хабар кетмайди)
  const belgilangan = new Map();
  for (const o of ovozlar || []) {
    const uid = Number(o.uid);
    if (!belgilangan.has(uid)) belgilangan.set(uid, new Set());
    belgilangan.get(uid).add(o.m);
  }
  const bolganmi = (uid) => {
    const bor = belgilangan.get(Number(uid));
    return Boolean(bor) && kerakliOvqatlar(uid, rollar).every((m) => bor.has(m));
  };

  // ON/OFF олиб ташланди (2026-10-12), бригадир ҳам босади (2026-10-14) — эслатма ҲАММА ишчига
  const ishchilar = [...new Set(rollar.ishchi.map(Number))];
  const kerak = ishchilar.filter((id) => !bolganmi(id));

  // Олдинги босқич хабарлари ЎЧИРИЛАДИ — иккита эслатма ёнма-ён турмасин
  let ochirildi = 0;
  const eski = await kvGet(env, XABAR(sana), []);
  for (const x of Array.isArray(eski) ? eski : []) {
    if (!x || !x.uid || !x.id) continue;
    const r = await tg(env.BOT_TOKEN, "deleteMessage", { chat_id: x.uid, message_id: x.id });
    if (r && r.ok) ochirildi++;
  }

  let yuborildi = 0, otkazildi = 0;
  const yangi = [];
  const yubor = async (id, text, tugma, bolim) => {
    const r = await tg(env.BOT_TOKEN, "sendMessage", {
      chat_id: id, text, parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: tugma, web_app: { url: appHavola(env, bolim) } }]] },
    });
    if (r && r.ok) {
      yuborildi++;
      const mid = r.result && r.result.message_id;
      if (mid) yangi.push({ uid: Number(id), id: mid });
    } else { otkazildi++; console.warn("eslatma:", id, r && r.description); }
  };

  for (const id of kerak) {
    await yubor(id, ishchiMatni(menyu, R.ujinKoradimi(id, null, rollar), R.faqatUjinmi(id, rollar), bosqich),
                "🍽 Белгилаш", "ovqat");
  }
  await env.ACCESS_KV.put(XABAR(sana), JSON.stringify(yangi), { expirationTtl: 3 * 86400 });

  return { yuborildi, otkazildi, bosqich, ochirildi, belgilagan: ishchilar.length - kerak.length };
}
