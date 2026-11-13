<script>
  // Ҳисобдаги сонга босилганда — шу куни «Ейман» босганларнинг исмлари.
  // Фақат исмлар — грузчиклар сони кўрсатилмайди. m: "t" — тушлик, "k" — кечки.
  import { onMount } from "svelte";
  import Sheet from "./Sheet.svelte";
  import Icon from "../lib/Icon.svelte";
  import { api } from "../lib/api.js";
  import { sanaQ, haftaKuni } from "../lib/format.js";
  let { sana, m = "t", onclose } = $props();
  let d = $state(null), xato = $state("");
  onMount(() => api(`/osh/kimlar/${sana}`).then((x) => (d = x)).catch((e) => (xato = e.message)));
  const royxat = $derived(d ? (m === "k" ? d.kechki : d.tushlik) : []);
</script>

<Sheet {onclose}>
  <h2 style="display:flex;gap:6px;align-items:center"><Icon name={m === "k" ? "moon" : "sun"} size={18} />{m === "k" ? "Кечки" : "Тушлик"} · {haftaKuni(sana)}, {sanaQ(sana)}</h2>
  {#if xato}
    <div class="note rd"><Icon name="alert" size={18} />{xato}</div>
  {:else if !d}
    <div class="spin"></div>
  {:else}
    <div class="muted" style="font-size:13px">«Ейман» босганлар · <b>{royxat.length}</b> та</div>
    <div class="list card">
      {#each royxat as o, i (o.id)}
        <div class="lrow"><span class="muted" style="width:22px;text-align:right">{i + 1}.</span><span class="mid"><span class="t">{o.ism}</span></span><span>✅</span></div>
      {:else}
        <div class="muted" style="padding:10px 0">Ҳеч ким «Ейман» босмаган</div>
      {/each}
    </div>
  {/if}
</Sheet>
