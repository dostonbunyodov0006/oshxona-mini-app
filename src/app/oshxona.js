// src/app/oshxona.js — Ошхонанинг ЮРАГИ: овозлар, кунлик ҳисоб, ҳафталик меню.
//
// Иш тартиби:
//   • ишчи 09:45 гача «✅ Ейман» ёки «❌ Емайман» босади (бугунга ва шу
//     ҳафтанинг қолган кунларига олдиндан ҳам);
//   • 09:45 да ёпилади — босмаганларга автоматик «емайди» ёзилади (yakun.js);
//   • ошпазга якуний сон Telegram'да боради.
//
// Овозлар D1 жадвали osh_ovoz да: ҳар одамнинг ҳар кунги ҳар овқати —
// АЛОҲИДА қатор, калити PRIMARY KEY (sana, uid, m). Шу сабаб икки одам
// бир вақтда босса ҳам бир-бирининг овозини ўчирмайди (аввал KV'да битта
// рўйхат эди — пойга бўлиб овозлар йўқоларди).
//
// Меню KV'да: app:osh:menyu:tarix — «шу ҳафтадан бошлаб» усулида.
import { kvGet, kvGetMany, kvRoyxatYoz } from "../kv.js";

const TZ = 5 * 3600 * 1000;                  // Тошкент = UTC+5
const ikki = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getUTCFullYear()}-${ikki(d.getUTCMonth() + 1)}-${ikki(d.getUTCDate())}`;
const MENU = (h) => `app:osh:menu:${h}`;

/** Mini App ёзадиган ЯГОНА йўл — бошқа префикс = дастур хатоси */
export async function appPut(env, key, val) {
  if (!String(key).startsWith("app:")) throw new Error(`appPut: фақат app: калит (${key})`);
  if (!env.ACCESS_KV) throw new Error("ACCESS_KV binding йўқ");
  await env.ACCESS_KV.put(key, JSON.stringify(val));
}

export function bugun(hozir = Date.now()) { return iso(new Date(hozir + TZ)); }
export function sanaMi(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !isNaN(Date.parse(s + "T00:00:00Z")); }
export function haftaMi(s) { return /^\d{4}-W\d{2}$/.test(String(s)); }

/** ISO ҳафта коди: «2026-09-14» → «2026-W38» */
export function haftaKod(sana) {
  const d = new Date(sana + "T00:00:00Z");
  const kun = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - kun);
  const y = d.getUTCFullYear();
  const h = Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${ikki(h)}`;
}

/** «2026-W38» → 7 та сана (душанба…якшанба) */
export function haftaKunlari(kod) {
  const m = String(kod).match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const jan4 = new Date(Date.UTC(+m[1], 0, 4));
  const kun = jan4.getUTCDay() || 7;
  const dush = jan4.getTime() - (kun - 1) * 86400000 + (+m[2] - 1) * 7 * 86400000;
  return Array.from({ length: 7 }, (_, i) => iso(new Date(dush + i * 86400000)));
}

const matn = (v, max = 120) => String(v ?? "").trim().slice(0, max);

/* ---------- овоз бериш вақти ---------- */

export const YOPISH = 9 * 60 + 45;            // 09:45 Тошкент
export const YOPISH_MATN = "09:45";
const daqiqa = (hozir) => { const d = new Date(hozir + TZ); return d.getUTCHours() * 60 + d.getUTCMinutes(); };

/** Якшанба — дам олиш куни: меню ҳам, овоз ҳам йўқ */
export const yakshanbami = (hozir = Date.now()) => new Date(hozir + TZ).getUTCDay() === 0;
export const yopiqmi = (hozir = Date.now()) => yakshanbami(hozir) || daqiqa(hozir) >= YOPISH;

/** Бугундан шу ҳафтанинг шанбасигача саналар (якшанба — бўш) */
export function qolganKunlar(hozir = Date.now()) {
  const b = new Date(bugun(hozir) + "T00:00:00Z");
  const k = b.getUTCDay();                    // 0 = якшанба
  if (k === 0) return [];
  const r = [];
  for (let i = 0; k + i <= 6; i++) r.push(iso(new Date(b.getTime() + i * 86400000)));
  return r;
}

