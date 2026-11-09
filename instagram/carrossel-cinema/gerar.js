// Carrossel cinematográfico (motion graphics) da Liber Drones.
// Gera, para cada slide: slide-N.mp4 (5 s, 30 fps, 1080x1350) e slide-N.png (quadro final),
// além de trailer.mp4 com todos os slides em sequência.
// Uso (na raiz do repositório): node instagram/carrossel-cinema/gerar.js [--so-png]
// Requer: Playwright (Chromium) e ffmpeg.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const DIR = __dirname;
const MARCA = path.resolve(DIR, '../marca');
const SO_PNG = process.argv.includes('--so-png');
const FPS = 30;
const DUR = 5; // segundos por slide
const STILL_T = 4.4;
const b64 = (f) => {
  const p = path.join(MARCA, f);
  const mime = p.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
};
const LOGO = b64('logo-liber-drones-claro.png');
const PULV = b64('foto-pulverizacao.jpg');
const DISP = b64('foto-dispersao.jpg');
const MAPA = b64('foto-mapeamento.jpg');

const NOISE = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}`;

const css = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;background:#030604}
body{font-family:Inter,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;position:relative}
.H{font-family:'Inter Tight',Inter,sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.045em;line-height:.88}
.g{color:#85c440;text-shadow:0 0 50px rgba(133,196,64,.45)}
.layer{position:absolute;inset:0}
.ph{position:absolute;inset:-4%;background-size:cover;background-position:center;filter:contrast(1.15) saturate(.85) brightness(.8);
  transform-origin:var(--ox,50%) var(--oy,50%);animation:kb ${DUR + 1}s cubic-bezier(.25,.6,.25,1) both}
@keyframes kb{from{transform:scale(var(--s0,1.22))}to{transform:scale(var(--s1,1.03))}}
.tint{background:#1f3d14;mix-blend-mode:color;opacity:.28}
.shade{background:linear-gradient(180deg,rgba(3,6,4,.65) 0%,rgba(3,6,4,.05) 28%,rgba(3,6,4,.15) 50%,rgba(3,6,4,.88) 72%,#030604 92%)}
.vig{background:radial-gradient(ellipse 75% 65% at 50% 45%,transparent 40%,rgba(0,0,0,.8) 100%)}
.grain{position:absolute;inset:-60%;background-image:url("${NOISE}");opacity:.11;mix-blend-mode:overlay;animation:grain .7s steps(7) infinite}
@keyframes grain{0%{transform:translate(0,0)}15%{transform:translate(-6%,4%)}30%{transform:translate(5%,-7%)}45%{transform:translate(-3%,8%)}60%{transform:translate(8%,2%)}75%{transform:translate(-8%,-4%)}90%{transform:translate(3%,6%)}100%{transform:translate(0,0)}}
.fadein{animation:fade .9s ease both}
@keyframes fade{from{opacity:0}to{opacity:1}}
/* letterbox + HUD */
.bar{position:absolute;left:0;right:0;height:92px;background:#000;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:0 54px;
  font-size:19px;font-weight:600;letter-spacing:.24em;color:#c9d3c9;animation:bar 1s cubic-bezier(.75,0,.2,1) both}
.bar.t{top:0;transform-origin:top}.bar.b{bottom:0;transform-origin:bottom}
.bar>*{animation:fade .6s ease .7s both}
@keyframes bar{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.rec{display:flex;align-items:center;gap:12px}
.rec i{width:13px;height:13px;border-radius:50%;background:#ff3b3b;box-shadow:0 0 12px #ff3b3b;animation:blink 1s steps(2,jump-none) infinite}
@keyframes blink{0%{opacity:1}100%{opacity:.15}}
.bar img{height:24px}
.corners{position:absolute;inset:128px 44px;z-index:25;pointer-events:none;animation:cin 1.1s cubic-bezier(.16,1,.3,1) .3s both}
.corners i{position:absolute;width:56px;height:56px;border:0 solid rgba(255,255,255,.75)}
.corners i:nth-child(1){left:0;top:0;border-left-width:3px;border-top-width:3px}
.corners i:nth-child(2){right:0;top:0;border-right-width:3px;border-top-width:3px}
.corners i:nth-child(3){left:0;bottom:0;border-left-width:3px;border-bottom-width:3px}
.corners i:nth-child(4){right:0;bottom:0;border-right-width:3px;border-bottom-width:3px}
@keyframes cin{from{transform:scale(1.08);opacity:0}to{transform:none;opacity:1}}
.flare{position:absolute;left:0;width:100%;height:4px;top:var(--fy,45%);z-index:20;mix-blend-mode:screen;
  background:linear-gradient(90deg,transparent,rgba(185,224,138,.0) 20%,#b9e08a 45%,#fff 50%,#b9e08a 55%,transparent 80%);
  box-shadow:0 0 60px 18px rgba(133,196,64,.35);filter:blur(1px);animation:flare 2.4s cubic-bezier(.6,0,.2,1) var(--fd,.35s) both}
@keyframes flare{0%{transform:translateX(-120%) scaleX(.3);opacity:0}25%{opacity:1}100%{transform:translateX(120%) scaleX(1.6);opacity:0}}
/* tipografia animada */
.content{position:absolute;left:70px;right:70px;bottom:150px;z-index:15}
.kick{display:block;font-size:24px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#b9e08a;margin-bottom:30px;animation:track 1.5s cubic-bezier(.16,1,.3,1) var(--d,.5s) both}
@keyframes track{from{letter-spacing:1em;opacity:0;filter:blur(8px)}to{letter-spacing:.34em;opacity:1;filter:blur(0)}}
.ln{display:block;overflow:hidden;padding:.04em 0 .02em}
.ln>span{display:block;animation:up 1s cubic-bezier(.16,1,.3,1) var(--d,0s) both}
@keyframes up{from{transform:translateY(108%) skewY(6deg)}to{transform:none}}
.sub{font-size:34px;line-height:1.4;color:#dfe7dc;margin-top:34px;max-width:860px;animation:subin 1s cubic-bezier(.16,1,.3,1) var(--d,1.4s) both}
@keyframes subin{from{opacity:0;transform:translateY(24px);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
.swipe{display:inline-flex;align-items:center;gap:14px;margin-top:40px;font-size:24px;font-weight:600;letter-spacing:.3em;color:#85c440;animation:fade .8s ease 2s both}
.swipe svg{animation:nudge 1.2s ease-in-out infinite}
@keyframes nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(12px)}}
.bignum{position:absolute;right:-40px;top:90px;z-index:5;font-family:'Inter Tight',sans-serif;font-weight:800;font-size:560px;line-height:1;letter-spacing:-.06em;
  color:transparent;-webkit-text-stroke:2px rgba(185,224,138,.45);animation:numin ${DUR}s cubic-bezier(.16,1,.3,1) both}
@keyframes numin{0%{transform:translateY(90px);opacity:0}25%{opacity:1}100%{transform:translateY(-30px);opacity:1}}
.chip{display:inline-block;font-size:22px;font-weight:700;letter-spacing:.2em;color:#030604;background:#85c440;border-radius:999px;padding:10px 22px;margin-bottom:26px;animation:pop .6s cubic-bezier(.34,1.56,.64,1) .45s both}
@keyframes pop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
/* cena 01: chuva + relâmpago */
.storm{background:radial-gradient(ellipse at 50% 0%,#1a2a24 0%,#060a08 60%,#020302 100%)}
.rain{position:absolute;inset:-10%;transform:rotate(14deg)}
.drop{position:absolute;top:-25%;width:2px;background:linear-gradient(transparent,rgba(205,225,215,.55));animation:fall var(--du) linear var(--de) infinite}
@keyframes fall{from{transform:translateY(0)}to{transform:translateY(1900px)}}
.flash{background:#e8f3ff;mix-blend-mode:overlay;opacity:0;animation:flash ${DUR}s linear both}
@keyframes flash{0%,55%{opacity:0}56%{opacity:.8}58%{opacity:0}60%{opacity:.55}63%,100%{opacity:0}}
.smash>span{animation:smash .45s cubic-bezier(.2,1.4,.4,1) var(--d) both}
@keyframes smash{from{transform:scale(1.6);opacity:0;filter:blur(14px)}to{transform:none;opacity:1;filter:blur(0)}}
/* retícula HUD */
.ret{position:absolute;z-index:12;left:var(--rx);top:var(--ry);width:0;height:0}
.ret .r{position:absolute;border-radius:50%;border:2px solid rgba(185,224,138,.85);transform:translate(-50%,-50%)}
.ret .r1{width:300px;height:300px;border-style:dashed;animation:spin 8s linear infinite,lock 1.2s cubic-bezier(.16,1,.3,1) .6s both}
.ret .r2{width:190px;height:190px;border-color:rgba(255,255,255,.7);border-left-color:transparent;border-right-color:transparent;animation:spinr 3s linear infinite,lock 1.2s cubic-bezier(.16,1,.3,1) .8s both}
.ret .cross{position:absolute;width:420px;height:2px;background:linear-gradient(90deg,transparent,rgba(185,224,138,.8) 30%,transparent 42%,transparent 58%,rgba(185,224,138,.8) 70%,transparent);transform:translate(-50%,-50%);animation:fade .8s ease 1s both}
.ret .tag{position:absolute;left:170px;top:-150px;font-size:19px;font-weight:700;letter-spacing:.24em;color:#b9e08a;white-space:nowrap;animation:fade .5s ease 1.6s both}
.ret .tag:before{content:"";position:absolute;left:-60px;top:24px;width:70px;height:2px;background:#b9e08a;transform:rotate(35deg);transform-origin:left}
@keyframes spin{to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes spinr{to{transform:translate(-50%,-50%) rotate(-360deg)}}
@keyframes lock{from{opacity:0;width:900px;height:900px}to{opacity:1}}
/* cena mapeamento */
.gridov{background-image:linear-gradient(rgba(185,224,138,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(185,224,138,.22) 1px,transparent 1px);background-size:60px 60px;animation:fade 1.2s ease .6s both;mix-blend-mode:screen}
.scan{position:absolute;left:0;right:0;height:180px;z-index:11;background:linear-gradient(180deg,transparent,rgba(133,196,64,.28) 85%,#c6f08f 100%);border-bottom:2px solid #d6ff9e;box-shadow:0 10px 40px rgba(133,196,64,.6);animation:scan 3s cubic-bezier(.45,0,.55,1) .4s infinite}
@keyframes scan{from{transform:translateY(-200px)}to{transform:translateY(1400px)}}
/* chão em perspectiva */
.floor{position:absolute;left:-60%;right:-60%;bottom:-8%;height:62%;transform:perspective(520px) rotateX(64deg);transform-origin:bottom;
  background-image:linear-gradient(rgba(133,196,64,.5) 2px,transparent 2px),linear-gradient(90deg,rgba(133,196,64,.5) 2px,transparent 2px);background-size:100px 100px;
  -webkit-mask-image:linear-gradient(0deg,#000 20%,transparent 95%);animation:floor 1.2s linear infinite}
@keyframes floor{to{background-position:0 100px}}
.glow{background:radial-gradient(ellipse 60% 40% at 50% 42%,rgba(133,196,64,.28),transparent 70%);animation:pulse 2.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
.counter{font-family:'Inter Tight',sans-serif;font-weight:800;font-size:250px;letter-spacing:-.06em;line-height:.9;color:#fff;text-shadow:0 0 80px rgba(133,196,64,.55)}
.counter em{font-style:normal;color:#85c440}
.facts{display:flex;gap:18px;margin-top:44px;flex-wrap:wrap}
.fact{border:2px solid rgba(185,224,138,.5);border-radius:999px;padding:16px 28px;font-size:28px;font-weight:600;letter-spacing:.06em;background:rgba(10,20,12,.6);animation:pop .6s cubic-bezier(.34,1.56,.64,1) var(--d) both}
.fact b{color:#85c440}
/* end card */
.endlogo{width:860px;max-width:100%;animation:wipe 1.4s cubic-bezier(.77,0,.18,1) .5s both;filter:drop-shadow(0 0 30px rgba(133,196,64,.35))}
@keyframes wipe{from{clip-path:inset(0 100% 0 0);opacity:.3}to{clip-path:inset(0 0 0 0);opacity:1}}
.btn{display:inline-flex;align-items:center;gap:18px;background:#85c440;color:#06100a;font-size:40px;font-weight:700;padding:28px 50px;border-radius:999px;margin-top:70px;
  box-shadow:0 0 0 0 rgba(133,196,64,.6);animation:pop .7s cubic-bezier(.34,1.56,.64,1) 1.9s both,ring 1.6s ease-out 2.6s infinite}
@keyframes ring{0%{box-shadow:0 0 0 0 rgba(133,196,64,.55)}100%{box-shadow:0 0 0 34px rgba(133,196,64,0)}}
.contact{margin-top:34px;font-size:32px;color:#dfe7dc;animation:subin 1s cubic-bezier(.16,1,.3,1) 2.3s both}
.contact b{color:#fff}
`;

