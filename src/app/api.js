// src/app/api.js — /api/* йўллари.
//
// Ҳар сўров Telegram Mini App'нинг initData имзоси билан текширилади
// (tma.js). Имзо BOT_TOKEN билан ҳисобланади, шу сабаб фойдаланувчи
// ўзини бошқа одам деб кўрсатолмайди.
//
// Йўллар:
//   GET  /api/me                  — ким кирди, роллари, бугунги сана
//   GET  /api/osh/day/<сана>      — ўша кун: меню, менинг овозим, жами
//   PUT  /api/osh/ovoz            — «Ейман / Емайман» (body: { m, t, sana })
//   GET  /api/osh/hisob?kun=N     — охирги N кун (ёки шу ҳафта) ҳисоби
//   GET  /api/osh/kimlar/<сана>   — шу куни ким «Ейман» босган (исмлар)
//   GET  /api/osh/menu/<ҳафта>    — ҳафталик меню
//   PUT  /api/osh/menu/<ҳафта>    — менюни сақлаш (фақат ошпаз)
import * as O from "./oshxona.js";
import * as R from "./rollar.js";
import { initDataTekshir } from "./tma.js";

const BOSH = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: BOSH });
const xato = (msg, status = 400) => json({ ok: false, xato: msg }, status);
const natija = (r, status = 400) => (r && r.ok ? json(r) : json({ ...(r || {}), ok: false, xato: (r && r.xato) || "хато" }, status));

async function tana(request) {
  try { return { m: await request.json() }; } catch { return { m: null }; }
}

/** Ошхонага тегишли роллар тўплами */
function rollarniHisobla(uid, cfg) {
  const ichida = (a) => (a || []).map(Number).includes(Number(uid));
  const r = new Set();
  if (ichida(cfg.admins)) r.add("admin");
  if (ichida(cfg.buxgalter)) r.add("buxgalter");
  if (ichida(cfg.cook)) r.add("oshpaz");
  // Ош-ҳисобчи ОШПАЗНИНГ бўлимига киради, лекин унда фақат «Ҳисоб» кўринади
  if (R.oshHisobmi(uid, cfg)) { r.add("oshpaz"); r.add("oshhisobchi"); }
  if (ichida(cfg.brigadir)) r.add("brigadir");
  if (ichida(cfg.ishchi)) r.add("ishchi");
  if (ichida(cfg.developer)) r.add("developer");
  if (ichida(cfg.superadmin)) r.add("superadmin");
  if (ichida(cfg.testers)) r.add("tester");
  return R.yakuniyRollar(uid, r, cfg);
}

