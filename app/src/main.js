import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

// Мавзу Telegram'дан (colorScheme); ташқарида — тизим мавзуси.
// Биринчи чизишда ҳам тўғри бўлсин — шу сабаб mount'дан олдин.
try {
  const w = window.Telegram && window.Telegram.WebApp;
  const t = w && w.colorScheme
    ? w.colorScheme
    : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.dataset.theme = t === "light" ? "light" : "dark";
} catch { /* йўқ */ }

mount(App, { target: document.getElementById("app") });