const arrow = (s = 30, c = 'currentColor') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const lines = (arr, d0 = 0.7, step = 0.14, cls = 'ln') => arr.map((l, i) => `<span class="${cls}"><span style="--d:${(d0 + i * step).toFixed(2)}s">${l}</span></span>`).join('');
const photo = (src, o = {}) => `<div class="ph" style="background-image:url('${src}');${o.size ? `background-size:${o.size};` : ''}${o.pos ? `background-position:${o.pos};` : ''}--ox:${o.ox || '50%'};--oy:${o.oy || '50%'};${o.s0 ? `--s0:${o.s0};` : ''}${o.s1 ? `--s1:${o.s1};` : ''}"></div>
  <div class="layer tint"></div><div class="layer shade"></div>`;

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
const rain = (() => {
  const r = rng(42);
  let h = '';
  for (let i = 0; i < 90; i++) {
    h += `<i class="drop" style="left:${(r() * 120).toFixed(1)}%;height:${(70 + r() * 110).toFixed(0)}px;--du:${(0.45 + r() * 0.4).toFixed(2)}s;--de:-${(r() * 2).toFixed(2)}s;opacity:${(0.3 + r() * 0.7).toFixed(2)}"></i>`;
  }
  return `<div class="rain">${h}</div>`;
})();

