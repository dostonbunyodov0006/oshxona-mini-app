// tests/hammasi.mjs — синовлар. Ишга тушириш: `npm test`
//
// Бу ерда ТОЗА функциялар синалади (сана/ҳафта ҳисоби, роллар, эслатма
// матни, imzo). D1 ва Telegram керак бўлган қисмлар (ovozYoz, yakunla,
// eslatmaYubor) бу синовга кирмайди — улар `wrangler dev` да текширилади.
import * as O from "../src/app/oshxona.js";
import * as R from "../src/app/rollar.js";
import * as E from "../src/app/eslatma.js";
import * as Y from "../src/app/yakun.js";
import { initDataYasa, initDataTekshir } from "../src/app/tma.js";

let otdi = 0, yiqildi = 0;
function C(nom, shart, izoh = "") {
  if (shart) { otdi++; console.log("  ✓", nom); }
  else { yiqildi++; console.log("  ✗", nom, izoh ? "→ " + izoh : ""); }
}

/** Тошкент вақти бўйича Date.now() қиймати: кун + соат:дақиқа */
const T = (kun, soat, daqiqa = 0) => Date.UTC(2026, 8, kun, soat - 5, daqiqa);   // сентябр 2026

console.log("\n── 1. Сана ва ҳафта ──");
C("haftaKod: 14.09.2026 (душанба) → 2026-W38", O.haftaKod("2026-09-14") === "2026-W38", O.haftaKod("2026-09-14"));
C("haftaKod: 20.09.2026 (якшанба) → 2026-W38", O.haftaKod("2026-09-20") === "2026-W38", O.haftaKod("2026-09-20"));
C("haftaKod: 21.09.2026 → 2026-W39", O.haftaKod("2026-09-21") === "2026-W39", O.haftaKod("2026-09-21"));
C("haftaKunlari: 7 кун, душанбадан", (() => {
  const k = O.haftaKunlari("2026-W38");
  return k.length === 7 && k[0] === "2026-09-14" && k[6] === "2026-09-20";
})());
C("haftaKunlari: нотўғри код → null", O.haftaKunlari("2026-38") === null);
C("sanaMi", O.sanaMi("2026-09-14") && !O.sanaMi("14.09.2026") && !O.sanaMi("2026-13-40"));
C("haftaMi", O.haftaMi("2026-W38") && !O.haftaMi("2026-38"));
C("bugun: Тошкент куни (UTC+5)", O.bugun(Date.UTC(2026, 8, 14, 20, 0)) === "2026-09-15", O.bugun(Date.UTC(2026, 8, 14, 20, 0)));

console.log("\n── 2. Овоз бериш вақти ──");
C("09:44 — очиқ", !O.yopiqmi(T(14, 9, 44)));
C("09:45 — ЁПИҚ", O.yopiqmi(T(14, 9, 45)));
C("10:00 — ёпиқ", O.yopiqmi(T(14, 10, 0)));
C("якшанба (20.09) — ҳар доим ёпиқ", O.yakshanbami(T(20, 8)) && O.yopiqmi(T(20, 8)));
C("qolganKunlar: сешанба (15.09) → 15…19 + шанба", (() => {
  const k = O.qolganKunlar(T(15, 9));
  return k[0] === "2026-09-15" && k[k.length - 1] === "2026-09-19";
})(), JSON.stringify(O.qolganKunlar(T(15, 9))));
C("qolganKunlar: якшанба → бўш", O.qolganKunlar(T(20, 9)).length === 0);
C("ovozSanalari: 09:30 да бугун ҳам бор", O.ovozSanalari(T(15, 9, 30)).includes("2026-09-15"));
C("ovozSanalari: 09:45 дан кейин бугун ЙЎҚ, эртага БОР", (() => {
  const s = O.ovozSanalari(T(15, 10));
  return !s.includes("2026-09-15") && s.includes("2026-09-16");
})(), JSON.stringify(O.ovozSanalari(T(15, 10))));

console.log("\n── 3. Санаш ──");
const ovozlar = [
  { uid: 1, m: "t", t: "y" }, { uid: 2, m: "t", t: "y" }, { uid: 3, m: "t", t: "n" },
  { uid: 4, m: "k", t: "y" }, { uid: 5, m: "k", t: "n" },
];
C("sanoq: тушлик 2 ҳа / 1 йўқ", (() => { const s = O.sanoq(ovozlar); return s.tushlik.ha === 2 && s.tushlik.yoq === 1; })());
C("sanoq: кечки 1 ҳа / 1 йўқ", (() => { const s = O.sanoq(ovozlar); return s.kechki.ha === 1 && s.kechki.yoq === 1; })());
C("jamla: jami.tushlik = 2", O.jamla("2026-09-14", ovozlar).jami.tushlik === 2);
C("jamla: бўш кун → null", O.jamla("2026-09-14", []).jami.tushlik === null);
C("ujinsiz: kechki олиб ташланади", (() => {
  const m = O.ujinsiz({ "2026-09-14": { tushlik: "Мастава", kechki: "Шовла" } });
  return m["2026-09-14"].tushlik === "Мастава" && m["2026-09-14"].kechki === undefined;
})());

