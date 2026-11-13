// src/app/rollar.js — ким нима қила олади.
//
// ⚠️ ДИҚҚАТ: бу файлдаги ҳамма Telegram ID — СОХТА (намуна учун).
//    Ҳақиқий ID лар бу репозиторийда ЙЎҚ. Ўзингизда ишлатиш учун
//    қуйидаги рақамларни ўз жамоангизнинг ID лари билан алмаштиринг
//    (ёки KV'даги app:roles калитидан қўшиб кетинг — деплой керак эмас).
//
// Иккита манба бор:
//   1) ASOS — шу файлдаги рўйхат (деплойдан кейин дарров ишлайди);
//   2) KV app:roles — устқурув (код ўзгармасдан одам қўшиш).
// Иккиси ҚЎШИЛАДИ.
import { kvGet } from "../kv.js";

const KEY = "app:roles";

/** Фақат бутун, мусбат ID лар; такрорсиз; кўпи билан 60 та */
const L = (a) => [...new Set((Array.isArray(a) ? a : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 60);

/* ---------- ИСМЛАР (намуна) ----------
   Иловада ва хабарларда кўринадиган исмлар. Рўйхатда бўлмаса —
   Telegram'даги first_name ишлатилади.                               */
export const ISM = {
  100000001: "Достон",
  100000002: "Руслан",
  100000003: "Сардор ака",
  100000004: "Мурод ака",
  100000005: "Хуршид ака",
  100000006: "Хусниддин",
  100000007: "Мамур ака",
  100000008: "Абдувоҳид",
  100000009: "Дилшод ака",
  100000010: "Асрор ака",
  100000011: "Рамзиддин",
  100000012: "Аброр ака",
  100000013: "Илҳом",
  100000014: "Дилмурод",
  100000015: "Пўлат",
  100000016: "Феруза",
  100000017: "Дилдора",
  100000018: "Комолиддин",
  100000020: "Иброҳим (ошпаз)",
  100000022: "Ҳамид ака",
};

/* ---------- РОЛЛАР ---------- */

/** Тушлик + кечки овқатни кўради ва иккисига ҳам овоз беради */
export const UJIN_KORADI = [100000002];
/** ФАҚАТ кечки: тушлиги умумий сонда — унга тушлик тугмаси кўринмайди */
export const FAQAT_UJIN = [100000018];
/** «Ошпаз» бўлимида ФАҚАТ «Ҳисоб»ни кўради: менюни ўзгартирмайди, овоз бермайди */
export const OSHPAZ_HISOB = [100000022];
export const SUPERADMIN = [100000003, 100000001];
export const DEVELOPER = [100000001, 100000002];

const ASOS = {
  superadmin: SUPERADMIN,
  developer: DEVELOPER,
  ujin: UJIN_KORADI,
  faqatUjin: FAQAT_UJIN,
  oshHisob: OSHPAZ_HISOB,
  testers: [100000001, 100000002],
  cook: [100000020],                           // ошпаз — менюни киритади, якуний сонни олади
  admins: [100000004, 100000005],
  // Бухгалтерия бўлимида ҳам «Ошхона» кўринади
  buxgalter: [100000016, 100000017],
  // Бригадир — грузчикларнинг бошлиғи; у ҳам ўзи «Ейман/Емайман» босади
  brigadir: [100000006],
  /** ✅ Ейман / ❌ Емайман босадиган ишчилар */
  ishchi: [
    100000007, 100000006, 100000008, 100000009, 100000010,
    100000011, 100000012, 100000003, 100000013, 100000005,
    100000004, 100000002, 100000014, 100000015, 100000016,
    100000017, 100000001,
  ],
};

const asosli = (nom, kv) => L([...(ASOS[nom] || []), ...(Array.isArray(kv) ? kv : [])]);

/** Рўйхат: cfg (rollarOl натижаси) берилса — ундан, бўлмаса — коддаги асос */
const ro = (cfg, k) => ((cfg && Array.isArray(cfg[k])) ? cfg[k] : (ASOS[k] || [])).map(Number);

export const faqatUjinmi = (uid, cfg) => ro(cfg, "faqatUjin").includes(Number(uid));
export const oshHisobmi = (uid, cfg) => ro(cfg, "oshHisob").includes(Number(uid));
const ujinOvoz = (uid, cfg) => ro(cfg, "ujin").includes(Number(uid)) || faqatUjinmi(uid, cfg);

/** Кечки овқат кўринадими: ўзи кечки рўйхатида бўлса ёки ошпаз/ош-ҳисобчи бўлса */
export const ujinKoradimi = (uid, rollar, cfg) =>
  ujinOvoz(uid, cfg) ||
  Boolean(rollar && rollar.has && (rollar.has("oshpaz") || rollar.has("oshhisobchi")));

/* КИМ ОВОЗ БЕРА ОЛАДИ
 *   • ошпаз — ҳеч қачон (менюни у ёзади);
 *   • тушлик — ишчилар (бригадир ҳам) ва админлар;
 *   • кечки — фақат кечкини кўрадиганлар;
 *   • «фақат кечки» одамга тушлик тугмаси йўқ.                        */
export function ovozBeraOladimi(uid, rollar, m, cfg) {
  const has = (r) => Boolean(rollar && rollar.has && rollar.has(r));
  if (has("oshpaz") || ro(cfg, "cook").includes(Number(uid))) return false;
  if (!has("ishchi") && !has("admin")) return false;
  if (m === "t" && faqatUjinmi(uid, cfg)) return false;
  return m === "k" ? ujinOvoz(uid, cfg) : m === "t";
}

/** Бригадирга илова фақат «Бригадир» бўлимини кўрсатади (ичида Ошхона) */
export function yakuniyRollar(uid, rollar, cfg) {
  if (!ro(cfg, "brigadir").includes(Number(uid))) return rollar;
  const r = new Set(["brigadir"]);
  if (rollar.has("ishchi")) r.add("ishchi");
  return r;
}

/* Супер админ, админ, программист ва бухгалтер — ОШХОНАГА ҳам автоматик
 * қўшилади: янги раҳбар қўшилганда унга ҳам овқат белгилаш кўриниши керак. */
const AVTO_ISHCHI = ["superadmin", "admins", "developer", "buxgalter"];

function birlashtir(r) {
  const faqatUjin = asosli("faqatUjin", r.faqatUjin);
  const avto = AVTO_ISHCHI.flatMap((k) => (Array.isArray(r[k]) ? r[k] : []));
  return {
    testers: asosli("testers", r.testers).filter((id) => ASOS.testers.includes(id)),
    admins: asosli("admins", r.admins),
    cook: asosli("cook", r.cook),
    brigadir: asosli("brigadir", r.brigadir),
    // «Фақат кечки» одамлар ҳам ишчи (овоз бериш учун) — тушлик тугмаси уларга йўқ
    ishchi: asosli("ishchi", [...(Array.isArray(r.ishchi) ? r.ishchi : []), ...faqatUjin, ...avto]),
    buxgalter: asosli("buxgalter", r.buxgalter),
    ujin: asosli("ujin", r.ujin),
    faqatUjin,
    oshHisob: asosli("oshHisob", r.oshHisob),
    superadmin: asosli("superadmin", r.superadmin),
    developer: asosli("developer", r.developer),
  };
}

/** KV устқуруви + коддаги асос */
export async function rollarOl(env) {
  return birlashtir((await kvGet(env, KEY, null)) || {});
}

/** Иловада кўрсатиш учун: ID → исм */
export function ismOl(uid) {
  return ISM[Number(uid)] || null;
}
