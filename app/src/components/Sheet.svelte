<script>
  // Пастдан чиқадиган варақ (дизайндаги sheet): қоплама + тутқич. Ёпиш — қопламага босиш ёки Escape.
  let { onclose, children } = $props();
  /* Фақат қопламанинг ЎЗИДА бошланиб, ўзида тугаган босиш ёпади (Руслан 2026-10-25, телефон хатоси):
   * катакка босилганда варақ ичи қисқариб силжиса, телефон «click»ни бармоқ турган жойга — қопламага
   * юборарди ва варақ ўзи ёпилиб қоларди. */
  let qoplamadaBoshlandi = false;
  function bosildi(e) {
    if (qoplamadaBoshlandi && e.target === e.currentTarget) onclose();
    qoplamadaBoshlandi = false;
  }
</script>

<div class="overlay" onpointerdown={(e) => (qoplamadaBoshlandi = e.target === e.currentTarget)} onclick={bosildi} onkeydown={(e) => e.key === "Escape" && onclose()} role="presentation">
  <div class="sheet" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
    <div class="handle"></div>
    {@render children()}
  </div>
</div>