console.log("\n── 4. Роллар ──");
const CFG = {
  ishchi: [100000001, 100000002, 100000018], cook: [100000020], oshHisob: [100000022],
  ujin: [100000002], faqatUjin: [100000018], brigadir: [100000006],
  admins: [100000004], superadmin: [100000003], buxgalter: [], developer: [], testers: [],
};
const ISHCHI = new Set(["ishchi"]);
C("тушлик: оддий ишчи боса олади", R.ovozBeraOladimi(100000001, ISHCHI, "t", CFG));
C("кечки: оддий ишчи боса ОЛМАЙДИ", !R.ovozBeraOladimi(100000001, ISHCHI, "k", CFG));
C("кечки: кечкини кўрадиган боса олади", R.ovozBeraOladimi(100000002, ISHCHI, "k", CFG));
C("«фақат кечки» одам ТУШЛИКНИ боса олмайди", !R.ovozBeraOladimi(100000018, ISHCHI, "t", CFG));
C("«фақат кечки» одам КЕЧКИНИ боса олади", R.ovozBeraOladimi(100000018, ISHCHI, "k", CFG));
C("ошпаз овоз бермайди", !R.ovozBeraOladimi(100000020, new Set(["oshpaz", "ishchi"]), "t", CFG));
C("рўйхатда йўқ одам овоз бермайди", !R.ovozBeraOladimi(999, new Set(), "t", CFG));
C("ujinKoradimi: ошпаз кечкини кўради", R.ujinKoradimi(100000020, new Set(["oshpaz"]), CFG));
C("oshHisobmi: ош-ҳисобчи", R.oshHisobmi(100000022, CFG) && !R.oshHisobmi(100000001, CFG));
C("yakuniyRollar: бригадирда фақат бригадир + ишчи", (() => {
  const r = R.yakuniyRollar(100000006, new Set(["ishchi", "buxgalter"]), CFG);
  return r.has("brigadir") && r.has("ishchi") && !r.has("buxgalter");
})());
C("kutilganlar: ошпаз четда", !Y.kutilganlar({ ...CFG, ishchi: [...CFG.ishchi, 100000020] }, "t").includes(100000020));

console.log("\n── 5. Эслатма: 3 босқич ──");
C("bosqichOl: 09:00 → 1", E.bosqichOl(T(14, 9, 0)) === 1);
C("bosqichOl: 09:20 → 2", E.bosqichOl(T(14, 9, 20)) === 2);
C("bosqichOl: 09:30 → 3", E.bosqichOl(T(14, 9, 30)) === 3);
C("kerakliOvqatlar: оддий ишчи → ['t']", JSON.stringify(E.kerakliOvqatlar(100000001, CFG)) === '["t"]');
C("kerakliOvqatlar: кечкини кўрадиган → ['t','k']", JSON.stringify(E.kerakliOvqatlar(100000002, CFG)) === '["t","k"]');
C("kerakliOvqatlar: фақат кечки → ['k']", JSON.stringify(E.kerakliOvqatlar(100000018, CFG)) === '["k"]');
const menyu = { tushlik: "Мастава", kechki: "Шовла" };
C("1-босқич матни: «Ҳайрли тонг»", /Ҳайрли тонг/.test(E.ishchiMatni(menyu, false, false, 1)));
C("2-босқич матни: «ҳали белгиламадингиз» + 25 дақиқа", (() => {
  const t = E.ishchiMatni(menyu, false, false, 2);
  return /ҳали белгиламадингиз/.test(t) && /25 дақиқа/.test(t);
})());
C("3-босқич матни: «Охирги эслатма» + 15 дақиқа", (() => {
  const t = E.ishchiMatni(menyu, false, false, 3);
  return /Охирги эслатма/.test(t) && /15 дақиқа/.test(t);
})());
C("матнда тушлик бор, кечки кўринмайди", (() => {
  const t = E.ishchiMatni(menyu, false, false, 1);
  return t.includes("Мастава") && !t.includes("Шовла");
})());
C("кечкини кўрадиганга иккиси ҳам", (() => {
  const t = E.ishchiMatni(menyu, true, false, 1);
  return t.includes("Мастава") && t.includes("Шовла");
})());
C("appHavola: ?bolim=ovqat", E.appHavola({ APP_URL: "https://x.dev/app" }, "ovqat") === "https://x.dev/app/?bolim=ovqat",
  E.appHavola({ APP_URL: "https://x.dev/app" }, "ovqat"));

console.log("\n── 6. Ошпаз хабари ──");
C("oshpazMatni: кун номи ва сонлар", (() => {
  const t = Y.oshpazMatni("2026-09-14", { tushlik: 9, kechki: 1 });
  return t.includes("Душанба") && t.includes("14.09.2026") && t.includes("9 та") && t.includes("1 та");
})(), Y.oshpazMatni("2026-09-14", { tushlik: 9, kechki: 1 }).replace(/\n/g, " | "));

console.log("\n── 7. initData имзоси ──");
{
  const TOKEN = "123456:TEST-TOKEN-NAMUNA";
  const user = { id: 100000001, first_name: "Достон" };
  const initData = await initDataYasa(user, TOKEN);
  const t1 = await initDataTekshir(initData, TOKEN);
  C("тўғри имзо ўтади", Boolean(t1 && t1.ok && Number(t1.user.id) === 100000001));
  const t2 = await initDataTekshir(initData, "boshqa:TOKEN");
  C("бошқа токен билан ЎТМАЙДИ", !(t2 && t2.ok));
  const t3 = await initDataTekshir(initData.replace("100000001", "100000002"), TOKEN);
  C("id ўзгартирилса ЎТМАЙДИ", !(t3 && t3.ok));
  const t4 = await initDataTekshir("", TOKEN);
  C("бўш initData ЎТМАЙДИ", !(t4 && t4.ok));
}

console.log(`\n${yiqildi === 0 ? "✅" : "❌"} ${otdi}/${otdi + yiqildi} синов ўтди`);
process.exit(yiqildi === 0 ? 0 : 1);
