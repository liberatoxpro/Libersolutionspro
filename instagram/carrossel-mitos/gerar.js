// Gera as imagens do carrossel "5 mitos sobre pulverização com drone" (1080x1350, 4:5).
// Uso: node instagram/carrossel-mitos/gerar.js
// Fotos opcionais: coloque fotos/slide-1.jpg ... slide-7.jpg para usar como fundo.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '../..');
const LOGO = 'data:image/png;base64,' +
  fs.readFileSync(path.join(ROOT, '47CF89AD-2FC4-44B2-A9E5-80EE8FE61863.png')).toString('base64');

const drone = (size = 520, op = 0.9) => `
<svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" stroke="#b8ff58" stroke-width="2.2" opacity="${op}">
  <g stroke-linecap="round">
    <line x1="60" y1="60" x2="140" y2="140"/><line x1="140" y1="60" x2="60" y2="140"/>
    <circle cx="50" cy="50" r="26"/><circle cx="150" cy="50" r="26"/>
    <circle cx="50" cy="150" r="26"/><circle cx="150" cy="150" r="26"/>
    <circle cx="50" cy="50" r="4" fill="#b8ff58"/><circle cx="150" cy="50" r="4" fill="#b8ff58"/>
    <circle cx="50" cy="150" r="4" fill="#b8ff58"/><circle cx="150" cy="150" r="4" fill="#b8ff58"/>
    <rect x="80" y="80" width="40" height="40" rx="10" fill="#0d2a22"/>
    <circle cx="100" cy="100" r="7" stroke="#28dfb5"/>
  </g>
  <g stroke="#28dfb5" stroke-width="1.4" stroke-dasharray="3 5" opacity=".8">
    <line x1="88" y1="128" x2="70" y2="198"/><line x1="100" y1="128" x2="100" y2="198"/><line x1="112" y1="128" x2="130" y2="198"/>
  </g>
</svg>`;

const icon = {
  area: `<path d="M10 70 L40 20 L70 50 L90 30" /><rect x="8" y="8" width="84" height="84" rx="10"/>`,
  rain: `<path d="M25 45a20 20 0 0 1 38-8a15 15 0 1 1 7 28H28a14 14 0 0 1-3-20z"/><path d="M35 75l-5 12M52 75l-5 12M69 75l-5 12"/>`,
  tree: `<path d="M50 90V55"/><path d="M50 10l25 35H25z"/><path d="M50 28l30 40H20z"/>`,
  gps: `<circle cx="50" cy="42" r="12"/><path d="M50 92s30-28 30-50a30 30 0 0 0-60 0c0 22 30 50 30 50z"/>`,
  badge: `<path d="M50 8l34 12v26c0 22-15 38-34 46C31 84 16 68 16 46V20z"/><path d="M34 50l11 11 21-23"/>`,
};
const ic = (k) => `<svg width="110" height="110" viewBox="0 0 100 100" fill="none" stroke="#b8ff58" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${icon[k]}</svg>`;

const slides = [
  { type: 'hook' },
  { type: 'myth', n: 1, icon: 'area', myth: 'Drone é só pra área pequena', truth: 'Atendemos do pequeno produtor à usina e à empresa florestal' },
  { type: 'myth', n: 2, icon: 'rain', myth: 'Com chuva, tem que esperar o solo secar', truth: 'O drone voa sobre solo encharcado. Não atola e não compacta' },
  { type: 'myth', n: 3, icon: 'tree', myth: 'Cana alta e eucalipto, drone não alcança', truth: 'A aplicação é feita por cima, seja qual for a altura da cultura' },
  { type: 'myth', n: 4, icon: 'gps', myth: 'Aplicação aérea é no olho', truth: 'Rota planejada por GPS, com faixa e vazão definidas antes do voo' },
  { type: 'myth', n: 5, icon: 'badge', myth: 'Qualquer um pode voar drone agrícola', truth: 'A operação exige registro no MAPA e na ANAC. A Liber Drones tem os dois' },
  { type: 'cta' },
];

