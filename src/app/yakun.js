// src/app/yakun.js — ҳар куни 09:45 да Ошхона ЯКУНИ.
//
// Иккита иш:
//   1) БОСМАГАНЛАР → «емайди». Овоз бериши керак бўлган, лекин ҳеч нима
//      босмаган ишчига ўша овқатга автоматик «Емайман» ёзилади (auto=1).
//      Олдин босилган овоз ЎЗГАРМАЙДИ. Ошпаз овоз бермайди — у четда.
//   2) ОШПАЗГА ЯКУНИЙ СОН Telegram'да боради (тушлик / кечки).
//
// Кунига БИР МАРТА (app:osh:yakun:<сана>). «Бажарилди» белгиси ФАҚАТ ошпазга
// хабар кетгандан КЕЙИН қўйилади: 09:45 да база ёки Telegram жавоб бермаса,
// 09:50 даги ЗАХИРА cron яна уриниб кўради («50 4 * * *»).
//
// 09:45 дан кейин сон ўзгарса (масалан кечиккан овоз қўлда қўшилса),
// ошпазга ЯНГИ хабар юборилмайди — ЎША хабарнинг ЎЗИ таҳрирланади
// (xabarYangila), шунда ошпазда эски сон қолиб кетмайди.
//
// Якшанба — дам олиш куни, ҳеч нарса қилинмайди.
import { kvGet } from "../kv.js";
import { tg } from "./tgapi.js";
import * as O from "./oshxona.js";
import * as R from "./rollar.js";
import { appHavola } from "./eslatma.js";

const KALIT = (sana) => `app:osh:yakun:${sana}`;
const BAND = (sana) => `app:osh:yakun:band:${sana}`;   // ҳозир юриб турибди (2 дақиқа) — такрор хабар кетмасин
const XABAR = (sana) => `app:osh:yakun:xabar:${sana}`; // ошпазга кетган хабар: { xabarlar:[{chat,id}], tushlik, kechki }
const tugma = (env) => (env.APP_URL ? { reply_markup: { inline_keyboard: [[{ text: "📊 Ҳисоб", web_app: { url: appHavola(env, "oshhisob") } }]] } } : {});

/** 09:45 дан КЕЙИН сон ўзгарса — ошпазга кетган хабарнинг ЎЗИНИ янгилайди.
 *  Янги хабар юборилмайди. Сон ўзгармаган бўлса — ҳеч нарса қилмайди. */
export async function xabarYangila(env, hozir = Date.now()) {
  if (!env.ACCESS_KV || !env.BOT_TOKEN) return { yangilandi: 0 };
  if (O.yakshanbami(hozir) || !O.yopiqmi(hozir)) return { yangilandi: 0 };
  const sana = O.bugun(hozir);
  const x = await kvGet(env, XABAR(sana), null);
  if (!x || !Array.isArray(x.xabarlar) || !x.xabarlar.length) return { yangilandi: 0 };
  const b = (await O.kunlar(env, 1, hozir))[0];
  const k = { tushlik: b.jami.tushlik ?? 0, kechki: b.jami.kechki ?? 0 };
  if (k.tushlik === x.tushlik && k.kechki === x.kechki) return { yangilandi: 0, ...k };
  let yangilandi = 0;
  const qolgan = [];
  for (const m of x.xabarlar) {
    const r = await tg(env.BOT_TOKEN, "editMessageText", {
      chat_id: m.chat, message_id: m.id, text: oshpazMatni(sana, k), parse_mode: "HTML", ...tugma(env),
    });
    if (r && r.ok) { yangilandi++; qolgan.push(m); }
    else console.warn("xabarYangila:", m.chat, r && r.description);
  }
  await env.ACCESS_KV.put(XABAR(sana), JSON.stringify({ xabarlar: qolgan.length ? qolgan : x.xabarlar, ...k }), { expirationTtl: 3 * 86400 });
  return { yangilandi, ...k, eski: { tushlik: x.tushlik, kechki: x.kechki } };
}
const HAFTA = ["Якшанба", "Душанба", "Сешанба", "Чоршанба", "Пайшанба", "Жума", "Шанба"];

/** Шу овқатга (m: "t" | "k") овоз бериши КЕРАК бўлган ишчилар */
export function kutilganlar(rollar, m) {
  // Бригадир ҳам оддий ишчи — фақат ошпаз четда
  const chetda = new Set((rollar.cook || []).map(Number));
  return [...new Set((rollar.ishchi || []).map(Number))]
    .filter((id) => !chetda.has(id) && R.ovozBeraOladimi(id, new Set(["ishchi"]), m, rollar));
}

