<script>
  // Ошхона мини аппи. Ролга қараб бўлимлар кўринади:
  //   • ишчи/админ        → «Овқат» (Ейман / Емайман)
  //   • ошпаз             → «Меню» + «Ҳисоб»
  //   • ош-ҳисобчи        → фақат «Ҳисоб»
  //   • админ/супер админ → «Тарих» ҳам
  import { onMount } from "svelte";
  import { api } from "./lib/api.js";
  import { tgTayyor, haptic } from "./lib/tg.js";
  import Icon from "./lib/Icon.svelte";
  import Ovqat from "./screens/Ovqat.svelte";
  import Menyu from "./screens/Menyu.svelte";
  import OshHisob from "./screens/OshHisob.svelte";
  import OshTarix from "./screens/OshTarix.svelte";

  let me = $state(null);
  let xato = $state("");
  let faol = $state("");
  let toast = $state(null);

  const bor = (...r) => Boolean(me) && r.some((x) => me.rollar.includes(x));

  const bolimlar = $derived(!me ? [] : [
    ...(me.ovozBeradi ? [{ id: "ovqat", nom: "Овқат", ikon: "sun" }] : []),
    ...(bor("oshpaz") ? [{ id: "menyu", nom: "Меню", ikon: "bowl" }] : []),
    ...(bor("oshpaz", "oshhisobchi") ? [{ id: "hisob", nom: "Ҳисоб", ikon: "chart" }] : []),
    ...(bor("admin", "superadmin") ? [{ id: "tarix", nom: "Тарих", ikon: "clock" }] : []),
  ]);

  /** Экранлар шуни чақиради: қисқа хабар кўрсатиш */
  function xabar(matn, xatomi = false) {
    toast = { matn, xatomi };
    setTimeout(() => (toast = null), 2600);
  }

  function tanla(id) {
    if (id === faol) return;
    faol = id;
    haptic();
    try { window.scrollTo({ top: 0 }); } catch { /* йўқ */ }
  }

  onMount(async () => {
    tgTayyor();
    try {
      me = await api("/me");
      faol = bolimlar.length ? bolimlar[0].id : "";
    } catch (e) {
      xato = e.message;
    }
  });
</script>

<div class="app">
  <div class="top">
    <div class="tt">
      <h1>🍽 Ошхона</h1>
      {#if me}<div class="sub">{me.ism}</div>{/if}
    </div>
  </div>

  {#if xato}
    <div class="body"><div class="note rd"><Icon name="info" size={18} /><span>{xato}</span></div></div>
  {:else if !me}
    <div class="body"><div class="spin"></div></div>
  {:else if !bolimlar.length}
    <div class="body">
      <div class="note"><Icon name="info" size={18} /><span>Сизга Ошхона бўлими очилмаган. Раҳбарга мурожаат қилинг.</span></div>
    </div>
  {:else}
    {#if faol === "ovqat"}
      <Ovqat {me} {xabar} rol={bor("superadmin") ? "superadmin" : bor("admin") ? "admin" : "ishchi"}
             ontarix={bolimlar.some((b) => b.id === "tarix") ? () => tanla("tarix") : null} />
    {:else if faol === "menyu"}
      <Menyu {me} {xabar} edit={true} />
    {:else if faol === "hisob"}
      <OshHisob {me} />
    {:else if faol === "tarix"}
      <OshTarix {me} />
    {/if}

    {#if bolimlar.length > 1}
      <div class="tabbar">
        {#each bolimlar as b (b.id)}
          <button class:on={faol === b.id} onclick={() => tanla(b.id)}>
            <Icon name={b.ikon} size={20} />{b.nom}
          </button>
        {/each}
      </div>
    {/if}
  {/if}

  {#if toast}<div class="toast" class:rd={toast.xatomi}>{toast.matn}</div>{/if}
</div>
