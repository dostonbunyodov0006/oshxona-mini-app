// src/kv.js — Cloudflare KV ёрдамчилари (JSON ўқиш/ёзиш).
//
// Ошхона KV'да фақат шу калитларни ишлатади:
//   app:osh:menyu:tarix          — ҳафталик меню тарихи
//   app:osh:yakun:<сана>         — 09:45 якуни бажарилгани белгиси
//   app:osh:yakun:band:<сана>    — якун ҳозир юриб турибди (2 дақиқа)
//   app:osh:yakun:xabar:<сана>   — ошпазга кетган хабар id си + сонлар
//   app:osh:eslatma:<сана>[:bN]  — эслатма босқичи юборилгани белгиси
//   app:osh:eslatma:xabar:<сана> — юборилган эслатмалар id си
//   app:roles                    — роллар устқуруви

/** JSON калитни ўқийди; йўқ ёки бузуқ бўлса — fallback */
export async function kvGet(env, key, fallback) {
  if (!env.ACCESS_KV) return fallback;
  try {
    const raw = await env.ACCESS_KV.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("kvGet", key, e);
    return fallback;
  }
}

/**
 * Бир нечта калитни БИР ЙЎЛА ўқийди → Map(калит → қиймат).
 *
 * Нега керак: Cloudflare KV'да битта сўров ичида кўпи билан 1 000 амал
 * бажарилади. Меню тарихи 9 ҳафтани текширади — уларни биттадан ўқиш
 * ўрнига KV'нинг кўп калитли ўқишидан (100 тагача) фойдаланилади.
 */
export async function kvGetMany(env, keys, fallback = null) {
  const natija = new Map();
  const noyob = [...new Set(keys)];
  if (!env.ACCESS_KV) {
    for (const k of noyob) natija.set(k, fallback);
    return natija;
  }
  const oqi = (k, raw) => {
    if (raw === null || raw === undefined || raw === "") return fallback;
    if (typeof raw !== "string") return raw;
    try { return JSON.parse(raw); } catch (e) { console.error("kvGetMany", k, e); return fallback; }
  };
  for (let i = 0; i < noyob.length; i += 100) {
    const bolak = noyob.slice(i, i + 100);
    let m = null;
    try {
      const r = await env.ACCESS_KV.get(bolak);
      if (r instanceof Map) m = r;
    } catch { m = null; }
    if (m) {
      for (const k of bolak) natija.set(k, oqi(k, m.get(k)));
    } else {
      for (const k of bolak) {
        let raw = null;
        try { raw = await env.ACCESS_KV.get(k); } catch (e) { console.error("kvGetMany", k, e); }
        natija.set(k, oqi(k, raw));
      }
    }
  }
  return natija;
}

/* ---------- РЎЙХАТНИ ПОЙГАСИЗ ЁЗИШ ----------
   Муаммо: рўйхат «ўқи → ўзгартир → ёз» қилинса, икки одам бир вақтда
   ёзганда иккинчиси биринчисининг ёзувини ЎЧИРИБ юборади. KV'да шартли
   ёзиш (compare-and-swap) йўқ, шунинг учун:
     • битта калитга ёзишлар НАВБАТ билан бажарилади (шу изолят ичида);
     • ёзгандан кейин ўқиб ТЕКШИРИЛАДИ (tayyormi), бўлмаса — яна уринилади.
   amal(ro)    — эски рўйхатдан янгисини қайтаради (тоза функция бўлсин);
   tayyormi(ro) — ёзув жойига тушганини текширади.                      */
const KV_TEKSHIR_MS = 120;
const navbatlar = new Map();

function navbat(key, ish) {
  const oldingi = navbatlar.get(key) || Promise.resolve();
  const hozirgi = oldingi.catch(() => {}).then(ish);
  navbatlar.set(key, hozirgi);
  hozirgi.catch(() => {}).finally(() => {
    if (navbatlar.get(key) === hozirgi) navbatlar.delete(key);
  });
  return hozirgi;
}

export function kvRoyxatYoz(env, key, amal, tayyormi, opt) {
  if (!env.ACCESS_KV) return Promise.reject(new Error("ACCESS_KV binding йўқ"));
  return navbat(key, () => royxatYozBir(env, key, amal, tayyormi, opt));
}

async function royxatYozBir(env, key, amal, tayyormi, { kutish = KV_TEKSHIR_MS } = {}) {
  const uxla = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());
  for (let urinish = 0; urinish < 5; urinish++) {
    const ro = await kvGet(env, key, []);
    if (urinish > 0 && tayyormi(ro)) return true;
    const yangi = JSON.stringify(amal(ro));   // бу ердаги хато — дастур хатоси, қайта уринмаймиз
    try {
      await env.ACCESS_KV.put(key, yangi);
    } catch (e) {
      // KV: бир калитга секундига биттадан ортиқ ёзув — бир оз кутиб яна
      console.warn("kvRoyxatYoz put:", key, e && e.message);
      await uxla(Math.max(kutish, 1) * 4);
      continue;
    }
    await uxla(kutish);
    if (tayyormi(await kvGet(env, key, []))) return true;
    await uxla(kutish + Math.floor(Math.random() * kutish));
  }
  console.error("kvRoyxatYoz: ёзув тасдиқланмади", key);
  return false;
}
