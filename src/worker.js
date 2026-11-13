// src/worker.js — Cloudflare Worker'нинг кириш нуқтаси.
//
//   fetch()      → /api/*  JSON API (src/app/api.js)
//                  /app/*  мини аппнинг статик файллари ([assets])
//                  /       → /app/
//   scheduled()  → cron'лар (wrangler.toml → [triggers]):
//                  «0,20,30 4 * * *» 09:00/09:20/09:30 — эслатма (3 босқич)
//                  «45 4 * * *»      09:45 — якун: ошпазга якуний сон
//                  «50 4 * * *»      09:50 — ЗАХИРА: 09:45 ишламаса қайта уринади
//
// Вақтлар UTC да: Тошкент = UTC+5, демак 04:45 UTC = 09:45 Тошкент.
import { apiIshla } from "./app/api.js";
import { eslatmaYubor, bosqichOl } from "./app/eslatma.js";
import { yakunla, xabarYangila } from "./app/yakun.js";

export default {
  async scheduled(event, env) {
    const cron = event && event.cron;
    const vaqt = (event && event.scheduledTime) || Date.now();

    // 09:45 — якун; 09:50 — ЗАХИРА уриниш: 09:45 да база ёки Telegram жавоб
    // бермаса, ошпаз ўша куни сонни умуман олмай қоларди. Хабар кетган бўлса
    // 09:50 да ҳеч нима қилмайди, фақат сон ўзгарган бўлса хабарни янгилайди.
    if (cron === "45 4 * * *" || cron === "50 4 * * *") {
      try {
        const r = await yakunla(env, vaqt);
        console.log("ошхона якуни:", JSON.stringify(r));
        if (r && r.sabab === "бугун бажарилган") {
          console.log("ошхона хабар:", JSON.stringify(await xabarYangila(env, vaqt)));
        }
      } catch (e) {
        console.error("ошхона якуни:", (e && e.stack) || e);
      }
      return;
    }

    // Эслатма — 09:00 (1-босқич), 09:20 (2-), 09:30 (3-). Крон битта,
    // босқич соат ДАҚИҚАСИДАН аниқланади.
    try {
      const r = await eslatmaYubor(env, vaqt, bosqichOl(vaqt));
      console.log("ошхона эслатмаси:", JSON.stringify(r));
    } catch (e) {
      console.error("ошхона эслатмаси:", (e && e.stack) || e);
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === "/api" || p.startsWith("/api/")) {
      try {
        return await apiIshla(request, env);
      } catch (e) {
        console.error("api:", (e && e.stack) || e);
        return new Response(JSON.stringify({ ok: false, xato: "сервер хатоси" }), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
        });
      }
    }

    if (p === "/") return Response.redirect(new URL("/app/", url).toString(), 302);

    if ((request.method === "GET" || request.method === "HEAD") && (p === "/app" || p.startsWith("/app/"))) {
      if (!env.ASSETS) return new Response("assets binding йўқ", { status: 500 });
      return env.ASSETS.fetch(request);
    }

    return new Response("not found", { status: 404 });
  },
};
