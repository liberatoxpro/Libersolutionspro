// Comercial vertical v2 "A chuva não espera" — Liber Drones (1080x1920, 30 fps).
// Mesmo estilo do carrossel cinema: letterbox, grão, flares, tipografia cinética, HUD.
// Uso (na raiz do repositório):
//   python3 instagram/video-v2/audio/mixar.py   # narração em segmentos + trilha + efeitos
//   node instagram/video-v2/gerar.js [--previa]  # vídeo final (ou só quadros de prévia)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const DIR = __dirname;
const CENAS = path.join(DIR, '..', 'video-chuvas', 'cenas');
const MARCA = path.resolve(DIR, '../marca');
const CFG = JSON.parse(fs.readFileSync(path.join(DIR, 'roteiro.json'), 'utf8'));
const FPS = 30;
const W = 1080, H = 1920;
const PREVIA = process.argv.includes('--previa');
const img = (f, dir = CENAS) => {
  const p = path.join(dir, f);
  return `data:image/${p.endsWith('.png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(p).toString('base64')}`;
};

const IM = {
  chuva: img('chuva-3.jpg'), chuva2: img('chuva-4.jpg'), aerea: img('aerea-1.jpg'), aerea2: img('aerea-2.jpg'),
  solo: img('solo-3.jpg'), solo2: img('solo-1.jpg'), mato: img('mato-3.jpg'), piloto: img('piloto-1.jpg'),
  pulv: img('site-pulverizacao.jpg'), disp: img('site-dispersao.jpg'), mapa: img('site-mapeamento.jpg'),
  logo: img('logo-liber-drones-claro.png', MARCA),
};

// Cenas: início/fim (s), imagem, foco horizontal (0-1 = background-position-x), zoom inicial/final, deslocamento.
const SCENES = [
  { a: 0.0, b: 1.75, im: 'chuva', px: 0.13, z0: 1.25, z1: 1.04, rain: 1, label: 'CENA 01' },
  { a: 1.75, b: 3.05, im: 'aerea', px: 0.64, z0: 1.0, z1: 1.14, rain: 0.6, label: 'CENA 01' },
  { a: 3.05, b: 4.3, im: 'solo', px: 0.5, z0: 1.2, z1: 1.05, label: 'CENA 02' },
  { a: 4.3, b: 6.0, im: 'mato', px: 0.32, z0: 1.05, z1: 1.18, drizzle: 1, label: 'CENA 02' },
  { a: 6.0, b: 8.05, im: 'piloto', px: 0.82, z0: 1.16, z1: 1.04, label: 'CENA 03' },
  { a: 8.05, b: 9.45, im: 'mapa', px: 0.43, z0: 1.05, z1: 1.16, scan: 1, label: 'CENA 03' },
  { a: 9.45, b: 11.05, im: 'piloto', px: 0.2, z0: 1.22, z1: 1.08, label: 'CENA 03' },
  { a: 11.05, b: 13.55, im: 'pulv', px: 0.45, z0: 1.25, z1: 1.06, oy: 0.48, label: 'CAPÍTULO 01' },
  { a: 13.55, b: 16.95, im: 'disp', px: 0.55, z0: 1.05, z1: 1.2, label: 'CAPÍTULO 02' },
  { a: 16.95, b: 19.25, im: 'pulv', px: 0.45, z0: 1.4, z1: 1.18, oy: 0.48, hud: 1, label: 'CAPÍTULO 03' },
  { a: 19.25, b: 21.95, im: 'aerea2', px: 0.57, z0: 1.15, z1: 1.0, label: 'CAPÍTULO 03' },
  { a: 21.95, b: 27.45, proof: 1, label: 'EXPERIÊNCIA' },
  { a: 27.45, b: 30.55, split: 1, label: 'DECISÃO' },
  { a: 30.55, b: CFG.duracao + 1, end: 1, label: 'CONTATO' },
];

