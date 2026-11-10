<script setup>
const p = defineProps({ rows: Array, weeks: Number, months: Array, step: { type: Number, default: 1 } })
const pct = (w) => ((w - 1) / p.weeks) * 100
const renk = { m: '#d6182b', k: '#f28a8f', i: '#aeb6c2', g: '#5c636e' }
</script>
<template>
  <div class="gantt">
    <div class="g-ust">
      <div class="g-ad"></div><div class="g-k">kişi/hf</div>
      <div class="g-alan ay">
        <div v-for="(a, i) in months" :key="i" class="g-ay" :style="{ left: pct(a.s) + '%', width: ((a.e - a.s + 1) / weeks * 100) + '%' }">{{ a.t }}</div>
      </div>
    </div>
    <div v-for="(r, i) in rows" :key="i" class="g-satir" :class="{ vurgu: r.v }">
      <div class="g-ad"><span class="nokta" :style="{ background: renk[r.g] }"></span>{{ r.n }}</div>
      <div class="g-k">{{ r.k }}</div>
      <div class="g-alan">
        <div v-for="w in Math.floor(weeks / step)" :key="w" class="g-izgara" :style="{ left: (w * step / weeks * 100) + '%' }"></div>
        <div class="g-cubuk" :style="{ left: pct(r.s) + '%', width: Math.max(1.2, (r.e - r.s + 1) / weeks * 100) + '%', background: renk[r.g], animationDelay: (i * 45) + 'ms' }"></div>
        <div class="g-etiket" :style="{ left: 'calc(' + (pct(r.e) + 100 / weeks) + '% + 6px)' }">{{ r.s === r.e ? r.s : r.s + '–' + r.e }}</div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.gantt{font-size:.74rem;color:var(--metin)}
.g-ust,.g-satir{display:grid;grid-template-columns:190px 52px 1fr;align-items:center}
.g-satir{height:25px;border-top:1px solid rgba(0,0,0,.06)}
.g-satir.vurgu{background:rgba(214,24,43,.07)}
.g-satir.vurgu .g-ad{color:#16181b;font-weight:700}
.g-ad{display:flex;align-items:center;gap:8px;color:var(--soluk2);white-space:nowrap}
.nokta{width:8px;height:8px;border-radius:2px;flex:none}
.g-k{text-align:right;padding-right:12px;color:var(--soluk);font-variant-numeric:tabular-nums}
.g-alan{position:relative;height:100%}
.g-alan.ay{height:24px}
.g-ay{position:absolute;top:2px;bottom:2px;border:1px solid rgba(0,0,0,.14);border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--soluk2);font-size:.68rem;letter-spacing:.06em}
.g-izgara{position:absolute;top:0;bottom:0;border-left:1px dashed rgba(0,0,0,.07)}
.g-cubuk{position:absolute;top:7px;height:11px;border-radius:3px;transform-origin:left;animation:uza .7s cubic-bezier(.2,.7,.2,1) both}
.g-etiket{position:absolute;top:5px;font-size:.64rem;color:var(--soluk);white-space:nowrap}
@keyframes uza{from{transform:scaleX(0)}to{transform:scaleX(1)}}
</style>