/** ОЛДИНДАН ОВОЗ: ҲАР КУН ЎЗ КУНИ 09:45 да ёпилади.
 *  Сешанба 09:45 дан кейин фақат сешанба ёпиқ — чоршанба…шанба очиқ қолади. */
export function ovozSanalari(hozir = Date.now()) {
  const b = bugun(hozir);
  return qolganKunlar(hozir).filter((s) => s > b || !yopiqmi(hozir));
}

/* ---------- овозлар (D1: osh_ovoz) ---------- */

const qatorOvoz = (q) => ({ uid: Number(q.uid), m: q.m, t: q.t, vaqt: q.vaqt, ...(q.auto ? { auto: true } : {}) });
const tartib = (a, b) => (String(a.vaqt) < String(b.vaqt) ? -1 : String(a.vaqt) > String(b.vaqt) ? 1 : 0);

async function qatorlarOl(env, sanalar) {
  if (!sanalar.length) return [];
  const r = await env.DB.prepare(
    `SELECT sana, uid, m, t, vaqt, auto FROM osh_ovoz WHERE sana IN (${sanalar.map(() => "?").join(",")})`,
  ).bind(...sanalar).all();
  return r.results || [];
}

/** Бир куннинг овозлари, вақт бўйича */
export async function ovozlarOl(env, sana) {
  return (await qatorlarOl(env, [sana])).map(qatorOvoz).sort(tartib);
}

/** Бир нечта кун бир йўла: Map сана → овозлар */
async function ovozlarKop(env, sanalar) {
  const q = await qatorlarOl(env, sanalar);
  return new Map(sanalar.map((s) => [s, q.filter((x) => x.sana === s).map(qatorOvoz).sort(tartib)]));
}

const UPSERT = `INSERT INTO osh_ovoz (sana, uid, m, t, vaqt, auto) VALUES (?, ?, ?, ?, ?, 0)
  ON CONFLICT (sana, uid, m) DO UPDATE SET t = excluded.t, vaqt = excluded.vaqt, auto = 0`;

/** Ишчининг овози. Энг охиргиси қолади (ҳар одамдан ҳар овқатга битта ёзув). */
export async function ovozYoz(env, uid, body, { ujin = false, hozir = Date.now(), sana: kun = null } = {}) {
  const m = body && body.m === "k" ? "k" : body && body.m === "t" ? "t" : null;
  const t = body && body.t === "y" ? "y" : body && body.t === "n" ? "n" : null;
  if (!m || !t) return { ok: false, xato: "нотўғри танлов" };
  if (m === "k" && !ujin) return { ok: false, xato: "Кечки овқат сиз учун эмас" };
  const sana = kun || bugun(hozir);
  if (!ovozSanalari(hozir).includes(sana)) {
    if (sana === bugun(hozir) && yakshanbami(hozir)) return { ok: false, xato: "Якшанба — дам олиш куни" };
    if (yopiqmi(hozir) && sana >= bugun(hozir)) return { ok: false, xato: `${YOPISH_MATN} да ёпилган — эртага ${YOPISH_MATN} гача белгиласа бўлади` };
    return { ok: false, xato: "Бу кунга овоз бериб бўлмайди" };
  }
  const y = { uid: Number(uid), m, t, vaqt: new Date(hozir).toISOString() };
  try {
    const r = await env.DB.prepare(UPSERT).bind(sana, y.uid, m, t, y.vaqt).run();
    return r && r.success !== false ? { ok: true, ovoz: y } : { ok: false, xato: "ёзилмади, қайта уриниб кўринг" };
  } catch (e) {
    console.error("ovozYoz D1", e && e.message);
    return { ok: false, xato: "ёзилмади, қайта уриниб кўринг" };
  }
}

/** 09:45 якуни: босмаганларга «емайди» (auto=1). Шу орада босган бўлса — УНИКИ қолади.
 *  INSERT OR IGNORE — мавжуд қаторга тегмайди. @returns нечта қатор ёзилди */