const NOISE = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}`;

const css = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#030604}
body{font-family:Inter,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;position:relative}
.H{font-family:'Inter Tight',Inter,sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.045em;line-height:.9}
.g{color:#85c440;text-shadow:0 0 50px rgba(133,196,64,.45)}
.abs{position:absolute;inset:0}
.scene{position:absolute;inset:0;overflow:hidden;visibility:hidden}
.ph{position:absolute;inset:0;background-size:cover;filter:contrast(1.14) saturate(.9) brightness(.82);will-change:transform}
.tint{background:#1f3d14;mix-blend-mode:color;opacity:.24}
.shade{background:linear-gradient(180deg,rgba(3,6,4,.85) 0%,rgba(3,6,4,.55) 24%,rgba(3,6,4,.12) 46%,rgba(3,6,4,.55) 68%,rgba(3,6,4,.88) 86%,rgba(3,6,4,.95) 100%)}
.vig{background:radial-gradient(ellipse 85% 60% at 50% 45%,transparent 45%,rgba(0,0,0,.75) 100%);z-index:40}
.grain{position:absolute;inset:-50%;background-image:url("${NOISE}");opacity:.1;mix-blend-mode:overlay;z-index:41}
.flash{background:#fff;opacity:0;z-index:45}
canvas{position:absolute;inset:0;z-index:20}
.bar{position:absolute;left:0;right:0;height:120px;background:#000;z-index:60;display:flex;align-items:center;justify-content:space-between;padding:0 64px;font-size:22px;font-weight:600;letter-spacing:.24em;color:#c9d3c9}
.bar.t{top:0}.bar.b{bottom:0}
.bar img{height:30px}
.rec{display:flex;align-items:center;gap:12px}
.rec i{width:15px;height:15px;border-radius:50%;background:#ff3b3b;box-shadow:0 0 12px #ff3b3b}
.corners{position:absolute;left:44px;right:44px;top:160px;bottom:160px;z-index:55}
.corners i{position:absolute;width:64px;height:64px;border:0 solid rgba(255,255,255,.7)}
.corners i:nth-child(1){left:0;top:0;border-left-width:3px;border-top-width:3px}
.corners i:nth-child(2){right:0;top:0;border-right-width:3px;border-top-width:3px}
.corners i:nth-child(3){left:0;bottom:0;border-left-width:3px;border-bottom-width:3px}
.corners i:nth-child(4){right:0;bottom:0;border-right-width:3px;border-bottom-width:3px}
.flare{position:absolute;left:0;width:100%;height:4px;z-index:35;mix-blend-mode:screen;opacity:0;
  background:linear-gradient(90deg,transparent,#b9e08a 45%,#fff 50%,#b9e08a 55%,transparent 80%);box-shadow:0 0 70px 20px rgba(133,196,64,.35)}
.head{position:absolute;left:84px;right:150px;z-index:50}
.ln{display:block;overflow:hidden;padding:.05em 0 .02em}
.ln>span{display:block}
.kick{display:block;font-size:26px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#b9e08a;margin-bottom:28px}
.chip{display:inline-block;font-size:24px;font-weight:700;letter-spacing:.2em;color:#030604;background:#85c440;border-radius:999px;padding:10px 24px;margin-bottom:26px}
.logoint{height:56px;display:block;margin-bottom:34px;filter:drop-shadow(0 0 24px rgba(133,196,64,.45))}
.proofwrap{position:absolute;left:84px;right:150px;top:330px;z-index:50}
.counter{font-family:'Inter Tight',sans-serif;font-weight:800;font-size:230px;letter-spacing:-.06em;line-height:.9;color:#fff;text-shadow:0 0 80px rgba(133,196,64,.55)}
.counter em{font-style:normal;color:#85c440}
.chips{display:flex;gap:16px;margin-top:40px;flex-wrap:wrap}
.chip2{border:2px solid rgba(185,224,138,.55);border-radius:999px;padding:14px 26px;font-size:30px;font-weight:700;letter-spacing:.08em;background:rgba(10,20,12,.65)}
.chip2 b{color:#85c440}
.badges{display:flex;gap:22px;margin-top:46px}
.badge{display:flex;align-items:center;gap:16px;background:#85c440;color:#06100a;border-radius:18px;padding:22px 30px;font-family:'Inter Tight',sans-serif;font-weight:800;font-size:56px;letter-spacing:-.01em;box-shadow:0 0 50px rgba(133,196,64,.45)}
.badge small{display:block;font-family:Inter;font-weight:700;font-size:18px;letter-spacing:.2em;opacity:.75}
.slam{position:absolute;left:60px;right:60px;top:300px;text-align:center;z-index:51}
.slam .H{font-size:96px;letter-spacing:-.04em}
.cta-arrow{display:inline-block;margin-top:26px;color:#85c440}
.cap{position:absolute;left:84px;right:150px;top:1300px;z-index:58;display:flex;justify-content:flex-start}
.cap span.box{display:inline-block;background:rgba(3,8,5,.72);border-left:5px solid #85c440;padding:16px 26px 18px;border-radius:6px;
  font-family:'Inter Tight',Inter,sans-serif;font-weight:700;font-size:50px;line-height:1.16;letter-spacing:-.01em;color:#fff;max-width:846px}
.cap b{color:#9be04f;font-weight:800}
.cap .w{opacity:.55}.cap .w.on{opacity:1}
.tag{position:absolute;z-index:52;font-size:24px;font-weight:700;letter-spacing:.24em;color:#b9e08a;white-space:nowrap;background:rgba(3,8,5,.6);padding:10px 18px;border:2px solid rgba(185,224,138,.6);border-radius:6px}
.ret{position:absolute;z-index:30;width:0;height:0}
.ret .r{position:absolute;border-radius:50%;border:2px solid rgba(185,224,138,.85);transform:translate(-50%,-50%)}
.ret .r1{width:420px;height:420px;border-style:dashed}
.ret .r2{width:270px;height:270px;border-color:rgba(255,255,255,.75);border-left-color:transparent;border-right-color:transparent}
.ret .cross{position:absolute;width:600px;height:2px;transform:translate(-50%,-50%);background:linear-gradient(90deg,transparent,rgba(185,224,138,.8) 30%,transparent 42%,transparent 58%,rgba(185,224,138,.8) 70%,transparent)}
.gridov{background-image:linear-gradient(rgba(185,224,138,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(185,224,138,.22) 1px,transparent 1px);background-size:72px 72px;mix-blend-mode:screen;z-index:15}
.scan{position:absolute;left:0;right:0;height:240px;z-index:16;background:linear-gradient(180deg,transparent,rgba(133,196,64,.28) 85%,#c6f08f 100%);border-bottom:2px solid #d6ff9e;box-shadow:0 10px 40px rgba(133,196,64,.6)}
.panel{position:absolute;left:0;right:0;height:50%;overflow:hidden}
.panel .lbl{position:absolute;left:84px;bottom:70px;z-index:5}
.divider{position:absolute;left:0;right:0;top:50%;height:6px;margin-top:-3px;background:#85c440;box-shadow:0 0 40px rgba(133,196,64,.8);z-index:6;transform-origin:left}
.floor{position:absolute;left:-60%;right:-60%;bottom:-6%;height:50%;transform:perspective(620px) rotateX(64deg);transform-origin:bottom;
  background-image:linear-gradient(rgba(133,196,64,.5) 2px,transparent 2px),linear-gradient(90deg,rgba(133,196,64,.5) 2px,transparent 2px);background-size:110px 110px;
  -webkit-mask-image:linear-gradient(0deg,#000 20%,transparent 95%)}
.glow{background:radial-gradient(ellipse 70% 40% at 50% 38%,rgba(133,196,64,.3),transparent 70%)}
.endwrap{position:absolute;left:84px;right:84px;top:560px;text-align:center;z-index:50}
.endlogo{width:820px;max-width:100%;filter:drop-shadow(0 0 30px rgba(133,196,64,.35))}
.btn{display:inline-flex;align-items:center;gap:20px;background:#85c440;color:#06100a;font-family:'Inter Tight',sans-serif;font-size:54px;font-weight:800;letter-spacing:-.01em;padding:30px 54px;border-radius:999px;text-transform:uppercase}
.wa{display:inline-flex;align-items:center;gap:22px;margin-top:46px;font-family:'Inter Tight',sans-serif;font-weight:800;font-size:76px;letter-spacing:-.02em;color:#fff}
.wa small{display:block;font-family:Inter;font-weight:600;font-size:26px;letter-spacing:.3em;color:#b9e08a;text-align:left}
.site{margin-top:30px;font-size:30px;color:#d7ded3;letter-spacing:.04em}
`;

