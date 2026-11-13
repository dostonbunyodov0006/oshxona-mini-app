<script>
  import { P } from "./icons.js";
  let { name, size = 20, sw = 1.75 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={sw}
     stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" aria-hidden="true">{@html P[name] || ""}</svg>
