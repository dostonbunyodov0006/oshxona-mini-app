// app/src/lib/format.js — сана ва ҳафта ёрдамчилари (Ошхона экранлари учун).

export const OYQ = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
export const HAFTA = ["Душанба", "Сешанба", "Чоршанба", "Пайшанба", "Жума", "Шанба", "Якшанба"];

const ikki = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getUTCFullYear()}-${ikki(d.getUTCMonth() + 1)}-${ikki(d.getUTCDate())}`;

/** «2026-09-12» → «12 сен» */
export function sanaQ(s) {
  const t = String(s || "");
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${OYQ[+m[2] - 1]}` : t;
}

export function kunQosh(sana, n) {
  const d = new Date(sana + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

export function haftaKuni(sana) {
  const k = new Date(sana + "T00:00:00Z").getUTCDay();
  return HAFTA[(k + 6) % 7];
}

/** ISO ҳафта коди: «2026-09-14» → «2026-W38» */
export function haftaKod(sana) {
  const d = new Date(sana + "T00:00:00Z");
  const kun = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - kun);
  const y = d.getUTCFullYear();
  return `${y}-W${ikki(Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7))}`;
}

/** «2026-W38» ± n ҳафта */
export function haftaSilj(kod, n) {
  const m = String(kod).match(/^(\d{4})-W(\d{2})$/);
  const jan4 = new Date(Date.UTC(+m[1], 0, 4));
  const k = jan4.getUTCDay() || 7;
  const dush = jan4.getTime() - (k - 1) * 86400000 + (+m[2] - 1 + n) * 7 * 86400000;
  return haftaKod(iso(new Date(dush)));
}

/** Меню экрани қайси ҳафтани очади: ошпаз менюни ШАНБА кечқурун кейинги
 *  ҳафта учун ўзгартиради — шу сабаб шанба ва якшанба КЕЙИНГИ ҳафтани
 *  очади, қолган кунлар шу ҳафтани. */
export function menyuHaftasi(bugun) {
  const k = new Date(bugun + "T00:00:00Z").getUTCDay();
  return k === 6 || k === 0 ? haftaSilj(haftaKod(bugun), 1) : haftaKod(bugun);
}

/** «Бу ҳафта» / «Кейинги ҳафта» / «Ўтган ҳафта» */
export function haftaNomi(kod, bugun) {
  const joriy = haftaKod(bugun);
  if (kod === joriy) return "Бу ҳафта";
  if (kod === haftaSilj(joriy, 1)) return "Кейинги ҳафта";
  if (kod === haftaSilj(joriy, -1)) return "Ўтган ҳафта";
  return "";
}
