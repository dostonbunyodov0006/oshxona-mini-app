<script>
  // Ошхона тарихи:
  //   • бригадир — ҳар кунга ЎЗИ ЁЗГАН сон (грузчиклар);
  //   • супер админ, админ — ҳар куни неча одамга тушлик ва кечки келгани.
  // Ошхона ишга тушган кундан (15.09) бошлаб, якшанбасиз, энг янгиси тепада.
  import { onMount } from "svelte";
  import { api } from "../lib/api.js";
  import { sanaQ, haftaKuni } from "../lib/format.js";
  import Icon from "../lib/Icon.svelte";
  import Kimlar from "../components/Kimlar.svelte";
  let { me } = $props();
  let r = $state(null), xato = $state("");
  let kim = $state(null);   // сонга босилганда — ким «Ейман» босгани (бригадирда йўқ)
  const yukla = () => { xato = ""; api("/osh/hisob?kun=60").then((x) => (r = x)).catch((e) => (xato = e.message)); };
  onMount(yukla);
  const yakshanba = (s) => new Date(s + "T00:00:00Z").getUTCDay() === 0;
  const son = (v, g) => (v == null ? (g || 0) : v);
  const kunlar = $derived(r ? r.kunlar.filter((d) => !yakshanba(d.sana) && (!r.boshlanish || d.sana >= r.boshlanish)) : []);
</script>

<div class="body">
  {#if xato}
    <button class="note rd" style="width:100%;border:0;text-align:left" onclick={yukla}><Icon name="refresh" size={18} />{xato}</button>
  {:else if !r}
    <div class="spin"></div>
  {:else}
    <div class="card list">
      {#each kunlar as d (d.sana)}
        <div class="lrow" style={d.sana === r.bugun ? "background:var(--ors)" : ""}>
          <span class="mid"><span class="t">{haftaKuni(d.sana)}{d.sana === r.bugun ? " · бугун" : ""}</span><span class="s">{sanaQ(d.sana)}</span></span>
          <span class="r" style="flex-direction:row;gap:16px;align-items:center">
            {#if false}
              <span></span>
            {:else}
              <span style="display:flex;gap:4px;align-items:center"><Icon name="sun" size={14} /><button style="background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;font-weight:700" onclick={() => (kim = { sana: d.sana, m: "t" })}>{d.jami.tushlik ?? 0}</button></span>
              <span style="display:flex;gap:4px;align-items:center"><Icon name="moon" size={14} /><button style="background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;font-weight:700" onclick={() => (kim = { sana: d.sana, m: "k" })}>{d.jami.kechki ?? 0}</button></span>
            {/if}
          </span>
        </div>
      {:else}
        <div class="muted" style="padding:12px 0">—</div>
      {/each}
    </div>
  {/if}
</div>

{#if kim}<Kimlar sana={kim.sana} m={kim.m} onclose={() => (kim = null)} />{/if}