export async function avtoYoz(env, sana, kerak, vaqt) {
  if (!kerak.length) return 0;
  const r = await env.DB.batch(kerak.map((x) =>
    env.DB.prepare("INSERT OR IGNORE INTO osh_ovoz (sana, uid, m, t, vaqt, auto) VALUES (?, ?, ?, 'n', ?, 1)")
      .bind(sana, Number(x.uid), x.m, vaqt)));
  return r.reduce((n, x) => n + ((x && x.meta && x.meta.changes) || 0), 0);
}

/** { tushlik: { ha, yoq }, kechki: { ha, yoq } } */
export function sanoq(ovozlar) {
  const s = { tushlik: { ha: 0, yoq: 0 }, kechki: { ha: 0, yoq: 0 } };
  for (const x of ovozlar || []) {
    const o = x && (x.m === "t" ? s.tushlik : x.m === "k" ? s.kechki : null);
    if (!o) continue;
    if (x.t === "y") o.ha++;
    else o.yoq++;
  }
  return s;
}

/** Кун ҳисоби. tushlik/kechki — «Ейман» босганлар сони (ҳар ким 1 та);
 *  ҳеч ким босмаган кунда null («—» бўлиб кўринади). */
export function jamla(sana, ovozlar) {
  const bor = Array.isArray(ovozlar) && ovozlar.length > 0;
  const s = sanoq(ovozlar);
  const tushlik = bor ? s.tushlik.ha : null, kechki = bor ? s.kechki.ha : null;
  return {
    sana, tushlik, kechki,
    yoq: bor ? { tushlik: s.tushlik.yoq, kechki: s.kechki.yoq } : null,
    jami: { tushlik, kechki },
  };
}

async function sanalarHisobi(env, sanalar) {
  const ov = await ovozlarKop(env, sanalar);
  return sanalar.map((s) => jamla(s, ov.get(s)));
}

/** Охирги n кун (бугундан орқага) */
export async function kunlar(env, n = 14, hozir = Date.now()) {
  return sanalarHisobi(env, Array.from({ length: n }, (_, i) => iso(new Date(hozir + TZ - i * 86400000))));
}

/** Ошпаз «Ҳисоб»и: ФАҚАТ шу ҳафта — душанба … шанба */
export async function haftaHisob(env, hozir = Date.now()) {
  return sanalarHisobi(env, haftaKunlari(haftaKod(bugun(hozir))).slice(0, 6));
}

/* ---------- ҳафталик меню — ҲАР ҲАФТА ТАКРОРЛАНАДИ ----------
   Ошпаз бир ҳафталик менюни киритиб сақлайди — кейинги ҳафталарда ҳам
   ШУ меню кўринади, ошпаз ўзгартирмагунча. Шу сабаб меню ҲАФТА КУНИ
   бўйича (душанба…шанба) сақланади ва «шу ҳафтадан бошлаб» деб тарихга
   ёзилади:
     • 38-ҳафтада сақланди → 39, 40, 41… ҳафталарда ҳам шу меню;
     • 40-ҳафтада сешанба ўзгартирилди → 40-ҳафтадан бошлаб янги сешанба,
       38–39-ҳафталар эскисича қолади (ўтган кунлар ҳисоби ўзгармайди).  */
const MENYU_TARIX = "app:osh:menyu:tarix";    // [{ dan: "2026-W38", kunlar: {1:{tushlik,kechki},…}, kim, vaqt }]
const haftaKuniRaqam = (sana) => new Date(sana + "T00:00:00Z").getUTCDay();   // 1…6, 0 = якшанба

async function menyuTarixOl(env) {
  const r = await kvGet(env, MENYU_TARIX, []);
  return (Array.isArray(r) ? r : []).filter((x) => x && haftaMi(x.dan) && x.kunlar)
    .sort((a, b) => (a.dan < b.dan ? -1 : a.dan > b.dan ? 1 : 0));
}