const arrow = (s = 40, c = 'currentColor') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const waIcon = `<svg width="92" height="92" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#25D366"/><path fill="#fff" d="M23.3 8.7A10.3 10.3 0 0 0 7.1 21.1L5.9 25.6l4.6-1.2a10.3 10.3 0 0 0 4.9 1.3c5.7 0 10.3-4.6 10.3-10.3 0-2.7-1.1-5.3-3-7.2zM16 23.9a8.5 8.5 0 0 1-4.4-1.2l-.3-.2-2.7.7.7-2.6-.2-.3a8.5 8.5 0 1 1 6.9 3.6zm4.7-6.4c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a7 7 0 0 1-3.5-3c-.3-.5.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.7 4.3 3.8 1.6.7 2.2.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3z"/></svg>`;

const lines = (arr, id) => arr.map((l, i) => `<span class="ln"><span data-ln="${id}" data-i="${i}">${l}</span></span>`).join('');

function sceneHTML(s, i) {
  if (s.split) {
    return `<div class="scene" id="s${i}">
      <div class="panel" style="top:0"><div class="ph" data-ph style="background-image:url('${IM.solo2}');background-position:50% 50%"></div><div class="abs tint"></div>
        <div class="abs" style="background:linear-gradient(0deg,rgba(3,6,4,.8),transparent 60%)"></div>
        <div class="lbl head" id="lblA" style="left:84px;top:auto;bottom:80px"><span class="kick">Área de plantio</span><div class="H" style="font-size:104px">${lines(['Formar', '<span class="g">pasto?</span>'], 'A')}</div></div></div>
      <div class="panel" style="top:50%"><div class="ph" data-ph style="background-image:url('${IM.pulv}');background-position:45% 50%"></div><div class="abs tint"></div>
        <div class="abs" style="background:linear-gradient(180deg,rgba(3,6,4,.9) 0%,rgba(3,6,4,.55) 40%,transparent 70%)"></div>
        <div class="lbl head" id="lblB" style="left:84px;top:40px;bottom:auto"><span class="kick">Área de aplicação</span><div class="H" style="font-size:104px">${lines(['Precisa de uma', '<span class="g">aplicação?</span>'], 'B')}</div></div></div>
      <div class="divider" id="div"></div></div>`;
  }
  if (s.proof) {
    return `<div class="scene" id="s${i}" style="background:#020402"><div class="ph" data-ph style="background-image:url('${IM.aerea}');background-position:60% 50%;opacity:.35"></div>
      <div class="abs" style="background:linear-gradient(180deg,rgba(2,4,2,.85),rgba(2,4,2,.35) 45%,rgba(2,4,2,.9))"></div><div class="abs glow"></div><div class="floor" id="pfloor"></div>
      <div class="proofwrap"><span class="kick">Experiência no campo</span>
        <div class="counter"><span id="cnt">0</span><em id="plus">+</em></div>
        <div class="H" style="font-size:78px;letter-spacing:-.02em">${lines(['hectares', '<span class="g">atendidos</span>'], 'P')}</div>
        <div class="chips" id="pchips"><span class="chip2"><b>PA</b> · <b>TO</b> · <b>MA</b></span></div>
        <div class="badges"><div class="badge" id="bMapa">MAPA ✓</div><div class="badge" id="bAnac">ANAC ✓</div></div></div></div>`;
  }
  if (s.end) {
    return `<div class="scene" id="s${i}" style="background:#020402"><div class="abs glow"></div><div class="floor" id="floor"></div>
      <div class="slam" id="slam"><div class="H">A chuva <span class="g">não espera.</span></div></div>
      <div class="endwrap"><img class="endlogo" id="endlogo" src="${IM.logo}">
        <div class="H" id="endh" style="font-size:72px;margin-top:80px;letter-spacing:-.03em">${lines(['Solicite seu', '<span class="g">orçamento</span>'], 'E')}</div>
        <div id="endwa" style="margin-top:60px"><div class="wa">${waIcon}<div><small>WHATSAPP</small>(98) 98148-0329</div></div></div>
        <div class="site" id="endsite">drones.libersolutions.com.br</div></div></div>`;
  }
  const o = s.overlay || '';
  return `<div class="scene" id="s${i}"><div class="ph" data-ph style="background-image:url('${IM[s.im]}');background-position:${s.px * 100}% 50%"></div>
    <div class="abs tint"></div><div class="abs shade"></div>${s.scan ? '<div class="abs gridov"></div><div class="scan" id="scan"></div>' : ''}${o}</div>`;
}

