<script setup>
const p = defineProps({ v: Array, tepe: Number, etiket: { type: String, default: 'hafta' }, h: { type: Number, default: 230 } })
const max = Math.max(...p.v)
</script>
<template>
  <div class="sutun" :style="{ height: h + 'px' }">
    <div v-for="(x, i) in v" :key="i" class="s">
      <div class="deger" :class="{ tepe: x === max }">{{ x }}</div>
      <div class="bar" :class="{ tepe: x === max, yogun: x >= 200 }" :style="{ height: (x / max * (h - 46)) + 'px', animationDelay: (i * 40) + 'ms' }"></div>
      <div class="ay">{{ i + 1 }}</div>
    </div>
  </div>
</template>
<style scoped>
.sutun{display:flex;align-items:flex-end;gap:6px}
.s{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.bar{width:100%;background:#3a404a;border-radius:3px 3px 0 0;transform-origin:bottom;animation:yuksel .7s cubic-bezier(.2,.7,.2,1) both}
.bar.yogun{background:#8e1520}.bar.tepe{background:#e5212f}
.deger{font-size:.66rem;color:var(--soluk);margin-bottom:4px;font-variant-numeric:tabular-nums}
.deger.tepe{color:#fff;font-weight:700;font-size:.8rem}
.ay{font-size:.62rem;color:var(--soluk);margin-top:6px;border-top:1px solid rgba(255,255,255,.12);width:100%;text-align:center;padding-top:4px}
@keyframes yuksel{from{transform:scaleY(0)}to{transform:scaleY(1)}}
</style>