export async function menyuOl(env, hafta) {
  const kunlarH = haftaKunlari(hafta);
  if (!kunlarH) return { hafta, kunlar: null, menyu: {}, kim: null, vaqt: null };

  // Номзодлар: тарих ёзувлари + эски усулда (ҳафта бўйича) сақланганлар
  // (8 ҳафтагача орқага — ошпаз шанба куни КЕЙИНГИ ҳафта учун киритган бўлиши мумкин).
  const nomzodlar = (await menyuTarixOl(env)).filter((x) => x.dan <= hafta);
  const oldingi = [hafta];
  for (let i = 1; i <= 8; i++) {
    const d = new Date(kunlarH[0] + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 7 * i);
    oldingi.push(haftaKod(iso(d)));
  }
  const KV = await kvGetMany(env, oldingi.map(MENU));
  for (const h of oldingi) {
    const m = KV.get(MENU(h));
    if (!m || !m.menyu || !Object.values(m.menyu).some((k) => k && (k.tushlik || k.kechki))) continue;
    const kunlar = {};
    for (const [s, k] of Object.entries(m.menyu)) kunlar[haftaKuniRaqam(s)] = k;
    nomzodlar.push({ dan: h, kunlar, kim: m.kim ?? null, vaqt: m.vaqt ?? "" });
  }

  // ҚОИДА: шу ҳафтага энг ЯҚИН (энг кечки «dan») меню амал қилади.
  // Бир ҳафтада иккита бўлса — охирги сақлангани.
  let v = null;
  for (const x of nomzodlar) {
    if (!v || x.dan > v.dan || (x.dan === v.dan && String(x.vaqt || "") > String(v.vaqt || ""))) v = x;
  }
  if (!v) return { hafta, kunlar: kunlarH, menyu: {}, kim: null, vaqt: null };
  const menyu = {};
  for (const s of kunlarH) {
    const k = v.kunlar[haftaKuniRaqam(s)] || {};
    menyu[s] = { tushlik: k.tushlik || "", kechki: k.kechki || "" };
  }
  return { hafta, kunlar: kunlarH, menyu, kim: v.kim ?? null, vaqt: v.vaqt ?? null, dan: v.dan };
}

/** Кечки овқатни кўрмайдиганлар учун менюдан kechki олиб ташланади */
export function ujinsiz(menyu) {
  const r = {};
  for (const [s, k] of Object.entries(menyu || {})) r[s] = { tushlik: (k && k.tushlik) || "" };
  return r;
}

export async function menyuYoz(env, hafta, body, kim, { ujin = true } = {}) {
  const kunlarH = haftaKunlari(hafta);
  const kirdi = body && typeof body.menyu === "object" && body.menyu ? body.menyu : null;
  if (!kunlarH || !kirdi) return { ok: false, xato: "меню бўш" };
  // Кечкини кўрмайдиган одам сақласа — эски кечки овқатлар ЎЧИБ КЕТМАСИН
  const eski = ujin ? {} : (await menyuOl(env, hafta)).menyu;
  const menyu = {};
  const kunlar = {};
  for (const s of kunlarH) {
    const k = kirdi[s] || {};
    menyu[s] = { tushlik: matn(k.tushlik), kechki: ujin ? matn(k.kechki) : matn((eski[s] || {}).kechki) };
    kunlar[haftaKuniRaqam(s)] = menyu[s];
  }
  const vaqt = new Date().toISOString();
  const yozildi = await kvRoyxatYoz(env, MENYU_TARIX,
    (ro) => [...(Array.isArray(ro) ? ro : []).filter((x) => x && x.dan !== hafta), { dan: hafta, kunlar, kim, vaqt }]
      .sort((a, b) => (a.dan < b.dan ? -1 : a.dan > b.dan ? 1 : 0)).slice(-60),
    (ro) => Array.isArray(ro) && ro.some((x) => x && x.dan === hafta && x.vaqt === vaqt));
  if (!yozildi) return { ok: false, xato: "ёзилмади, қайта уриниб кўринг" };
  return { ok: true, hafta, menyu, kim, vaqt, kunlar: kunlarH };
}
