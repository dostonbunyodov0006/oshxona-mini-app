import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// base "/app/" + outDir "dist/app": файллар app/dist/app/... га тушади, Worker'нинг
// [assets] қатлами уларни /app/... манзилида ҳеч қандай қайта ёзувсиз беради.
export default defineConfig({
  plugins: [svelte()],
  base: "/app/",
  build: { outDir: "dist/app", emptyOutDir: true, target: "es2020" },
});