const scenes = [
  { label: 'ABERTURA', body: () => `${photo(PULV, { size: 'auto 122%', pos: '50% 100%', ox: '44%', oy: '40%' })}<div class="flare" style="--fy:37%"></div>
    <div class="content"><span class="kick">Liber Drones apresenta</span>
    <div class="H" style="font-size:132px">${lines(['Sua lavoura', 'não pode', '<span class="g">esperar.</span>'], 0.8, 0.16)}</div>
    <div class="swipe">ARRASTE ${arrow()}</div></div>` },
  { label: 'CENA 01', body: () => `<div class="layer storm"></div>${rain}<div class="layer flash"></div>
    <div class="content" style="bottom:190px"><span class="kick" style="color:#ff8f86">Cena 01 · O problema</span>
    <div class="H" style="font-size:118px">${lines(['Janela', 'apertada.'], 0.6, 0.12, 'ln smash')}
    <div style="height:26px"></div>${lines(['Solo', 'encharcado.'], 1.5, 0.12, 'ln smash')}
    <div style="height:26px"></div>${lines(['Risco de', '<span class="g" style="color:#ff8f86;text-shadow:0 0 50px rgba(255,100,90,.4)">amassamento.</span>'], 2.4, 0.12, 'ln smash')}</div>
    <p class="sub" style="--d:3.2s">E a lavoura não espera.</p></div>` },
  { label: 'CENA 02', body: () => `${photo(PULV, { ox: '43%', oy: '47%', s0: 1.35, s1: 1.12 })}
    <div class="ret" style="--rx:445px;--ry:625px"><div class="r r1"></div><div class="r r2"></div><div class="cross"></div><div class="tag">ROTA PLANEJADA</div></div>
    <div class="flare" style="--fy:44%;--fd:1.2s"></div>
    <div class="content"><span class="kick">Cena 02 · A resposta</span>
    <div class="H" style="font-size:132px">${lines(['A operação', 'vem pelo <span class="g">ar.</span>'], 0.8, 0.16)}</div>
    <p class="sub" style="--d:1.5s">Sem tráfego de máquinas sobre a cultura.</p></div>` },
  { label: 'CAPÍTULO 01', body: () => `${photo(PULV, { size: 'auto 135%', pos: '52% 78%', ox: '50%', oy: '70%' })}<div class="bignum">01</div>
    <div class="flare" style="--fy:62%"></div>
    <div class="content"><span class="chip">CAPÍTULO 01</span>
    <div class="H" style="font-size:128px">${lines(['Pulverização', '<span class="g">agrícola</span>'], 0.8, 0.16)}</div>
    <p class="sub">Aplicação aérea planejada para alcançar a área no momento certo.</p></div>` },
  { label: 'CAPÍTULO 02', body: () => `${photo(DISP, { ox: '55%', oy: '45%', s0: 1.25, s1: 1.05 })}<div class="bignum">02</div>
    <div class="flare" style="--fy:58%"></div>
    <div class="content"><span class="chip">CAPÍTULO 02</span>
    <div class="H" style="font-size:112px">${lines(['Dispersão de', 'sólidos e', '<span class="g">sementes</span>'], 0.8, 0.14)}</div>
    <p class="sub">Planejamento de dose e cobertura.</p></div>` },
  { label: 'CAPÍTULO 03', body: () => `${photo(MAPA, { pos: '62% 50%', ox: '62%', oy: '55%', s0: 1.3, s1: 1.08 })}<div class="layer gridov"></div><div class="scan"></div><div class="bignum">03</div>
    <div class="content"><span class="chip">CAPÍTULO 03</span>
    <div class="H" style="font-size:104px">${lines(['Georreferen-', 'ciamento e', '<span class="g">mapeamento</span>'], 0.8, 0.14)}</div>
    <p class="sub">Limites, planejamento e leitura do terreno.</p></div>` },
  { label: 'PROVA', body: () => `<div class="layer" style="background:#020402"></div><div class="layer glow"></div><div class="floor"></div><div class="flare" style="--fy:40%;--fd:2.6s"></div>
    <div class="content" style="bottom:230px"><span class="kick">Experiência que cobre territórios</span>
    <div class="counter"><span id="cnt">0</span><em id="plus" style="opacity:0">+</em></div>
    <div class="H" style="font-size:64px;letter-spacing:-.02em;margin-top:6px">${lines(['hectares atendidos'], 0.9)}</div>
    <div class="facts"><span class="fact" style="--d:2.6s"><b>PA</b> · <b>TO</b> · <b>MA</b></span><span class="fact" style="--d:2.85s">MAPA <b>✓</b></span><span class="fact" style="--d:3.1s">ANAC <b>✓</b></span></div></div>` },
  { label: 'FIM', body: () => `<div class="layer" style="background:#020402"></div><div class="layer glow"></div><div class="floor" style="opacity:.6"></div><div class="flare" style="--fy:38%;--fd:1.1s"></div>
    <div class="content" style="bottom:auto;top:330px;text-align:center"><img class="endlogo" src="${LOGO}">
    <div class="H" style="font-size:66px;margin-top:70px;letter-spacing:-.03em">${lines(['Sua lavoura não pode <span class="g">esperar.</span>'], 1.3)}</div>
    <div class="btn">Solicitar orçamento ${arrow(38, '#06100a')}</div>
    <div class="contact">WhatsApp <b>(98) 98148-0329</b><br>drones.libersolutions.com.br</div></div>` },
];

