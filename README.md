# 🍽 Oshxona — Telegram Mini App

Ishxona oshxonasi uchun kunlik ovqat hisobi. Xodim ertalab telefonidan
**«Ейман» / «Емайман»** ni bosadi, oshpazga 09:45 da aniq son Telegram'da
boradi — endi hech kim qog'ozga ro'yxat yozib yurmaydi.

Haqiqiy ishlab turgan tizim: 18 xodim, har kuni, 2026-yil sentyabrdan beri.

---

## Nima qiladi

| Vaqt (Toshkent) | Nima bo'ladi |
|---|---|
| **09:00** | Belgilamagan xodimlarga Telegram'da eslatma — bugungi menyu + «Белгилаш» tugmasi |
| **09:20** | Hali belgilamaganlarga 2-eslatma. Oldingi xabar **o'chiriladi** — odamda doim bitta eslatma turadi |
| **09:30** | Oxirgi eslatma: «15 daqiqa qoldi» |
| **09:45** | **Yopiladi.** Bosmaganlar avtomatik «емайди» bo'ladi, oshpazga yakuniy son ketadi |
| 09:50 | Zaxira: 09:45 da xabar ketmagan bo'lsa, yana uriniladi |

Eslatma **faqat hali hech narsa belgilamaganlarga** ketadi — «Ейман» bosganga
ham, «Емайман» bosganga ham bormaydi. Yakshanba — dam olish kuni.

### Boshqa imkoniyatlar

- **Oldindan belgilash** — shu haftaning qolgan kunlariga ham bosib qo'yish
  mumkin. Har kun o'z kuni 09:45 da yopiladi.
- **Haftalik menyu** — oshpaz bir marta kiritadi, keyingi haftalarda ham
  **shu menyu** ko'rinadi (o'zgartirmaguncha). Shanba kuni kiritilgan menyu
  keyingi hafta dushanbasidan boshlanadi, o'tgan kunlar hisobi o'zgarmaydi.
- **Kechki ovqat** — faqat ko'rishga ruxsati bor xodimlarga ko'rinadi.
- **«Kim yeydi»** — oshpaz sondagi raqamga bossa, ismlar ro'yxati chiqadi.
- **Ikkinchi akkaunt** — bir odamning ikkita Telegram akkaunti bo'lsa, eslatma
  ikkisiga ham boradi va ikkisidan ham belgilay oladi, lekin hisobda **bitta**
  bo'ladi (ovoz doim asosiy akkaunt nomiga yoziladi).
- **Xabar o'zini yangilaydi** — 09:45 dan keyin son o'zgarsa (kechikkan ovoz
  qo'lda qo'shilsa), oshpazga yangi xabar yuborilmaydi: o'sha xabarning o'zi
  tahrirlanadi, oshpazda eski son qolib ketmaydi.

---

## Qanday qurilgan

```
Telegram  ──initData──▶  Cloudflare Worker  ──▶  D1 (SQL)   ovozlar
  Mini App                 (src/worker.js)   ──▶  KV         menyu, belgilar
 (Svelte 5)                      │
                                 └──sendMessage──▶  Telegram  (eslatma, yakun)
```

| Fayl | Vazifasi |
|---|---|
| `src/worker.js` | Kirish nuqtasi: `fetch` (API + statik) va `scheduled` (cron'lar) |
| `src/app/oshxona.js` | **Yurak**: ovozlar, kunlik hisob, haftalik menyu |
| `src/app/eslatma.js` | 09:00 / 09:20 / 09:30 eslatmasi — 3 bosqich |
| `src/app/yakun.js` | 09:45 yakuni: avto «емайди» + oshpazga xabar |
| `src/app/rollar.js` | Kim nima qila oladi |
| `src/app/api.js` | `/api/*` yo'llari |
| `src/app/tma.js` | Telegram `initData` imzosini tekshirish |
| `src/app/tgapi.js` | Telegram Bot API (429 da kutib qayta urinadi) |
| `src/kv.js` | KV yordamchilari + poygasiz ro'yxat yozish |
| `app/src/screens/` | Svelte ekranlari: Ovqat, Menyu, Hisob, Tarix |

### Yechilgan ikkita qiziq muammo

**1. Ovozlar bir-birini o'chirib yuborardi.** Avval bir kunning hamma ovozi
KV'da bitta ro'yxat edi: «o'qi → qo'sh → yoz». Ikki odam bir vaqtda bosganda
ikkinchisi birinchisining ovozini o'chirib yuborardi — bir kuni 5 kishining
oldindan bergan ovozi yo'qoldi. Yechim: har odamning har kungi har ovqati D1
da **alohida qator**, kaliti `PRIMARY KEY (sana, uid, m)`.

**2. Ikkita eslatma yonma-yon turardi.** 09:00 va 09:20 dagi xabarlar chatda
birga qolib, odam qaysi biri yangi ekanini bilmasdi. Yechim: har bosqich
oldingisining `message_id` sini KV da saqlab, `deleteMessage` bilan o'chiradi.

---

## ⚠️ Xavfsizlik haqida

Bu repozitoriyda **haqiqiy ma'lumot yo'q**:

- Telegram ID lar — **soxta** (`100000001`, `100000002`, …). Haqiqiylari
  yo'q. Ishlatish uchun `src/app/rollar.js` dagi raqamlarni o'zingizning
  ID laringizga almashtiring (yoki KV'dagi `app:roles` kalitidan qo'shing —
  deploy qilish shart emas).
- Cloudflare account / KV / D1 id lari — `wrangler.toml` da **soxta**.
- `BOT_TOKEN` koddа **yo'q** va hech qachon bo'lmaydi: u Cloudflare secret
  (`wrangler secret put BOT_TOKEN`), lokalda esa `.dev.vars` — u `.gitignore` da.
- Ma'lumotlar bazasi (kim qachon ovqat yegani) **chiqarilmagan**.

Har bir API so'rovi Telegram'ning `initData` imzosi bilan tekshiriladi
(`src/app/tma.js`) — imzo `BOT_TOKEN` bilan hisoblanadi, shuning uchun
foydalanuvchi o'zini boshqa odam deb ko'rsatolmaydi.

---

## Ishga tushirish

```bash
# 1) Kutubxonalar
npm install && npm --prefix app install

# 2) O'z Cloudflare resurslaringiz
npx wrangler kv namespace create ACCESS_KV
npx wrangler d1 create oshxona
#    → chiqqan id larni wrangler.toml ga yozing

# 3) Jadval
npx wrangler d1 migrations apply oshxona --remote

# 4) Bot tokeni (koddа saqlanmaydi)
npx wrangler secret put BOT_TOKEN

# 5) rollar.js dagi soxta ID larni o'zingizning ID laringizga almashtiring
#    va wrangler.toml dagi APP_URL ni to'g'rilang

# 6) Deploy
npx wrangler deploy
```

Keyin @BotFather da botga Mini App tugmasini qo'shasiz va `APP_URL` ni
ko'rsatasiz.

### Sinovlar

```bash
npm test
```

58 ta tekshiruv: sana/hafta hisobi, 09:45 yopilishi, rollar, 3 bosqichli
eslatma matni, `initData` imzosi (buzilgan imzo o'tmasligi ham).

---

## Litsenziya

Ko'rish va o'rganish uchun ochiq. Nusxalash, qayta ishlatish yoki
o'zgartirib tarqatish — faqat muallifning yozma roziligi bilan.
Batafsil: [LICENSE](LICENSE).