const HEADS = `
<div class="head" id="h1" style="top:300px"><div class="H" style="font-size:132px">${lines(['Choveu na', '<span class="g">sua fazenda.</span>'], 'h1')}</div></div>
<div class="head" id="h2" style="top:300px"><div class="H" style="font-size:118px">${lines(['Plantar', '<span class="g">capim</span>'], 'h2')}</div>
  <div class="H" id="h2b" style="font-size:118px;margin-top:30px">${lines(['ou controlar', '<span class="g">o mato?</span>'], 'h2b')}</div></div>
<div class="head" id="h3" style="top:300px"><div class="H" style="font-size:112px">${lines(['Cada área', 'tem uma', '<span class="g">necessidade.</span>'], 'h3')}</div></div>
<div class="tag" id="t1" style="left:84px;top:300px">AVALIAÇÃO DA ÁREA</div>
<div class="tag" id="t2" style="left:84px;top:300px">NA HORA CERTA</div>
<div class="head" id="h4" style="top:250px"><img class="logoint" id="logoint" src="${IM.logo}"><span class="chip">01</span>
  <div class="H" style="font-size:112px">${lines(['Pulverização', '<span class="g">agrícola</span>'], 'h4')}</div></div>
<div class="head" id="h5" style="top:930px"><span class="chip">02</span>
  <div class="H" style="font-size:118px">${lines(['Sementes', '<span class="g">e sólidos</span>'], 'h5')}</div></div>
<div class="ret" id="ret" style="left:540px;top:900px"><div class="r r1"></div><div class="r r2"></div><div class="cross"></div></div>
<div class="tag" id="t3" style="left:84px;top:300px">TECNOLOGIA</div>
<div class="tag" id="t4" style="left:84px;top:380px">PRECISÃO</div>
<div class="tag" id="t5" style="left:84px;top:460px">AGILIDADE</div>
<div class="head" id="h6" style="top:300px"><span class="kick">Liber Drones</span><div class="H" style="font-size:112px">${lines(['Tecnologia', 'a serviço', '<span class="g">do campo.</span>'], 'h6')}</div></div>
`;