export async function apiIshla(request, env) {
  if (!env.BOT_TOKEN) return xato("BOT_TOKEN созланмаган", 500);

  const url = new URL(request.url);
  const yol = url.pathname.replace(/^\/api/, "") || "/";
  const usul = request.method.toUpperCase();
  const q = url.searchParams;

  // ---------- имзо ----------
  const sarlavha = request.headers.get("authorization") || "";
  const initData = sarlavha.startsWith("tma ") ? sarlavha.slice(4) : "";
  if (!initData) return xato("Авторизация йўқ", 401);
  const t = await initDataTekshir(initData, env.BOT_TOKEN);
  if (!t || !t.ok || !t.user || !t.user.id) return xato("Имзо тўғри эмас", 401);

  const uid = Number(t.user.id);
  const cfg = await R.rollarOl(env);
  const rollar = rollarniHisobla(uid, cfg);
  const bor = (...r) => r.some((x) => rollar.has(x));
  const ujin = R.ujinKoradimi(uid, rollar, cfg);

  // ---------- мен ----------
  if (yol === "/me" && usul === "GET") {
    return json({
      ok: true,
      uid,
      ism: R.ismOl(uid) || t.user.first_name || String(uid),
      rollar: [...rollar],
      bugun: O.bugun(),
      ujin,
      // Иловага: «Овқат» бўлими кўринадими (Ейман/Емайман тугмалари бор)
      ovozBeradi: R.ovozBeraOladimi(uid, rollar, "t", cfg) || R.ovozBeraOladimi(uid, rollar, "k", cfg),
      yopish: O.YOPISH_MATN,
    });
  }

  // ---------- кун ----------
  let mm;
  if ((mm = yol.match(/^\/osh\/day\/(\d{4}-\d{2}-\d{2})$/)) && usul === "GET") {
    const sana = mm[1];
    if (!O.sanaMi(sana)) return xato("сана нотўғри");
    if (!bor("oshpaz", "brigadir", "ishchi", "admin", "superadmin", "buxgalter", "tester")) return xato("Рухсат йўқ", 403);
    const [ovozlar, menyu] = await Promise.all([O.ovozlarOl(env, sana), O.menyuOl(env, O.haftaKod(sana))]);
    const k = O.jamla(sana, ovozlar);
    const bugungi = menyu.menyu[sana] || null;
    const men = (m) => {
      const x = ovozlar.find((o) => Number(o.uid) === uid && o.m === m);
      return x ? x.t : null;
    };
    return json({
      ok: true,
      jami: k.jami,
      ovoz: { tushlik: k.tushlik, kechki: k.kechki, yoq: k.yoq },
      ujin,
      mening: { tushlik: men("t"), kechki: ujin ? men("k") : null },
      // Тушлик тугмаси — фақат ҳақиқатан боса оладиганга
      tushlikOvoz: R.ovozBeraOladimi(uid, rollar, "t", cfg),
      sanalar: O.ovozSanalari(),
      kunlar: O.qolganKunlar(),
      yopiq: !O.ovozSanalari().includes(sana),
      yopish: O.YOPISH_MATN,
      menyu: bugungi ? (ujin ? bugungi : { tushlik: bugungi.tushlik || "" }) : null,
    });
  }

  // ---------- овоз ----------
  if (yol === "/osh/ovoz" && usul === "PUT") {
    const { m: f } = await tana(request);
    const m = f && f.m === "k" ? "k" : "t";
    if (!R.ovozBeraOladimi(uid, rollar, m, cfg)) return xato("Сиз овоз берувчилар рўйхатида йўқсиз", 403);
    const sana = f && f.sana ? String(f.sana) : null;
    if (sana && !O.sanaMi(sana)) return xato("сана нотўғри");
    return natija(await O.ovozYoz(env, uid, f, { ujin, sana }));
  }

  // ---------- ҳисоб ----------
  if (yol === "/osh/hisob" && usul === "GET") {
    if (!bor("oshpaz", "oshhisobchi", "admin", "superadmin", "brigadir", "tester")) return xato("Рухсат йўқ", 403);
    const n = Math.min(Math.max(Number(q.get("kun")) || 7, 1), 90);
    // «kun=1» — ошпазнинг кунлик кўриниши: фақат ШУ ҲАФТА (душанба…шанба)
    const kunlar = n === 1 ? await O.haftaHisob(env) : await O.kunlar(env, n);
    return json({
      ok: true, kunlar, bugun: O.bugun(),
      yopiq: O.yopiqmi(), yopish: O.YOPISH_MATN,
    });
  }

  // ---------- ким ейди ----------
  if ((mm = yol.match(/^\/osh\/kimlar\/(\d{4}-\d{2}-\d{2})$/)) && usul === "GET") {
    if (!bor("oshpaz", "oshhisobchi", "admin", "superadmin", "tester")) return xato("Рухсат йўқ", 403);
    const sana = mm[1];
    if (!O.sanaMi(sana)) return xato("сана нотўғри");
    const ovozlar = await O.ovozlarOl(env, sana);
    const royxat = (m) => ovozlar.filter((o) => o.m === m).map((o) => ({
      uid: o.uid, ism: R.ismOl(o.uid) || String(o.uid), t: o.t, auto: Boolean(o.auto), vaqt: o.vaqt,
    }));
    return json({ ok: true, sana, tushlik: royxat("t"), kechki: royxat("k") });
  }

  // ---------- меню ----------
  if ((mm = yol.match(/^\/osh\/menu\/(\d{4}-W\d{2})$/))) {
    const hafta = mm[1];
    if (!O.haftaMi(hafta)) return xato("ҳафта нотўғри");
    if (usul === "GET") {
      const r = await O.menyuOl(env, hafta);
      return json({ ok: true, ...r, menyu: ujin ? r.menyu : O.ujinsiz(r.menyu) });
    }
    if (usul === "PUT") {
      // Менюни ФАҚАТ ошпаз ўзгартиради (ош-ҳисобчи фақат кўради)
      if (R.oshHisobmi(uid, cfg)) return xato("Менюни фақат ошпаз ўзгартиради", 403);
      if (!bor("oshpaz", "tester")) return xato("Фақат ошпаз", 403);
      const { m: f } = await tana(request);
      return natija(await O.menyuYoz(env, hafta, f, uid, { ujin }));
    }
  }

  return xato("Йўл топилмади", 404);
}
