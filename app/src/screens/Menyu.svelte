<script>
  import { api } from "../lib/api.js";
  import { sanaQ, haftaKuni, haftaKod, haftaSilj, kunQosh, menyuHaftasi, haftaNomi } from "../lib/format.js";
  import { haptic } from "../lib/tg.js";
  import Icon from "../lib/Icon.svelte";
  let { me, xabar, edit = false } = $props();
  const ertaga = kunQosh(me.bugun, 1);
  let hafta = $state(menyuHaftasi(me.bugun)), d = $state(null), xato = $state(""), yuk = $state(false), soni = $state({});
  let m = $state({});
  $effect(() => {
    const h = hafta;
    d = null;
    api(`/osh/menu/${h}`).then((r) => { d = r; const mm = {}; for (const s of r.kunlar) mm[s] = { tushlik: (r.menyu[s] || {}).tushlik || "", kechki: (r.menyu[s] || {}).kechki || "" }; m = mm; }).catch((e) => (xato = e.message));
  });
  api("/osh/hisob?kun=21").then((r) => { const s = {}; for (const k of r.kunlar) if (k.tushlik != null) s[k.sana] = k; soni = s; }).catch(() => {});
  async function saqla() {
    yuk = true;
    try { await api(`/osh/menu/${hafta}`, { method: "PUT", body: { menyu: m } }); xabar("Сақланди ✓"); haptic("medium"); }
    catch (e) { xabar(e.message, true); }
    yuk = false;
  }
</script>

<div class="body">
  <div class="chips" style="justify-content:space-between;flex-wrap:nowrap">
    <button class="chip" onclick={() => (hafta = haftaSilj(hafta, -1))}><Icon name="back" size={14} /> олдинги</button>
    <span class="chip on" style="flex-direction:column;height:auto;padding:6px 12px;line-height:1.2">
      {#if haftaNomi(hafta, me.bugun)}<b style="font-size:12px">{haftaNomi(hafta, me.bugun)}</b>{/if}
      <span>{d ? `${sanaQ(d.kunlar[0])} – ${sanaQ(d.kunlar[5])}` : hafta}</span>
    </span>
    <button class="chip" onclick={() => (hafta = haftaSilj(hafta, 1))}>кейинги <Icon name="chev" size={14} /></button>
  </div>
  {#if xato}
    <div class="note rd"><Icon name="alert" size={18} />{xato}</div>
  {:else if !d}
    <div class="spin"></div>
  {:else}
    {#each d.kunlar.slice(0, 6) as s (s)}   <!-- душанба…шанба, якшанба — дам -->
      {#if edit || s >= me.bugun || m[s].tushlik || m[s].kechki}
      <div class="dayc" class:hl={s === ertaga}>
        <div class="dh"><span>{haftaKuni(s)} · {sanaQ(s)}{s === ertaga ? " · эртага" : s === me.bugun ? " · бугун" : ""}</span>
          {#if soni[s]}<span class="chip muted"><Icon name="sun" size={12} /> {soni[s].jami.tushlik}{#if d.ujin} <Icon name="moon" size={12} /> {soni[s].jami.kechki}{/if}</span>{/if}</div>
        <!-- Ҳар бир майдон устида доимий ёзув: овқат ёзилгач placeholder йўқолиб,
             қайси бири тушлик, қайси бири кечки — билинмай қоларди (Достон 2026-09-14) -->
        <div class="two">
          <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
            <span class="muted" style="font-size:12px;display:flex;gap:4px;align-items:center"><Icon name="sun" size={13} /> Тушлик</span>
            {#if edit}<input class="cellin" placeholder="Тушлик овқати" bind:value={m[s].tushlik} />
            {:else}<div class="dv" class:e={!m[s].tushlik}>{m[s].tushlik || "…"}</div>{/if}
          </div>
          {#if d.ujin}
            <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
              <span class="muted" style="font-size:12px;display:flex;gap:4px;align-items:center"><Icon name="moon" size={13} /> Кечки</span>
              {#if edit}<input class="cellin" placeholder="Кечки овқат" bind:value={m[s].kechki} />
              {:else}<div class="dv" class:e={!m[s].kechki}>{m[s].kechki || "…"}</div>{/if}
            </div>
          {/if}
        </div>
      </div>
      {/if}
    {/each}
    {#if edit}<button class="btn" onclick={saqla} disabled={yuk}>Сақлаш ✓</button>{/if}
    {#if d.vaqt}<div class="muted" style="font-size:12px;text-align:center">Охирги ўзгариш: {sanaQ(d.vaqt)}</div>{/if}
  {/if}
</div>
