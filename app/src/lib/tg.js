// Telegram WebApp кўприги. Telegram'дан ташқарида (Chrome'да синов) localStorage.devInitData
// ишлатилади — сервер барибир имзони текширади, шунинг учун бу айланиб ўтиш эмас.
const WA = () => (window.Telegram && window.Telegram.WebApp) || null;

export function initData() {
  const w = WA();
  if (w && w.initData) return w.initData;
  try { return localStorage.getItem("devInitData") || ""; } catch { return ""; }
}
// Мавзу — Telegram мавзуси бўйича («follow Telegram's theme»); Telegram'дан ташқарида — тизим мавзуси
export function mavzuQoy(t) {
  try { document.documentElement.dataset.theme = t; } catch { /* йўқ */ }
  const w = WA();
  if (!w) return;
  const bg = t === "light" ? "#F7F6F3" : "#141311", bar = t === "light" ? "#FFFFFF" : "#1E1C19";
  try { w.setHeaderColor(bg); w.setBackgroundColor(bg); if (w.setBottomBarColor) w.setBottomBarColor(bar); } catch { /* эски клиент */ }
}
export function mavzu() {
  const w = WA();
  if (w && w.colorScheme) return w.colorScheme === "light" ? "light" : "dark";
  try { return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"; } catch { return "dark"; }
}
export function tgTayyor() {
  const w = WA();
  mavzuQoy(mavzu());
  if (!w) {
    try { window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => mavzuQoy(mavzu())); } catch { /* йўқ */ }
    return;
  }
  try {
    w.ready(); w.expand();
    if (w.disableVerticalSwipes) w.disableVerticalSwipes();
    if (w.onEvent) w.onEvent("themeChanged", () => mavzuQoy(mavzu()));
  } catch { /* эски клиент */ }
}
export function haptic(t = "light") {
  try { WA()?.HapticFeedback?.impactOccurred(t); } catch { /* йўқ */ }
}