const css = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px}
body{font-family:Inter,sans-serif;color:#f2fbf7;background:#070e15;overflow:hidden;position:relative}
.bg{position:absolute;inset:0;background:
  radial-gradient(ellipse 70% 50% at 85% 5%,#1d4a3c 0,transparent 70%),
  radial-gradient(ellipse 60% 45% at 0% 100%,#12313a 0,transparent 70%),#070e15}
.photo{position:absolute;inset:0;background-size:cover;background-position:center}
.photo:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#070e15d9 0%,#070e15a6 40%,#070e15f2 100%)}
.grid{position:absolute;inset:0;opacity:.07;background-image:linear-gradient(#b8ff58 1px,transparent 1px),linear-gradient(90deg,#b8ff58 1px,transparent 1px);background-size:90px 90px}
.wrap{position:relative;height:100%;padding:72px 80px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:18px;font-weight:900;font-size:30px;letter-spacing:3px}
.brand img{width:64px;height:64px}
.brand em{font-style:normal;color:#b8ff58}
.count{font-size:26px;font-weight:700;color:#90a8b2;letter-spacing:2px}
.foot{display:flex;align-items:center;justify-content:space-between;font-size:28px;font-weight:700;color:#b9d5d0}
.swipe{display:flex;align-items:center;gap:14px;color:#b8ff58}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center}
.tag{display:inline-block;font-size:28px;font-weight:800;letter-spacing:4px;text-transform:uppercase;padding:12px 22px;border-radius:40px}
.tag.myth{color:#ff8f9c;background:#ff6f8618;border:2px solid #ff6f8660}
.tag.truth{color:#081511;background:#b8ff58}
.mythtxt{font-size:62px;font-weight:800;line-height:1.15;letter-spacing:-1.5px;margin:30px 0 70px;color:#9fb3b8;line-height:1.25;position:relative}
.mythtxt s{text-decoration-color:#ff6f86;text-decoration-thickness:5px}
.truthtxt{font-size:70px;font-weight:900;line-height:1.12;letter-spacing:-2px;margin-top:30px}
.truthtxt b{color:#b8ff58}
.ic{margin-bottom:46px}
.hookh{font-size:118px;font-weight:900;line-height:1.0;letter-spacing:-4px}
.hookh b{color:#b8ff58}
.hooks{font-size:44px;font-weight:600;color:#b9d5d0;margin-top:40px;line-height:1.3}
.hooks b{color:#fff}
.drone{position:absolute;right:-70px;top:150px}
.ctah{font-size:92px;font-weight:900;line-height:1.02;letter-spacing:-3px}
.ctah b{color:#b8ff58}
.rows{margin-top:56px;display:grid;gap:24px}
.row{display:flex;align-items:center;gap:22px;font-size:40px;font-weight:700}
.dot{width:54px;height:54px;border-radius:16px;background:#183a35;border:2px solid #356455;display:grid;place-items:center;flex:0 0 54px}
.btn{margin-top:66px;display:inline-flex;align-items:center;gap:18px;align-self:flex-start;background:linear-gradient(110deg,#b8ff58,#60eab0);color:#081811;font-size:44px;font-weight:900;padding:30px 48px;border-radius:24px}
.biglogo{position:absolute;right:70px;top:300px;width:300px;opacity:.16}
`;

const arrow = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const check = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#b8ff58" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>`;
const pin = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#b8ff58" stroke-width="2.6"><path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>`;

function body(s, i, total) {
  const top = `<div class="top"><div class="brand"><img src="${LOGO}">LIBER <em>DRONES</em></div><div class="count">${i + 1}/${total}</div></div>`;
  const foot = (last) => `<div class="foot"><span>@liberdrones</span>${last ? '' : `<span class="swipe">arraste ${arrow}</span>`}</div>`;
  if (s.type === 'hook') return `${top}<div class="drone">${drone(390, .85)}</div>
    <div class="mid"><div class="hookh"><b>5 mitos</b><br>sobre<br>pulverização<br>com drone</div>
    <div class="hooks">o <b>#5</b> pode virar dor de<br>cabeça pra sua fazenda</div></div>${foot(false)}`;
  if (s.type === 'myth') return `${top}<div class="mid"><div class="ic">${ic(s.icon)}</div>
    <div><span class="tag myth">Mito ${s.n}</span></div>
    <div class="mythtxt"><s>“${s.myth}”</s></div>
    <div><span class="tag truth">Verdade</span></div>
    <div class="truthtxt">${s.truth.replace(/MAPA|ANAC|Liber Drones/g, (m) => `<b>${m}</b>`)}</div></div>${foot(false)}`;
  return `${top}<img class="biglogo" src="${LOGO}"><div class="mid"><div class="ctah">Pulverização<br>e semeadura<br><b>com drone</b></div>
    <div class="rows">
      <div class="row"><span class="dot">${pin}</span>Pará · Maranhão · Tocantins</div>
      <div class="row"><span class="dot">${check}</span>Regularizada no MAPA e na ANAC</div>
      <div class="row"><span class="dot">${check}</span>Produtores, cooperativas, usinas e florestais</div>
    </div>
    <div class="btn">Peça seu orçamento no direct ${arrow}</div></div>${foot(true)}`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (let i = 0; i < slides.length; i++) {
    const foto = ['jpg', 'jpeg', 'png'].map((e) => path.join(DIR, 'fotos', `slide-${i + 1}.${e}`)).find(fs.existsSync);
    const bg = foto
      ? `<div class="photo" style="background-image:url('data:image/${path.extname(foto).slice(1)};base64,${fs.readFileSync(foto).toString('base64')}')"></div>`
      : `<div class="bg"></div><div class="grid"></div>`;
    await page.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${bg}<div class="wrap">${body(slides[i], i, slides.length)}</div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(DIR, `slide-${i + 1}.png`);
    await page.screenshot({ path: out });
    console.log('ok', path.relative(ROOT, out), foto ? '(com foto)' : '');
  }
  await browser.close();
})();