const capHTML = CFG.legendas.map((c, i) => {
  const words = c.txt.split(/(\*[^*]+\*)/).flatMap((seg) => {
    const hl = seg.startsWith('*');
    return seg.replace(/\*/g, '').split(/\s+/).filter(Boolean).map((w) => ({ w, hl }));
  }).reduce((acc, x) => {
    if (/^[.,?!…]+$/.test(x.w) && acc.length) acc[acc.length - 1].p = (acc[acc.length - 1].p || '') + x.w; else acc.push(x);
    return acc;
  }, []).map((x) => (x.hl ? `<b class="w">${x.w}</b>` : `<span class="w">${x.w}</span>`) + (x.p ? `<span class="w">${x.p}</span>` : ''));
  return `<div class="cap" id="c${i}" style="visibility:hidden"><span class="box">${words.join(' ').replace(/<\/(b|span)> <span class="w">([.,?!…]+)<\/span>/g, '</$1><span class="w">$2</span>')}</span></div>`;
}).join('');

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700;800&display=swap" rel="stylesheet">
<style>${css}</style></head><body>
<div class="abs" id="cam">${SCENES.map(sceneHTML).join('')}</div>
<canvas id="rain" width="${W}" height="${H}"></canvas>
<div class="flare" id="fl"></div>
${HEADS}
${capHTML}
<div class="abs" id="blackout" style="background:#000;z-index:46"></div><div class="abs vig"></div><div class="grain" id="grain"></div><div class="abs flash" id="flash"></div>
<div class="corners" id="corners"><i></i><i></i><i></i><i></i></div>
<div class="bar t"><span class="rec"><i id="recdot"></i>REC</span><span id="lbl"></span><span id="tc">00:00:00:00</span></div>
<div class="bar b"><img src="${IM.logo}"><span>@LIBERDRONES</span></div>
<script>
const SC = ${JSON.stringify(SCENES)};
const CAPS = ${JSON.stringify(CFG.legendas)};
const OFF = ${CFG.voz_offset};
const CUTS = ${JSON.stringify(CFG.cortes)};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
const eio = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const expo = (x) => x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(x));
const $ = (id) => document.getElementById(id);
function rnd(seed) { let s = seed % 2147483647; return () => (s = s * 16807 % 2147483647) / 2147483647; }
const R = rnd(11); const DROPS = Array.from({ length: 220 }, () => ({ x: R() * 1400 - 160, y: R() * 2200, l: 60 + R() * 120, v: 2600 + R() * 1400, a: .25 + R() * .55 }));
const ctx = $('rain').getContext('2d');
function rain(t, k) {
  ctx.clearRect(0, 0, ${W}, ${H});
  if (k <= 0) return;
  ctx.lineCap = 'round';
  for (const d of DROPS) {
    const y = ((d.y + t * d.v) % 2300) - 200, x = d.x + y * 0.22;
    ctx.strokeStyle = 'rgba(215,230,222,' + (d.a * k) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d.l * 0.22, y + d.l); ctx.stroke();
  }
}
function revealLines(id, t0, t, step = 0.12, dur = 0.55) {
  document.querySelectorAll('[data-ln="' + id + '"]').forEach((el) => {
    const p = eo((t - t0 - el.dataset.i * step) / dur);
    el.style.transform = 'translateY(' + ((1 - p) * 110) + '%) skewY(' + ((1 - p) * 6) + 'deg)';
  });
}
function show(id, a, b, t, fade = 0.25) {
  const el = $(id); const on = t >= a && t < b;
  el.style.visibility = on ? 'visible' : 'hidden';
  if (on) el.style.opacity = Math.min(clamp((t - a) / 0.12), clamp((b - t) / fade));
  return on;
}
function tagAnim(id, a, b, t) {
  if (!show(id, a, b, t)) return;
  const p = eo((t - a) / 0.4);
  const el = $(id); el.style.transform = 'translateX(' + ((1 - p) * -40) + 'px)'; el.style.letterSpacing = (0.24 + (1 - p) * 0.4) + 'em';
}
window.render = (t) => {
  // cenas
  SC.forEach((s, i) => {
    const el = $('s' + i);
    const on = t >= s.a && t < s.b;
    el.style.visibility = on ? 'visible' : 'hidden';
    if (!on) return;
    const lt = t - s.a, d = s.b - s.a, p = clamp(lt / d);
    const enter = eo(lt / 0.35);
    el.querySelectorAll('[data-ph]').forEach((ph) => {
      const z = (s.z0 || 1.08) + ((s.z1 || 1.0) - (s.z0 || 1.08)) * eio(p);
      const kick = 1 + (1 - enter) * 0.12;
      ph.style.transform = 'scale(' + (z * kick) + ')';
      ph.style.transformOrigin = '50% ' + ((s.oy || 0.5) * 100) + '%';
      ph.style.filter = 'contrast(1.14) saturate(.9) brightness(.82) blur(' + ((1 - enter) * 10) + 'px)';
    });
    $('lbl').textContent = s.label;
    if (s.scan) $('scan').style.transform = 'translateY(' + (-260 + eio(clamp(lt / 1.4)) * 2200) + 'px)';
    if (s.split) {
      $('div').style.transform = 'scaleX(' + eo(lt / 0.5) + ')';
      revealLines('A', s.a + 0.1, t); revealLines('B', s.a + 1.15, t);
      $('lblB').style.opacity = clamp((t - s.a - 1.05) / 0.2);
    }
    if (s.proof) {
      const cp = clamp((t - 22.3) / 2.4), e = cp >= 1 ? 1 : 1 - Math.pow(2, -10 * cp);
      $('cnt').textContent = Math.round(15000 * e).toLocaleString('pt-BR');
      $('plus').style.opacity = cp >= 1 ? 1 : 0;
      revealLines('P', 22.5, t, 0.14);
      const chp = eo((t - 25.12) / 0.4); $('pchips').style.opacity = chp; $('pchips').style.transform = 'translateY(' + ((1 - chp) * 30) + 'px)';
      [['bMapa', 26.08], ['bAnac', 26.76]].forEach(([id, a]) => { const q = clamp((t - a) / 0.35); const sc = q <= 0 ? 0 : (q < 1 ? 1.6 - 0.6 * eo(q) : 1); $(id).style.opacity = q > 0 ? 1 : 0; $(id).style.transform = 'scale(' + sc + ')'; });
      $('pfloor').style.backgroundPosition = '0 ' + ((t * 120) % 110) + 'px';
    }
    if (s.end) {
      const sp = clamp((t - 34.0) / 0.3);
      $('slam').style.opacity = sp; $('slam').style.transform = 'scale(' + (1.5 - 0.5 * eo(sp)) + ')'; $('slam').style.filter = 'blur(' + ((1 - sp) * 10) + 'px)';
      const lp = eio(clamp((lt - 0.15) / 1.0));
      $('endlogo').style.clipPath = 'inset(0 ' + ((1 - lp) * 100) + '% 0 0)';
      revealLines('E', s.a + 0.6, t, 0.14);
      const wp = eo((lt - 0.2) / 0.6);
      $('endwa').style.transform = 'scale(' + (0.85 + 0.15 * wp) + ')'; $('endwa').style.opacity = wp;
      $('endsite').style.opacity = clamp((lt - 0.9) / 0.5);
      $('floor').style.backgroundPosition = '0 ' + ((t * 90) % 110) + 'px';
    }
  });
  // chuva
  let rk = 0;
  for (const s of SC) if (t >= s.a && t < s.b) rk = s.rain || (s.drizzle ? 0.35 : 0);
  rain(t, rk);
  // flash nos cortes
  let fl = 0;
  for (const s of SC) { const dt = t - s.a; if (dt >= 0 && dt < 0.12 && s.a > 0) fl = Math.max(fl, (1 - dt / 0.12) * 0.32); }
  $('flash').style.opacity = (t >= 0.22 && t < 0.4) ? (1 - (t - 0.22) / 0.18) * 0.85 : fl;
  // flares em momentos-chave
  const flares = [[0.25, 0.35], [11.1, 0.42], [17.0, 0.3], [22.0, 0.3], [30.6, 0.38], [34.0, 0.22]];
  let fo = 0, fx = 0, fy = 0.4;
  for (const [a, y] of flares) { const q = (t - a) / 1.6; if (q >= 0 && q <= 1) { fo = Math.sin(q * Math.PI); fx = -120 + q * 240; fy = y; } }
  $('fl').style.opacity = fo; $('fl').style.top = (fy * 100) + '%'; $('fl').style.transform = 'translateX(' + fx + '%) scaleX(' + (0.4 + fo) + ')';
  // títulos
  if (show("h1", 0.22, 1.75, t)) revealLines("h1", 0.24, t, 0.14);
  if (show('h2', 3.05, 6.0, t)) { revealLines('h2', 3.1, t); $('h2b').style.opacity = t >= 4.3 ? 1 : 0; revealLines('h2b', 4.32, t); }
  if (show('h3', 6.05, 8.05, t)) revealLines('h3', 6.1, t, 0.12);
  tagAnim('t1', 8.1, 9.45, t); tagAnim('t2', 9.75, 11.05, t);
  if (show('h4', 11.1, 13.55, t)) { revealLines('h4', 11.35, t, 0.14); const lp = eio((t - 11.1) / 0.8); $('logoint').style.clipPath = 'inset(0 ' + ((1 - lp) * 100) + '% 0 0)'; }
  if (show('h5', 13.6, 16.95, t)) revealLines('h5', 13.65, t, 0.14);
  if (show('ret', 16.95, 19.25, t)) {
    const lt = t - 16.95, k = eo(lt / 0.8);
    document.querySelector('#ret .r1').style.transform = 'translate(-50%,-50%) rotate(' + (lt * 40) + 'deg) scale(' + (2.2 - 1.2 * k) + ')';
    document.querySelector('#ret .r2').style.transform = 'translate(-50%,-50%) rotate(' + (-lt * 110) + 'deg) scale(' + (2.0 - 1.0 * k) + ')';
  }
  tagAnim('t3', 17.06, 19.25, t); tagAnim('t4', 18.1, 19.25, t); tagAnim('t5', 18.9, 19.25, t);
  if (show('h6', 19.3, 21.95, t)) revealLines('h6', 19.35, t, 0.13);
  // legendas (palavra ativa acende)
  CAPS.forEach((c, i) => {
    const el = $('c' + i), a = c.a + OFF, b = c.b + OFF;
    const on = t >= a - 0.05 && t < b + 0.1;
    el.style.visibility = on ? 'visible' : 'hidden';
    if (!on) return;
    el.style.opacity = clamp((t - a + 0.05) / 0.12);
    const ws = el.querySelectorAll('.w'), n = ws.length;
    const k = Math.floor(clamp((t - a) / (b - a)) * n);
    ws.forEach((w, j) => w.classList.toggle('on', j <= k));
  });
  // HUD
  const f = Math.floor(t * 30), ss = Math.floor(t);
  $('tc').textContent = '00:00:' + String(ss).padStart(2, '0') + ':' + String(f % 30).padStart(2, '0');
  $('recdot').style.opacity = (Math.floor(t * 2) % 2) ? 0.15 : 1;
  const gr = rnd(f + 3); $('grain').style.transform = 'translate(' + (gr() * 12 - 6) + '%,' + (gr() * 12 - 6) + '%)';
  $('corners').style.opacity = t >= 30.55 ? 0.35 : 1;
  // tremor de câmera nos impactos
  let sh = 0;
  for (const c of CUTS) { const dt = t - c.t; if (c.impacto && dt >= 0 && dt < 0.35) sh = Math.max(sh, c.impacto * 16 * Math.exp(-dt * 12)); }
  const sr = rnd(f * 7 + 1); $('cam').style.transform = 'translate(' + ((sr() * 2 - 1) * sh) + 'px,' + ((sr() * 2 - 1) * sh) + 'px)';
  // quebra de padrão: tela preta até o trovão
  if (t < 0.22) $('flash').style.opacity = 0;
  $('blackout').style.opacity = t < 0.22 ? 1 : 0;
};
</script></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
  if (PREVIA) {
    const ts = [0.1, 0.35, 0.8, 12.6, 18.6, 23.0, 25.5, 27.0, 29.5, 32.0, 35.0, 37.5];
    for (const t of ts) { await page.evaluate((x) => window.render(x), t); await page.screenshot({ path: path.join(DIR, 'previa', `t${t.toFixed(1)}.jpg`), type: 'jpeg', quality: 85 }); }
    console.log('ok prévia');
  } else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'liber-v2-'));
    const total = Math.round(CFG.duracao * FPS);
    for (let f = 0; f < total; f++) {
      await page.evaluate((x) => window.render(x), f / FPS);
      await page.screenshot({ path: path.join(tmp, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
    const out = path.join(DIR, 'liber-drones-v2-9x16.mp4');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(tmp, '%05d.jpg'), '-i', path.join(DIR, 'audio', 'mix.wav'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('ok', path.basename(out));
  }
  await browser.close();
})();
