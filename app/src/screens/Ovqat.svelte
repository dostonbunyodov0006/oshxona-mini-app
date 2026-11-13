<script>
  // Ишчи: бугунги овқат + ✅ Ейман / ❌ Емайман. 09:45 гача ўзгартирса бўлади,
  // энг охиргиси қолади. Кечки овқат фақат d.ujin бўлганларга кўринади.
  import { onMount } from "svelte";
  import { api } from "../lib/api.js";
  import { sanaQ, haftaKuni, haftaKod } from "../lib/format.js";
  import { haptic } from "../lib/tg.js";
  import Icon from "../lib/Icon.svelte";
  let { me, xabar, rol, ontarix } = $props();
  // Супер админ ва Админ бўлимида «Ошхона» ичида «Тарих» — ҳар куни неча одамга тушлик/кечки
  const tarixKoradi = $derived((rol === "admin" || rol === "superadmin") && (me.rollar.includes("admin") || me.rollar.includes("superadmin")));
  // Олдиндан овоз (2026-09-15): бугун … шанба — кун танланади, ҳар кун ўша куни 09:45 да ёпилади
  let sana = $state(me.bugun), kunlar = $state([me.bugun]);
  let d = $state(null), xato = $state(""), yuk = $state(""), hafta = $state(null);
  const yukla = () => {
    const s = sana;
    xato = "";
    return api(`/osh/day/${s}`).then((r) => {
      if (s !== sana) return;                  // бошқа кун танланиб бўлган — эски жавоб керак эмас
      d = r;
      if (Array.isArray(r.kunlar) && r.kunlar.length) kunlar = r.kunlar;
    }).catch((e) => { if (s === sana) xato = e.message; });
  };
  // Кун «Ҳафталик меню» рўйхатидан танланади («ҳафта куни устига босиб ўтиб,
  // кейин ейман/емайманни боса олай»). Танлангач экран тепага қайтади — Ейман/Емайман шу ерда.
  async function kunTanla(s) {
    if (s === sana || yuk || !kunlar.includes(s)) return;
    sana = s; yuk = "kun"; haptic();
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
    await yukla();
    yuk = "";
  }
  // Ҳафталик меню — қайси кун қанақа овқат (душанба…шанба)
  onMount(() => { yukla(); api(`/osh/menu/${haftaKod(me.bugun)}`).then((r) => (hafta = r)).catch(() => {}); });

  async function bos(m, t) {
    if (yuk || d.yopiq) return;
    yuk = m + t;
    try {
      await api("/osh/ovoz", { method: "PUT", body: { m, t, sana } });
      d.mening = { ...d.mening, [m === "t" ? "tushlik" : "kechki"]: t };
      xabar(t === "y" ? "✅ Белгиланди: ейман" : "❌ Белгиланди: емайман");
      haptic("medium");
    } catch (e) { xabar(e.message, true); await yukla(); }
    yuk = "";
  }

  /* «Нечта» (1…3 та) ОЛИБ ТАШЛАНДИ:
     «ҳозир ҳамма ўзига ўзи овқат заказ қилвоти» — ҳар ким 1 та. */
  const tanlangan = (m) => (d && d.mening ? d.mening[m === "t" ? "tushlik" : "kechki"] : null);

  // ON/OFF тугмаси ОЛИБ ТАШЛАНДИ: «керак эмас деб ўйлайман —
  // агар у бир жойга кетса, шунчаки Емайманни босади».
</script>

<div class="body">
  <div class="muted" style="font-size:13px;margin-top:-8px">{haftaKuni(sana)}, {sanaQ(sana)}</div>
  {#if xato}
    <button class="note rd" style="width:100%;border:0;text-align:left" onclick={yukla}><Icon name="refresh" size={18} />{xato}</button>
  {:else if !d}
    <div class="spin"></div>
  {:else}
    {#if tarixKoradi && ontarix}
      <button class="rowbtn" onclick={ontarix}><Icon name="clock" size={20} /><span class="mid" style="font-weight:600">Тарих</span><Icon name="chev" size={18} /></button>
    {/if}

    {#if d.yopiq}
      <div class="note"><Icon name="clock" size={18} /><span>09:45 да ёпилди{sana === me.bugun ? " — жавоблар ошпазга кетди. Эртанги кунни белгилаш мумкин." : " — эртага 09:45 гача белгиласа бўлади."}</span></div>
    {/if}

    {#if d.tushlikOvoz === false && !d.ujin}
      <div class="note"><Icon name="info" size={18} /><span>Сиз овоз берувчилар рўйхатида йўқсиз — меню фақат кўриш учун.</span></div>
    {/if}
    {#each [...(d.tushlikOvoz !== false ? [["t", "tushlik", "sun", "Тушлик"]] : []), ...(d.ujin ? [["k", "kechki", "moon", "Кечки овқат"]] : [])] as [m, key, ic, nom] (m)}
      {@const ovqat = d.menyu && d.menyu[key]}
      {@const tanlov = d.mening && d.mening[key]}
      <div class="card" style="gap:8px">
        <div class="muted" style="display:flex;align-items:center;gap:6px;font-size:13px"><Icon name={ic} size={16} />{nom}</div>
        <div style="font-size:20px;font-weight:700;letter-spacing:-.3px">{ovqat || "Меню ҳали киритилмаган"}</div>
        <div class="two" style="margin-top:4px">
          <button class="btn" class:green={tanlov === "y"} class:soft={tanlov !== "y"} disabled={d.yopiq || !!yuk} onclick={() => bos(m, "y")}><Icon name="check" size={18} /> Ейман</button>
          <button class="btn" class:soft={tanlov === "y" || tanlov == null} class:outline={tanlov === "n"} disabled={d.yopiq || !!yuk} onclick={() => bos(m, "n")}><Icon name="x" size={18} /> Емайман</button>
        </div>
      </div>
    {/each}

    {#if hafta}
      <div class="sect"><span>Ҳафталик меню</span></div>
      <div class="card list">
        {#each hafta.kunlar.slice(0, 6) as s (s)}
          {@const k = hafta.menyu[s] || {}}
          {@const bosiladi = kunlar.includes(s)}
          <button class="lrow" style={(s === sana ? "background:var(--ors);" : "") + (bosiladi ? "" : "opacity:.5;")}
                  disabled={!bosiladi || !!yuk} onclick={() => kunTanla(s)}>
            <span class="mid"><span class="t">{haftaKuni(s)}{s === me.bugun ? " · бугун" : ""}</span><span class="s">{sanaQ(s)}</span></span>
            <span class="r" style="align-items:flex-end;text-align:right">
              <span style="display:flex;gap:4px;align-items:center;font-weight:600"><Icon name="sun" size={14} />{k.tushlik || "—"}</span>
              {#if d && d.ujin}<span class="muted" style="display:flex;gap:4px;align-items:center;font-size:13px"><Icon name="moon" size={14} />{k.kechki || "—"}</span>{/if}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>
