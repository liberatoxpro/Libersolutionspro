// Gera as imagens do carrossel "5 mitos sobre pulverização com drone" (1080x1350, 4:5)
// no padrão visual do site drones.libersolutions.com.br.
// Uso (na raiz do repositório): node instagram/carrossel-mitos/gerar.js
// Fotos opcionais: fotos/slide-N.jpg substitui a foto do slide N (slides 1 e 7 usam foto).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIR = __dirname;
const MARCA = path.resolve(DIR, '../marca');
const b64 = (p, mime) => `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
const LOGO_CLARO = b64(path.join(MARCA, 'logo-liber-drones-claro.png'), 'image/png');
const LOGO_ESCURO = b64(path.join(MARCA, 'logo-liber-drones-escuro.png'), 'image/png');
const fotoPadrao = {
  1: path.join(MARCA, 'foto-pulverizacao.jpg'),
  7: path.join(MARCA, 'foto-dispersao.jpg'),
};

const slides = [
  { type: 'hook' },
  { type: 'myth', n: 1, myth: 'Drone é só pra área pequena.', truth: 'Atendemos do pequeno produtor à usina e à empresa florestal.' },
  { type: 'myth', n: 2, myth: 'Com chuva, tem que esperar o solo secar.', truth: 'O drone alcança a área sem tráfego de máquinas. Não atola e não amassa a cultura.' },
  { type: 'myth', n: 3, myth: 'Cana alta e eucalipto, drone não alcança.', truth: 'A aplicação é feita por cima, seja qual for a altura da cultura.' },
  { type: 'myth', n: 4, myth: 'Aplicação aérea é no olho.', truth: 'Cada operação é planejada antes de decolar: área, rota, faixa e dose.' },
  { type: 'myth', n: 5, myth: 'Qualquer um pode voar drone agrícola.', truth: 'A operação exige registro no MAPA e na ANAC. A Liber Drones tem os dois.', hl: ['MAPA', 'ANAC'] },
  { type: 'cta' },
];

const css = `
:root{--white:#fff;--soft:#f4f6f2;--ink:#0f1a12;--text:#3f4a42;--muted:#6c776e;--line:#e2e7df;
--green:#85c440;--green-600:#4f8f2a;--green-700:#3a6e1d;--forest:#0e1f12}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px}
body{font-family:Inter,sans-serif;color:var(--text);overflow:hidden;position:relative;-webkit-font-smoothing:antialiased}
h1,h2,.h{font-family:'Inter Tight',Inter,sans-serif;color:var(--ink);font-weight:600;letter-spacing:-.035em}
.wrap{position:relative;height:100%;padding:80px 84px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;justify-content:space-between}
.logo{height:46px;width:auto}
.count{font-size:24px;font-weight:600;letter-spacing:.08em}
.eyebrow{display:inline-flex;align-items:center;gap:18px;font-size:24px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--green-600)}
.eyebrow:before{content:"";width:44px;height:3px;background:currentColor}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center}
.foot{display:flex;align-items:center;justify-content:space-between;font-size:26px;font-weight:500}
.swipe{display:flex;align-items:center;gap:12px;font-weight:600}
.green{color:var(--green)}
/* slide com foto */
.dark{background:var(--forest);color:#fff}
.dark .h{color:#fff}
.dark .eyebrow{color:#b9e08a}
.dark .count,.dark .foot{color:#d7ded3}
.photo{position:absolute;inset:0;background-size:cover;background-position:center}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,31,18,.55) 0%,rgba(14,31,18,.25) 30%,rgba(14,31,18,.78) 62%,rgba(14,31,18,.96) 100%)}
.hook .photo{bottom:430px;background-position:center 40%}
.hook .shade{background:linear-gradient(180deg,rgba(14,31,18,.55) 0%,rgba(14,31,18,0) 22%,rgba(14,31,18,0) 45%,rgba(14,31,18,.85) 62%,#0e1f12 70%)}
.hook .mid{justify-content:flex-end;padding-bottom:40px}
.hookh{font-size:112px;line-height:.98;margin-top:30px}
.hooks{font-size:36px;line-height:1.45;color:#e2e7df;margin-top:34px;max-width:820px}
.hooks b{color:#fff;font-weight:600}
/* slides de mito (claros) */
.light{background:var(--soft)}
.light .count{color:var(--muted)}
.light .foot{color:var(--muted)}
.light .swipe{color:var(--green-700)}
.card{background:#fff;border:1px solid var(--line);border-radius:28px;box-shadow:0 1px 2px rgba(15,26,18,.04),0 24px 48px -20px rgba(15,26,18,.18);padding:56px 56px 60px;margin-top:40px}
.num{display:inline-block;font-size:24px;font-weight:600;color:var(--ink);background:var(--soft);border:1px solid var(--line);border-radius:30px;padding:8px 20px;margin-bottom:28px}
.label{font-size:22px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:16px}
.label.m{color:#a3443f}
.label.t{color:var(--green-600)}
.mythtxt{font-family:'Inter Tight',Inter,sans-serif;font-weight:500;font-size:54px;line-height:1.18;letter-spacing:-.02em;color:var(--muted);text-decoration:line-through;text-decoration-color:#c9655f;text-decoration-thickness:4px}
.sep{height:1px;background:var(--line);margin:44px 0}
.truthtxt{font-size:72px;line-height:1.08}
.truthtxt b{color:var(--green-600);font-weight:600}
.sideh{font-size:84px;line-height:1;margin-top:26px}
/* cta */
.ctah{font-size:96px;line-height:1;margin-top:30px}
.stats{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid rgba(255,255,255,.2);margin-top:50px}
.stat{padding:30px 0 0}
.stat+.stat{border-left:1px solid rgba(255,255,255,.2);padding-left:36px}
.stat strong{display:block;font-family:'Inter Tight',Inter,sans-serif;font-size:60px;font-weight:600;letter-spacing:-.03em;color:#fff}
.stat span{font-size:24px;color:#d7ded3;line-height:1.4}
.checks{margin-top:40px;display:grid;gap:18px;font-size:30px;color:#eef1ec}
.checks div{display:flex;gap:16px;align-items:center}
.ck{width:40px;height:40px;border-radius:50%;background:rgba(133,196,64,.2);display:grid;place-items:center;flex:0 0 40px}
.btn{margin-top:50px;display:inline-flex;align-items:center;gap:16px;align-self:flex-start;background:var(--green);color:var(--ink);font-size:36px;font-weight:600;padding:26px 44px;border-radius:999px}
.wa{margin-top:22px;font-size:28px;color:#d7ded3}
.wa b{color:#fff;font-weight:600}
`;

const arrow = (c = 'currentColor', s = 34) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const check = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#85c440" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>`;

function render(s, i, total, foto) {
  const count = `<div class="count">${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>`;
  if (s.type === 'hook') return `<body class="dark hook"><div class="photo" style="background-image:url('${foto}')"></div><div class="shade"></div>
    <div class="wrap"><div class="top"><img class="logo" src="${LOGO_CLARO}">${count}</div>
    <div class="mid"><span class="eyebrow">Pulverização com drone</span>
      <h1 class="h hookh">5 mitos que ainda<br>atrasam sua <span class="green">lavoura.</span></h1>
      <p class="hooks">O <b>#5</b> é o que mais dá dor de cabeça pra fazenda.</p></div>
    <div class="foot"><span>@liberdrones</span><span class="swipe">Arraste ${arrow()}</span></div></div></body>`;
  if (s.type === 'myth') {
    let truth = s.truth;
    (s.hl || []).forEach((w) => { truth = truth.replace(w, `<b>${w}</b>`); });
    return `<body class="light"><div class="wrap"><div class="top"><img class="logo" src="${LOGO_ESCURO}">${count}</div>
    <div class="mid"><span class="eyebrow">Mito ${String(s.n).padStart(2, '0')}</span>
      <div class="card"><div class="label m">Mito</div><div class="mythtxt">“${s.myth.replace(/\.$/, '')}”</div>
      <div class="sep"></div><div class="label t">Verdade</div><h2 class="h truthtxt">${truth}</h2></div></div>
    <div class="foot"><span>@liberdrones</span><span class="swipe">Arraste ${arrow()}</span></div></div></body>`;
  }
  return `<body class="dark"><div class="photo" style="background-image:url('${foto}')"></div><div class="shade" style="background:linear-gradient(180deg,rgba(14,31,18,.7),rgba(14,31,18,.93) 45%,rgba(14,31,18,.98))"></div>
    <div class="wrap"><div class="top"><img class="logo" src="${LOGO_CLARO}">${count}</div>
    <div class="mid"><span class="eyebrow">Liber Drones</span>
      <h1 class="h ctah">Sua lavoura<br>não pode <span class="green">esperar.</span></h1>
      <div class="stats"><div class="stat"><strong>15.000+</strong><span>hectares atendidos</span></div>
        <div class="stat"><strong>3 estados</strong><span>Pará, Tocantins e Maranhão</span></div></div>
      <div class="checks"><div><span class="ck">${check}</span>Regularizada no MAPA e na ANAC</div>
        <div><span class="ck">${check}</span>Pulverização, dispersão de sementes e mapeamento</div></div>
      <div class="btn">Solicitar orçamento ${arrow('#0f1a12', 36)}</div>
      <div class="wa">WhatsApp <b>(98) 98148-0329</b></div></div>
    <div class="foot"><span>@liberdrones</span><span>drones.libersolutions.com.br</span></div></div></body>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (let i = 0; i < slides.length; i++) {
    const n = i + 1;
    const custom = ['jpg', 'jpeg', 'png'].map((e) => path.join(DIR, 'fotos', `slide-${n}.${e}`)).find(fs.existsSync);
    const fp = custom || fotoPadrao[n];
    const foto = fp ? b64(fp, fp.endsWith('png') ? 'image/png' : 'image/jpeg') : '';
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@500;600;700&display=swap" rel="stylesheet">
      <style>${css}</style></head>${render(slides[i], i, slides.length, foto)}</html>`;
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(DIR, `slide-${n}.png`);
    await page.screenshot({ path: out });
    console.log('ok', path.basename(out), custom ? '(foto personalizada)' : '');
  }
  await browser.close();
})();