export function oshpazMatni(sana, k) {
  const kun = HAFTA[new Date(sana + "T00:00:00Z").getUTCDay()];
  const [y, oy, d] = sana.split("-");
  return `🍽 <b>Бугунги овқат — якуний</b>\n${kun}, ${d}.${oy}.${y}\n\n` +
    `☀️ Тушлик — <b>${k.tushlik} та</b>\n🌙 Кечки — <b>${k.kechki} та</b>`;
}

/** @returns {Promise<{avto:number, yuborildi:number, sabab?:string, tushlik?:number, kechki?:number}>} */
export async function yakunla(env, hozir = Date.now()) {
  if (!env.ACCESS_KV) return { avto: 0, yuborildi: 0, sabab: "созланмаган" };
  if (O.yakshanbami(hozir)) return { avto: 0, yuborildi: 0, sabab: "якшанба" };
  if (!O.yopiqmi(hozir)) return { avto: 0, yuborildi: 0, sabab: "ҳали 09:45 эмас" };
  const sana = O.bugun(hozir);
  if (await kvGet(env, KALIT(sana), null)) return { avto: 0, yuborildi: 0, sabab: "бугун бажарилган" };
  // ҲИМОЯ: «бажарилди» белгиси ФАҚАТ ошпазга хабар кетгандан КЕЙИН қўйилади.
  // Аввал қўйиларди — 09:45 да база ёки Telegram жавоб бермаса, ошпаз ўша куни сонни умуман
  // олмасди. Энди 09:50 да cron яна уриниб кўради (wrangler.app.toml: «50 4 * * *»).
  // BAND — иккита юриш бир вақтда бўлиб, ошпазга икки хабар кетмаслиги учун (2 дақиқа).
  if (await kvGet(env, BAND(sana), null)) return { avto: 0, yuborildi: 0, sabab: "ҳозир бажарилмоқда" };
  await env.ACCESS_KV.put(BAND(sana), JSON.stringify({ vaqt: new Date(hozir).toISOString() }), { expirationTtl: 120 });

  // 1) Босмай қолганлар → «Емайман» (auto)
  const rollar = await R.rollarOl(env);
  const kerak = [...kutilganlar(rollar, "t").map((uid) => ({ uid, m: "t" })),
                 ...kutilganlar(rollar, "k").map((uid) => ({ uid, m: "k" }))];
  // Овозлар D1'да — oshxona.js avtoYoz; D1 бўлмаса олдингидек KV
  const avto = await O.avtoYoz(env, sana, kerak, new Date(hozir).toISOString());

  // 2) Ошпазга якуний сон
  const b = (await O.kunlar(env, 1, hozir))[0];
  const k = { tushlik: b.jami.tushlik ?? 0, kechki: b.jami.kechki ?? 0 };
  let yuborildi = 0;
  const xabarlar = [];
  if (env.BOT_TOKEN) {
    for (const id of new Set((rollar.cook || []).map(Number))) {
      const r = await tg(env.BOT_TOKEN, "sendMessage", {
        chat_id: id, text: oshpazMatni(sana, k), parse_mode: "HTML", ...tugma(env),
      });
      if (r && r.ok) { yuborildi++; xabarlar.push({ chat: id, id: r.result && r.result.message_id }); }
      else console.warn("yakun: oshpaz", id, r && r.description);
    }
  }
  // Хабар рақами сақланади — кейин сон ўзгарса (масалан кечиккан овоз қўлда қўшилса),
  // ЎША хабарнинг ЎЗИ янгиланади, ошпазда эски сон қолиб кетмайди.
  if (xabarlar.length) {
    await env.ACCESS_KV.put(XABAR(sana), JSON.stringify({ xabarlar: xabarlar.filter((x) => x.id), ...k }), { expirationTtl: 3 * 86400 });
  }
  // Хабар кетган бўлсагина «бугун бажарилди» — акс ҳолда 09:50 даги cron қайта уринади.
  // (Овозларга зарар йўқ: avtoYoz такрор юрса ҳам босилган овозга тегмайди.)
  const bajarildi = yuborildi > 0 || !env.BOT_TOKEN || new Set((rollar.cook || []).map(Number)).size === 0;
  if (bajarildi) await env.ACCESS_KV.put(KALIT(sana), JSON.stringify({ vaqt: new Date(hozir).toISOString(), yuborildi }), { expirationTtl: 3 * 86400 });
  else console.error("yakun: ошпазга хабар кетмади — 09:50 да қайта уринилади", sana);
  await env.ACCESS_KV.delete(BAND(sana));
  return { avto, yuborildi, ...k, ...(bajarildi ? {} : { qayta: true }) };
}
