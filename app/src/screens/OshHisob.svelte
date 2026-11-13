<script>
  // Ошпаз ҳисоби: ҳар кун (сана, ҳафта куни) — нечта тушлик, нечта кечки.
  // Сон = «Ейман» босганлар + грузчиклар (бригадир ёзган). 09:45 да якунланади.
  import { onMount } from "svelte";
  import { api } from "../lib/api.js";
  import { sanaQ, haftaKuni, haftaKod } from "../lib/format.js";
  import Icon from "../lib/Icon.svelte";
  import Kimlar from "../components/Kimlar.svelte";
  let { me } = $props();
  let r = $state(null), xato = $state(""), menyu = $state({});
  // Сонга босилганда — ким «Ейман» босгани
  let kim = $state(null);
  // «ҳисоб автоматик янгилансин» — ошпаз иловани эрталаб очиб ёпмасдан
  // турса ҳам, кечроқ қўшилган овоз кўринсин. Ҳар 30 сонияда ва илова қайта очилганда
  // (Telegram'га қайтилганда, телефон ёқилганда) сон ўзи янгиланади — экран «сакрамайди».
  const yukla = () => {
    api("/osh/hisob?kun=1").then((x) => {
      r = x; xato = "";
      // ҳар кун ёнида қандай овқатлиги ҳам кўринсин
      api(`/osh/menu/${haftaKod(x.bugun || me.bugun)}`).then((m) => (menyu = m.menyu || {})).catch(() => {});
    }).catch((e) => { if (!r) xato = e.message; });
  };
  onMount(() => {
    yukla();
    const korinsa = () => { if (document.visibilityState === "visible") yukla(); };
    document.addEventListener("visibilitychange", korinsa);
    window.addEventListener("focus", korinsa);
    const t = setInterval(korinsa, 30000);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", korinsa); window.removeEventListener("focus", korinsa); };
  });
  const yakshanba = (s) => new Date(s + "T00:00:00Z").getUTCDay() === 0;
  const son = (v, g) => (v == null ? (g ? g : null) : v);
</script>

<div class="body">
  {#if xato}
    <div class="note rd"><Icon name="alert" size={18} />{xato}</div>
  {:else if !r}
    <div class="spin"></div>
  {:else}
    {@const b = r.kunlar[0]}
    {#if !yakshanba(b.sana)}
      <div class="card" style="gap:12px">
        <div class="row">
          <span class="l" style="font-weight:700">Бугун · {haftaKuni(b.sana)}, {sanaQ(b.sana)}</span>
          {#if r.yopiq}
            <span class="chip gr"><Icon name="check" size={12} /> Якуний</span>
          {:else}
            <span class="chip amb"><Icon name="clock" size={12} /> {r.yopish} гача</span>
          {/if}
        </div>
        <div class="two">
          <div style="display:flex;flex-direction:column;gap:4px">
            <span class="muted" style="font-size:13px;display:flex;gap:4px;align-items:center"><Icon name="sun" size={15} /> Тушлик</span>
            <span class="big"><button style="background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px" onclick={() => (kim = { sana: b.sana, m: "t" })}>{b.jami.tushlik ?? 0}</button> <span style="font-size:15px;font-weight:600">та</span></span>
          </div>
          {#if r.ujin}
            <div style="display:flex;flex-direction:column;gap:4px">
              <span class="muted" style="font-size:13px;display:flex;gap:4px;align-items:center"><Icon name="moon" size={15} /> Кечки</span>
              <span class="big"><button style="background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px" onclick={() => (kim = { sana: b.sana, m: "k" })}>{b.jami.kechki ?? 0}</button> <span style="font-size:15px;font-weight:600">та</span></span>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="sect"><span>Кунлар бўйича</span></div>
    <div class="card list">
      <!-- Фақат ШУ ҲАФТА: душанба … шанба -->
      {#each r.hafta || [] as d (d.sana)}
        {@const ovqat = menyu[d.sana] || {}}
        <div class="lrow" style={d.sana === r.bugun ? "background:var(--ors)" : ""}>
          <span class="mid"><span class="t">{haftaKuni(d.sana)}{d.sana === r.bugun ? " · бугун" : ""}</span><span class="s">{sanaQ(d.sana)}</span></span>
          <span class="r" style="flex-direction:column;gap:4px;align-items:flex-end;min-width:0;max-width:62%">
            <span style="display:flex;gap:4px;align-items:center;max-width:100%"><Icon name="sun" size={14} /><button style="background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;font-weight:700" onclick={() => (kim = { sana: d.sana, m: "t" })}>{d.jami.tushlik ?? 0}</button>{#if ovqat.tushlik}<span class="muted" style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">· {ovqat.tushlik}</span>{/if}</span>
            {#if r.ujin}
              <span style="display:flex;gap:4px;align-items:center;max-width:100%"><Icon name="moon" size={14} /><button style="background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;font-weight:700" onclick={() => (kim = { sana: d.sana, m: "k" })}>{d.jami.kechki ?? 0}</button>{#if ovqat.kechki}<span class="muted" style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">· {ovqat.kechki}</span>{/if}</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if kim}<Kimlar sana={kim.sana} m={kim.m} onclose={() => (kim = null)} />{/if}