const tickJs = (idx, total) => `
window.tick = (t) => {
  const g = ${idx} * ${DUR} + t, ss = Math.floor(g), ff = Math.floor((g - ss) * ${FPS});
  const tc = document.getElementById('tc');
  if (tc) tc.textContent = '00:00:' + String(ss).padStart(2, '0') + ':' + String(ff).padStart(2, '0');
  const c = document.getElementById('cnt');
  if (c) {
    const p = Math.min(1, Math.max(0, (t - 0.6) / 2.0));
    const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    c.textContent = Math.round(15000 * e).toLocaleString('pt-BR');
    document.getElementById('plus').style.opacity = p >= 1 ? 1 : 0;
  }
};`;

function html(i) {
  const s = scenes[i];
  const total = scenes.length;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700;800&display=swap" rel="stylesheet">
<style>${css}</style></head><body>
<div class="layer fadein">${s.body()}</div>
<div class="layer vig" style="z-index:18"></div><div class="grain" style="z-index:19"></div>
<div class="corners"><i></i><i></i><i></i><i></i></div>
<div class="bar t"><span class="rec"><i></i>REC</span><span>${s.label}</span><span id="tc">00:00:00:00</span></div>
<div class="bar b"><img src="${LOGO}"><span>${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span><span>@LIBERDRONES</span></div>
<script>${tickJs(i, total)}</script></body></html>`;
}

async function seek(page, t) {
  await page.evaluate((ms) => {
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; });
    window.tick && window.tick(ms / 1000);
  }, t * 1000);
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'liber-cinema-'));
  const browser = await chromium.launch();
  const videos = [];
  for (let i = 0; i < scenes.length; i++) {
    const n = i + 1;
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    await page.setContent(html(i), { waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((im) => im.decode().catch(() => {}))); });
    await seek(page, STILL_T);
    await page.screenshot({ path: path.join(DIR, `slide-${n}.png`) });
    if (!SO_PNG) {
      const fdir = path.join(tmp, `s${n}`);
      fs.mkdirSync(fdir);
      for (let f = 0; f < FPS * DUR; f++) {
        await seek(page, f / FPS);
        await page.screenshot({ path: path.join(fdir, `${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 93 });
      }
      const out = path.join(DIR, `slide-${n}.mp4`);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(fdir, '%04d.jpg'),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
      fs.rmSync(fdir, { recursive: true, force: true });
      videos.push(out);
    }
    await page.close();
    console.log('ok slide', n);
  }
  await browser.close();
  if (videos.length) {
    const list = path.join(tmp, 'list.txt');
    fs.writeFileSync(list, videos.map((v) => `file '${v}'`).join('\n'));
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(DIR, 'trailer.mp4')]);
    console.log('ok trailer.mp4');
  }
  fs.rmSync(tmp, { recursive: true, force: true });
})();
