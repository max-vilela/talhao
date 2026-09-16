const CORES = {
  GALHEIRO: '#c2703d', JAVA: '#3d6bc2', MATO_GROSSO: '#8a3dc2',
  PANAMA: '#3dc2ad', PPEDRA: '#d13438', PROMISSAO: '#c2c23d', TUCANO: '#c23d70',
};
const ORDEM = ['PPEDRA', 'GALHEIRO', 'JAVA', 'MATO_GROSSO', 'PANAMA', 'PROMISSAO', 'TUCANO'];
const fmt = m => m == null ? '—' : (m / 1000).toFixed(2).replace('.', ',');

const map = L.map('mapa', { attributionControl: false, preferCanvas: true });
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 19, maxNativeZoom: 17 }).addTo(map);
L.control.attribution({ prefix: false }).addAttribution('Esri, Maxar').addTo(map);

const camadas = {};       // chave fazenda -> {talhoes:{cod:layer}, rede:layerGroup, sede:marker}
const camadaSelecao = L.layerGroup().addTo(map);
let boundsGeral = null;
let selecionado = null;   // {faz, cod}

for (const faz of ORDEM) {
  const d = FAZENDAS[faz];
  const cor = CORES[faz];
  const grupo = { talhoes: {}, rede: L.layerGroup() };

  for (const [cod, anel] of Object.entries(d.talhoes)) {
    const poly = L.polygon(anel, { color: cor, weight: 1, fillOpacity: .12, fillColor: cor })
      .addTo(map)
      .on('click', e => {
        L.DomEvent.stopPropagation(e);
        if (simulando) { adicionaPontoSim(e.latlng); return; }
        seleciona(faz, cod);
      })
      .bindTooltip(cod, { permanent: true, direction: 'center', className: 'rotulo-talhao', interactive: false });
    grupo.talhoes[cod] = poly;
    const b = poly.getBounds();
    boundsGeral = boundsGeral ? boundsGeral.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast());
  }

  for (const r of d.rotas) {
    if (r.p && r.p.length) L.polyline(r.p, { color: cor, weight: 2, opacity: .55 }).addTo(grupo.rede);
  }

  grupo.sede = L.circleMarker(d.sede, { radius: 7, color: '#fff', weight: 2, fillColor: '#d92b2b', fillOpacity: 1 })
    .addTo(map)
    .bindTooltip(`Sede ${d.nome}`, { direction: 'top' });

  camadas[faz] = grupo;
}
if (boundsGeral) setTimeout(() => {
  map.invalidateSize();
  map.fitBounds(boundsGeral, { padding: [24, 24] });
}, 0);

function desseleciona() {
  document.getElementById('ficha').classList.remove('on');
  if (selecionado) {
    const ant = camadas[selecionado.faz].talhoes[selecionado.cod];
    if (ant) ant.setStyle({ weight: 1, fillOpacity: .12 });
    document.querySelectorAll('.talhoes button.sel').forEach(b => b.classList.remove('sel'));
    selecionado = null;
  }
  camadaSelecao.clearLayers();
  limpaSimulacao();
}

function seleciona(faz, cod, { zoom = false } = {}) {
  if (selecionado && selecionado.faz === faz && selecionado.cod === cod) {
    desseleciona();
    return;
  }

  const d = FAZENDAS[faz];
  const r = d.rotas.find(x => x.t === cod);
  if (!r) return;

  if (selecionado) {
    const ant = camadas[selecionado.faz].talhoes[selecionado.cod];
    if (ant) ant.setStyle({ weight: 1, fillOpacity: .12 });
    document.querySelectorAll('.talhoes button.sel').forEach(b => b.classList.remove('sel'));
  }
  selecionado = { faz, cod };
  camadaSelecao.clearLayers();
  limpaSimulacao();

  const poly = camadas[faz].talhoes[cod];
  if (poly) {
    poly.setStyle({ weight: 3, fillOpacity: .3 });
    if (zoom) map.fitBounds(poly.getBounds(), { padding: [80, 80], maxZoom: 16 });
  }
  if (r.p && r.p.length) {
    L.polyline(r.p, { color: '#000', weight: 7, opacity: .3 }).addTo(camadaSelecao);
    L.polyline(r.p, { color: '#d92b2b', weight: 3 }).addTo(camadaSelecao);
  }

  const btn = document.querySelector(`.talhoes button[data-faz="${faz}"][data-cod="${CSS.escape(cod)}"]`);
  if (btn) { btn.classList.add('sel'); btn.closest('details').open = true; btn.scrollIntoView({ block: 'nearest' }); }

  document.getElementById('ficha').style.borderLeftColor = CORES[faz];
  document.getElementById('ft').textContent = cod;
  document.getElementById('ff').textContent = d.nome;
  document.getElementById('fn').innerHTML = `
    <div class="num"><b>${fmt(r.max)} km</b><span>Máx</span></div>
    <div class="num"><b>${fmt(r.min)} km</b><span>Mín</span></div>
    <div class="num"><b>${fmt(r.reta)} km</b><span>Reta</span></div>
    <div class="num"><b>${r.f == null ? '—' : r.f.toFixed(2).replace('.', ',')}</b><span>Fator</span></div>
    <div class="num"><b>${r.ha.toFixed(0)}</b><span>ha</span></div>`;
  document.getElementById('fo').textContent = r.obs || '';
  document.getElementById('ficha').classList.add('on');
}

document.querySelector('#ficha .fechar').onclick = desseleciona;
map.on('click', e => { if (simulando) { adicionaPontoSim(e.latlng); return; } desseleciona(); });

// --- sidebar: lista de fazendas / talhões ---
const lista = document.getElementById('lista');
lista.innerHTML = ORDEM.map(faz => {
  const d = FAZENDAS[faz];
  const badge = d.situacao === 'ok' ? '' : d.situacao === 'parcial' ? ' al' : ' al';
  const cods = Object.keys(d.talhoes).sort();
  return `<details class="fazenda" data-faz="${faz}">
    <summary>
      <span class="pt" style="background:${CORES[faz]}"></span>
      <span class="nm">${d.nome}</span>
      <span class="n">${cods.length}</span>
      <span class="seta">▶</span>
    </summary>
    <p class="sub"><span class="badge${badge}">${d.situacao_label}</span></p>
    <label class="estradas"><input type="checkbox" data-rede="${faz}"> mostrar malha de estradas</label>
    <div class="talhoes">${cods.map(c => `<button data-faz="${faz}" data-cod="${c}">${c}</button>`).join('')}</div>
  </details>`;
}).join('');

lista.querySelectorAll('.talhoes button').forEach(b => b.onclick = () => seleciona(b.dataset.faz, b.dataset.cod, { zoom: true }));
lista.querySelectorAll('summary').forEach(s => s.addEventListener('click', () => {
  const faz = s.closest('details').dataset.faz;
  setTimeout(() => { if (s.closest('details').open) voaPara(faz); }, 0);
}));
lista.querySelectorAll('input[data-rede]').forEach(chk => chk.onchange = () => {
  const faz = chk.dataset.rede;
  if (chk.checked) camadas[faz].rede.addTo(map); else map.removeLayer(camadas[faz].rede);
});

function voaPara(faz) {
  const d = FAZENDAS[faz];
  const cods = Object.keys(d.talhoes);
  let b = null;
  for (const c of cods) {
    const pb = camadas[faz].talhoes[c].getBounds();
    b = b ? b.extend(pb) : L.latLngBounds(pb.getSouthWest(), pb.getNorthEast());
  }
  if (b) map.fitBounds(b, { padding: [30, 30] });
}

// --- busca ---
const busca = document.getElementById('busca');
const resultados = document.getElementById('resultados');
busca.oninput = () => {
  const q = busca.value.trim().toLowerCase();
  if (!q) { resultados.innerHTML = ''; return; }
  const achados = [];
  for (const faz of ORDEM) {
    for (const cod of Object.keys(FAZENDAS[faz].talhoes)) {
      if (cod.toLowerCase().includes(q)) achados.push({ faz, cod });
      if (achados.length >= 30) break;
    }
  }
  resultados.innerHTML = achados.map(a => `<button class="res" data-faz="${a.faz}" data-cod="${a.cod}">
    <b>${a.cod}</b><span>${FAZENDAS[a.faz].nome}</span></button>`).join('')
    || '<p class="vazio">Nada encontrado.</p>';
  resultados.querySelectorAll('.res').forEach(b => b.onclick = () => {
    seleciona(b.dataset.faz, b.dataset.cod, { zoom: true });
    busca.value = ''; resultados.innerHTML = '';
  });
};

// --- exportar ---
const CAMPOS = [
  { k: 'fazenda', label: 'Fazenda', get: r => r.fazenda },
  { k: 'talhao', label: 'Talhão', get: r => r.talhao },
  { k: 'max', label: 'Distância máxima (km)', get: r => fmt(r.max) },
  { k: 'min', label: 'Distância mínima (km)', get: r => fmt(r.min) },
  { k: 'reta', label: 'Distância reta (km)', get: r => fmt(r.reta) },
  { k: 'fator', label: 'Fator', get: r => r.f == null ? '' : r.f.toFixed(2).replace('.', ',') },
  { k: 'area', label: 'Área (ha)', get: r => r.ha.toFixed(0) },
  { k: 'obs', label: 'Observação', get: r => r.obs || '' },
];

function linhasExport() {
  const out = [];
  for (const faz of ORDEM) {
    const d = FAZENDAS[faz];
    for (const r of d.rotas) out.push({ fazenda: d.nome, situacao: d.situacao_label, talhao: r.t, ...r });
  }
  return out;
}

function exportaCSV(chaves, nomeArquivo) {
  const cols = CAMPOS.filter(c => chaves.includes(c.k));
  const linhas = linhasExport();
  const linhaCSV = valores => valores.map(v => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';');
  const bom = '﻿';
  const csv = bom + linhaCSV(cols.map(c => c.label)) + '\n'
    + linhas.map(r => linhaCSV(cols.map(c => c.get(r)))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo; a.click();
  URL.revokeObjectURL(url);
}

const modalCampos = document.getElementById('modalCampos');
document.getElementById('camposLista').innerHTML = CAMPOS.map(c =>
  `<label><input type="checkbox" value="${c.k}" checked> ${c.label}</label>`).join('');
document.getElementById('camposCancelar').onclick = () => modalCampos.classList.remove('on');
modalCampos.onclick = e => { if (e.target === modalCampos) modalCampos.classList.remove('on'); };
document.getElementById('camposExportar').onclick = () => {
  const chaves = Array.from(document.querySelectorAll('#camposLista input:checked')).map(i => i.value);
  if (chaves.length) exportaCSV(chaves, 'talhoes_personalizado.csv');
  modalCampos.classList.remove('on');
};

// --- nav do topo: Exportar / Fazendas (dropdowns) + Pendências (modal direto) ---
document.getElementById('painelExportar').innerHTML = `
  <button class="item" id="expTodos">Todos os dados</button>
  <button class="item" id="expMax">Distância máxima</button>
  <button class="item" id="expCampos">Escolher campos…</button>`;

document.getElementById('painelFazendas').innerHTML = ORDEM.map(faz => {
  const d = FAZENDAS[faz];
  return `<details class="arvore-item">
    <summary><span class="pt" style="background:${CORES[faz]}"></span> ${d.nome} <span class="seta">▶</span></summary>
    <div class="itens">
      <a class="item" href="${d.slug}.html">Consultar tabela</a>
      <a class="item" href="BANCADA_UNIFICADA.html">Bancada de estradas (todas as fazendas)</a>
      <a class="item" href="${d.slug}_distancias.xlsx" download>Planilha .xlsx</a>
      <a class="item" href="${d.slug}_rotas.kml" download>KML das rotas</a>
    </div>
  </details>`;
}).join('') + `<button class="item" id="btSobre">Como a medida é feita</button>`;

let corMalhaMapaInicial = '#ffffff';
try { corMalhaMapaInicial = localStorage.getItem('malha_cor') || corMalhaMapaInicial; } catch (e) {}
document.getElementById('painelCamadas').innerHTML = `
  <label class="camada-ck"><input type="checkbox" id="ckContorno" checked> Contorno dos talhões</label>
  <label class="camada-ck"><input type="checkbox" id="ckRotulos" checked> Rótulos dos talhões</label>
  <label class="camada-ck"><input type="checkbox" id="ckMalha"> Malha de estradas (divisas)
    <input type="color" id="corMalhaMapa" value="${corMalhaMapaInicial}" title="Cor da malha"></label>
  <label class="camada-ck"><input type="checkbox" id="ckTracadas"> Estradas desenhadas na bancada</label>
  <p class="hint" style="padding:0 8px 8px;margin:-2px 0 0">Malha e estradas desenhadas carregam sob demanda, na primeira vez que a caixa é marcada.</p>`;

document.getElementById('ckContorno').onchange = e => {
  const visivel = e.target.checked;
  for (const faz of ORDEM) for (const poly of Object.values(camadas[faz].talhoes))
    poly.setStyle(visivel ? { opacity: 1, fillOpacity: .12 } : { opacity: 0, fillOpacity: 0 });
};
document.getElementById('ckRotulos').onchange = e => {
  const visivel = e.target.checked;
  for (const faz of ORDEM) for (const [cod, poly] of Object.entries(camadas[faz].talhoes)) {
    if (visivel) poly.bindTooltip(cod, { permanent: true, direction: 'center', className: 'rotulo-talhao', interactive: false });
    else poly.unbindTooltip();
  }
};

let malhaCamada = null, tracadasCamada = null, camadasExtrasCarregadas = false;
function carregaCamadasExtras(cb) {
  if (camadasExtrasCarregadas) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'malha_estradas.js?v=20260915h';
  s.onload = () => { camadasExtrasCarregadas = true; cb(); };
  document.head.appendChild(s);
}
document.getElementById('ckMalha').onchange = e => {
  if (!e.target.checked) { if (malhaCamada) map.removeLayer(malhaCamada); return; }
  carregaCamadasExtras(() => {
    if (!malhaCamada) {
      malhaCamada = L.layerGroup();
      const cor = document.getElementById('corMalhaMapa').value;
      for (const faz of ORDEM) (MALHA[faz] || []).forEach(l =>
        L.polyline(l, { color: cor, weight: 1.5, opacity: .8 }).addTo(malhaCamada));
    }
    malhaCamada.addTo(map);
  });
};
document.getElementById('corMalhaMapa').oninput = e => {
  if (malhaCamada) malhaCamada.eachLayer(l => l.setStyle({ color: e.target.value }));
  try { localStorage.setItem('malha_cor', e.target.value); } catch (err) {}
};
document.getElementById('ckTracadas').onchange = e => {
  if (!e.target.checked) { if (tracadasCamada) map.removeLayer(tracadasCamada); return; }
  carregaCamadasExtras(() => {
    if (!tracadasCamada) {
      tracadasCamada = L.layerGroup();
      TRACADAS.forEach(t => L.polyline(t.pts, { color: '#ff8a00', weight: 3, opacity: .9 })
        .bindTooltip(t.nome, { sticky: true }).addTo(tracadasCamada));
    }
    tracadasCamada.addTo(map);
  });
};

document.getElementById('expTodos').onclick = () => exportaCSV(CAMPOS.map(c => c.k), 'talhoes_todos_os_dados.csv');
document.getElementById('expMax').onclick = () => exportaCSV(['fazenda', 'talhao', 'max'], 'talhoes_distancia_maxima.csv');
document.getElementById('expCampos').onclick = () => modalCampos.classList.add('on');

const modalInfo = document.getElementById('modalInfo');
function abreInfo(titulo, html, { larga = false } = {}) {
  document.getElementById('infoTitulo').textContent = titulo;
  document.getElementById('infoCorpo').innerHTML = html;
  document.getElementById('infoCaixa').classList.toggle('larga', larga);
  modalInfo.classList.add('on');
}
document.getElementById('btSobre').onclick = () => abreInfo('Como a medida é feita', `
  <p>Malha de estradas montada a partir das divisas dos talhões e completada com estradas conferidas em campo.
  Sobre ela roda um cálculo de menor caminho a partir da sede.</p>
  <dl>
    <dt>Máx</dt><dd>Pior caso, até o ponto mais extremo do talhão.</dd>
    <dt>Mín</dt><dd>Até o acesso mais próximo.</dd>
    <dt>Reta</dt><dd>Só referência.</dd>
    <dt>Fator</dt><dd>Máx ÷ reta — em talhão colado na sede o fator estoura sozinho, olhe a distância.</dd>
  </dl>
  <p>Não considera sentido de tráfego, peso, ponte, porteira ou chuva.</p>`);
function semAcesso(faz) { return FAZENDAS[faz].rotas.filter(r => r.max == null).length; }

// Contornos que se sobrepõem no KML (contorno antigo/pai ainda no projeto do
// Google Earth, de antes da subdivisão) — achado numa conferência manual,
// não vem do cálculo. Precisa corrigir no Google Earth, não aqui.
const SOBREPOSTOS = [
  { faz: 'Tucano', pai: 'T-26A', engloba: 'T-26B, T-26C' },
  { faz: 'Tucano', pai: 'T-27C', engloba: 'T-27A, T-27B' },
  { faz: 'Tucano', pai: 'T-27D', engloba: 'T-27C' },
  { faz: 'Tucano', pai: 'T-29D', engloba: 'T-29A, T-29B, T-29C' },
  { faz: 'Tucano', pai: 'T-30C', engloba: 'T-30A, T-30B' },
  { faz: 'Tucano', pai: 'T-30D', engloba: 'T-30C' },
  { faz: 'Tucano', pai: 'T-33F', engloba: 'T-33C, T-33D, T-33E' },
  { faz: 'Tucano', pai: 'T-40B', engloba: 'parte de T-40A' },
  { faz: 'Tucano', pai: 'T-41B', engloba: 'parte de T-41A' },
  { faz: 'Ponte de Pedra', pai: 'T-01C', engloba: 'T-01A, T-01B' },
  { faz: 'Ponte de Pedra', pai: 'T-05A', engloba: 'T-05S' },
  { faz: 'Galheiro', pai: 'R-07', engloba: 'R-45A' },
  { faz: 'Java', pai: 'T-04A', engloba: 'T-04B' },
  { faz: 'Java', pai: 'T-06B / T-06C / T-06D / T-06E', engloba: 'quase todos sobrepostos entre si' },
  { faz: 'Java', pai: 'T-14A', engloba: 'T-14D (quase idênticos)' },
  { faz: 'Mato Grosso', pai: 'A-01', engloba: 'T-21R (quase idênticos)' },
  { faz: 'Promissão', pai: 'T-29B', engloba: 'T-29C' },
  { faz: 'Promissão', pai: 'T-30C', engloba: 'T-30B' },
];

document.getElementById('btPendencias').onclick = () => {
  const naoConferida = ORDEM.filter(f => FAZENDAS[f].situacao !== 'ok');
  const linhasSemEstrada = [];
  for (const faz of ORDEM) {
    for (const r of FAZENDAS[faz].rotas) {
      if (r.max == null) linhasSemEstrada.push({ faz: FAZENDAS[faz].nome, talhao: r.t, ha: r.ha, reta: r.reta });
    }
  }
  linhasSemEstrada.sort((a, b) => a.faz.localeCompare(b.faz) || a.talhao.localeCompare(b.talhao));

  abreInfo('Pendências', `
    <p><b>Java</b> e <b>Ponte de Pedra</b> entregam a colheita na sede do <b>Tucano</b> — a distância
    de cada talhão dessas duas fazendas já é medida até lá, não até a própria sede.</p>
    <p>Ainda sem conferência em campo (malha desenhada, mas ninguém da fazenda validou):
    ${naoConferida.map(f => `<b>${FAZENDAS[f].nome}</b>`).join(', ')}.</p>

    <h4>Talhões sem estrada mapeada até a sede (${linhasSemEstrada.length})</h4>
    ${linhasSemEstrada.length ? `<div class="tabwrap"><table>
      <thead><tr><th>Fazenda</th><th>Talhão</th><th>Área (ha)</th><th>Reta até a sede (km)</th></tr></thead>
      <tbody>${linhasSemEstrada.map(l => `<tr><td>${l.faz}</td><td>${l.talhao}</td>
        <td>${l.ha.toFixed(0)}</td><td>${fmt(l.reta)}</td></tr>`).join('')}</tbody>
    </table></div>` : '<p>Todos os talhões das sete fazendas já têm estrada mapeada até a sede.</p>'}

    <h4>Talhões com contorno sobreposto no KML (${SOBREPOSTOS.length})</h4>
    <p>Contorno antigo (de antes da subdivisão) que ficou no projeto do Google Earth por cima dos
    talhões atuais — infla a área e pode distorcer o cálculo. Precisa corrigir no Google Earth,
    não dá pra arrumar por aqui.</p>
    <div class="tabwrap"><table>
      <thead><tr><th>Fazenda</th><th>Contorno (a corrigir)</th><th>Engloba</th></tr></thead>
      <tbody>${SOBREPOSTOS.map(s => `<tr><td>${s.faz}</td><td>${s.pai}</td><td>${s.engloba}</td></tr>`).join('')}</tbody>
    </table></div>`, { larga: true });
};
document.getElementById('infoFechar').onclick = () => modalInfo.classList.remove('on');
modalInfo.onclick = e => { if (e.target === modalInfo) modalInfo.classList.remove('on'); };

// dropdowns do nav: só um aberto por vez, fecha ao clicar fora
const dropdowns = [
  { btn: document.getElementById('btExportar'), painel: document.getElementById('painelExportar') },
  { btn: document.getElementById('btFazendas'), painel: document.getElementById('painelFazendas') },
  { btn: document.getElementById('btCamadas'), painel: document.getElementById('painelCamadas') },
];
function fechaDropdowns() {
  dropdowns.forEach(d => { d.painel.classList.remove('on'); d.btn.setAttribute('aria-expanded', 'false'); });
}
dropdowns.forEach(d => {
  d.btn.onclick = () => {
    const abrindo = !d.painel.classList.contains('on');
    fechaDropdowns();
    if (abrindo) { d.painel.classList.add('on'); d.btn.setAttribute('aria-expanded', 'true'); }
  };
});
document.addEventListener('click', e => {
  if (dropdowns.some(d => d.painel.contains(e.target) || d.btn.contains(e.target))) return;
  fechaDropdowns();
});

// --- bloco de alertas (texto rolando no topo do mapa) ---
const avisos = [];
avisos.push('<b>Java</b> e <b>Ponte de Pedra</b>: entrega da colheita é feita na sede do Tucano — a ' +
  'distância de cada talhão dessas duas fazendas é medida até lá.');
for (const faz of ORDEM) {
  const n = semAcesso(faz);
  if (n > 0) avisos.push(`<b>${FAZENDAS[faz].nome}</b>: ${n} talh${n === 1 ? 'ão' : 'ões'} sem estrada mapeada até a sede.`);
}
document.getElementById('marqueeTrack').innerHTML = avisos.map(a => `<span>${a}</span>`).join('');

document.getElementById('btSidebar').onclick = () => {
  const sb = document.getElementById('sidebar');
  sb.hidden = !sb.hidden;
};
if (window.matchMedia('(max-width: 820px)').matches) document.getElementById('sidebar').hidden = true;

// --- simulação de estrada fictícia -------------------------------------
// Só roda no navegador, pra explorar "e se desenhasse uma estrada aqui?".
// Não grava em lugar nenhum — refazer o pipeline de verdade (scripts/pipeline.py)
// continua sendo o único jeito de uma estrada virar dado oficial. A malha usada
// aqui é a mesma regra do pipeline: só estrada desenhada (TRACADAS), nunca divisa.
// CRUZAMENTO_SIM um pouco maior que o CRUZAMENTO_M do pipeline.py (8m): a
// projecao equiretangular usada aqui (nao e UTM de verdade) superestima
// distancias curtas o bastante pra, por exemplo, 8,0m reais virarem 8,9m
// calculados e passarem batido do corte -- 12m absorve essa imprecisao sem
// abrir mao de uma tolerancia baixa (cerca/porteira continua nao ligando).
const DENS_SIM = 25, SNAP_SIM = 2, ACESSO_SIM = 40, CRUZAMENTO_SIM = 12;
let simulando = false, simPontos = [], simLayer = L.layerGroup().addTo(map);

function metrosPorGrau(latRef) {
  const rad = latRef * Math.PI / 180;
  return { x: 111320 * Math.cos(rad), y: 110540 };
}
function distM(a, b, mg) {
  const dx = (b[1] - a[1]) * mg.x, dy = (b[0] - a[0]) * mg.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function densificaLL(pts, passo, mg) {
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.max(1, Math.floor(distM(a, b, mg) / passo));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
function chaveENo(p, snapM, mg) {
  const sy = snapM / mg.y, sx = snapM / mg.x;
  const iy = Math.round(p[0] / sy), ix = Math.round(p[1] / sx);
  return { key: iy + '_' + ix, ll: [iy * sy, ix * sx] };
}
function distPontoSegmento(p, a, b, mg) {
  const px = (p[1] - a[1]) * mg.x, py = (p[0] - a[0]) * mg.y;
  const bx = (b[1] - a[1]) * mg.x, by = (b[0] - a[0]) * mg.y;
  const t = Math.max(0, Math.min(1, (bx || by) ? (px * bx + py * by) / (bx * bx + by * by) : 0));
  return Math.hypot(px - bx * t, py - by * t);
}
function distPontoAnel(p, anel, mg) {
  let min = Infinity;
  for (let i = 0; i < anel.length - 1; i++) min = Math.min(min, distPontoSegmento(p, anel[i], anel[i + 1], mg));
  return min;
}

// heap binario minimo, [dist, chave]
function heapCria() { return []; }
function heapSobe(h, i) {
  while (i > 0) {
    const pai = (i - 1) >> 1;
    if (h[pai][0] <= h[i][0]) break;
    [h[pai], h[i]] = [h[i], h[pai]]; i = pai;
  }
}
function heapDesce(h, i) {
  const n = h.length;
  while (true) {
    let m = i, e = 2 * i + 1, d = 2 * i + 2;
    if (e < n && h[e][0] < h[m][0]) m = e;
    if (d < n && h[d][0] < h[m][0]) m = d;
    if (m === i) break;
    [h[m], h[i]] = [h[i], h[m]]; i = m;
  }
}
function heapPush(h, item) { h.push(item); heapSobe(h, h.length - 1); }
function heapPop(h) {
  const topo = h[0], fim = h.pop();
  if (h.length) { h[0] = fim; heapDesce(h, 0); }
  return topo;
}

function ligaCruzamentosSim(nos, mg) {
  // Liga nos de tracados de estrada diferentes que passam perto sem cair no
  // mesmo no snapado (mesma logica do CRUZAMENTO_M do pipeline.py). Tolerancia
  // baixa de proposito: cerca/porteira real entre duas propriedades tambem
  // fica perto assim no desenho, e essa nao e pra ligar sozinho.
  const cellY = CRUZAMENTO_SIM / mg.y, cellX = CRUZAMENTO_SIM / mg.x;
  const grade = new Map();
  const celula = k => {
    const [la, lo] = nos.get(k).ll;
    return Math.floor(la / cellY) + '_' + Math.floor(lo / cellX);
  };
  for (const k of nos.keys()) {
    const c = celula(k);
    if (!grade.has(c)) grade.set(c, []);
    grade.get(c).push(k);
  }
  for (const k of nos.keys()) {
    const [gy, gx] = celula(k).split('_').map(Number);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const viz = grade.get((gy + dy) + '_' + (gx + dx));
      if (!viz) continue;
      for (const k2 of viz) {
        if (k2 <= k) continue;
        const n1 = nos.get(k), n2 = nos.get(k2);
        if (n1.viz.has(k2)) continue;
        const d = distM(n1.ll, n2.ll, mg);
        if (d <= CRUZAMENTO_SIM) { n1.viz.set(k2, d); n2.viz.set(k, d); }
      }
    }
  }
}

function construirGrafoSim(faz, linhaExtra) {
  const mg = metrosPorGrau(FAZENDAS[faz].sede[0]);
  let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
  for (const anel of Object.values(FAZENDAS[faz].talhoes)) {
    for (const [la, lo] of anel) {
      if (la < latMin) latMin = la; if (la > latMax) latMax = la;
      if (lo < lonMin) lonMin = lo; if (lo > lonMax) lonMax = lo;
    }
  }
  const bufY = 3000 / mg.y, bufX = 3000 / mg.x;
  latMin -= bufY; latMax += bufY; lonMin -= bufX; lonMax += bufX;
  const dentro = ([la, lo]) => la >= latMin && la <= latMax && lo >= lonMin && lo <= lonMax;

  const linhas = (typeof TRACADAS !== 'undefined' ? TRACADAS : [])
    .filter(t => t.pts.some(dentro)).map(t => t.pts);
  if (linhaExtra && linhaExtra.length > 1) linhas.push(linhaExtra);

  const nos = new Map();
  const addAresta = (p, q) => {
    const A = chaveENo(p, SNAP_SIM, mg), B = chaveENo(q, SNAP_SIM, mg);
    if (A.key === B.key) return;
    if (!nos.has(A.key)) nos.set(A.key, { ll: A.ll, viz: new Map() });
    if (!nos.has(B.key)) nos.set(B.key, { ll: B.ll, viz: new Map() });
    const d = distM(A.ll, B.ll, mg);
    nos.get(A.key).viz.set(B.key, d);
    nos.get(B.key).viz.set(A.key, d);
  };
  for (const pts of linhas) {
    const dens = densificaLL(pts, DENS_SIM, mg);
    for (let i = 0; i < dens.length - 1; i++) addAresta(dens[i], dens[i + 1]);
  }
  ligaCruzamentosSim(nos, mg);
  return { nos, mg };
}

function componentesConexos(nos) {
  const visitado = new Set(), comps = [];
  for (const k of nos.keys()) {
    if (visitado.has(k)) continue;
    const comp = [], pilha = [k];
    visitado.add(k);
    while (pilha.length) {
      const u = pilha.pop();
      comp.push(u);
      for (const v of nos.get(u).viz.keys()) if (!visitado.has(v)) { visitado.add(v); pilha.push(v); }
    }
    comps.push(comp);
  }
  return comps;
}

function dijkstraDoSede(grafo, faz) {
  const { nos, mg } = grafo;
  const SEDE = '__SEDE__';
  // Liga a sede aos nos mais proximos de CADA pedaco de estrada separado, nao
  // so aos K mais proximos no total -- senao uma estrada ficticia curta perto
  // da sede pode roubar a vaga de um pedaco de estrada de verdade mais distante
  // em linha reta mas melhor ligado, piorando a distancia so por ter "estrada
  // nova" (mesmo furo corrigido no pipeline.py).
  const componentes = componentesConexos(nos);
  nos.set(SEDE, { ll: FAZENDAS[faz].sede, viz: new Map() });
  for (const comp of componentes) {
    const maisPertos = comp.map(k => ({ k, d: distM(FAZENDAS[faz].sede, nos.get(k).ll, mg) }))
      .sort((a, b) => a.d - b.d).slice(0, 5);
    for (const { k, d } of maisPertos) {
      nos.get(SEDE).viz.set(k, d);
      nos.get(k).viz.set(SEDE, d);
    }
  }
  const dist = new Map([[SEDE, 0]]);
  const visitado = new Set();
  const h = heapCria();
  heapPush(h, [0, SEDE]);
  while (h.length) {
    const [dAtual, u] = heapPop(h);
    if (visitado.has(u)) continue;
    visitado.add(u);
    for (const [v, w] of nos.get(u).viz) {
      const nd = dAtual + w;
      if (!dist.has(v) || nd < dist.get(v)) { dist.set(v, nd); heapPush(h, [nd, v]); }
    }
  }
  return dist;
}

function simulaParaTalhao(faz, cod, linhaExtra) {
  const grafo = construirGrafoSim(faz, linhaExtra);
  const dist = dijkstraDoSede(grafo, faz);
  const anel = FAZENDAS[faz].talhoes[cod];
  let max = null, min = null;
  for (const [k, n] of grafo.nos) {
    if (k === '__SEDE__' || !dist.has(k)) continue;
    if (distPontoAnel(n.ll, anel, grafo.mg) <= ACESSO_SIM) {
      const dd = dist.get(k);
      if (max === null || dd > max) max = dd;
      if (min === null || dd < min) min = dd;
    }
  }
  return { max, min };
}

function comparaLinha(rotulo, antes, depois) {
  const melhorou = antes != null && depois != null && depois < antes - 1;
  return `<div class="simlinha"><span>${rotulo}</span>
    <b class="${melhorou ? 'melhora' : ''}">${fmt(antes)} km → ${fmt(depois)} km</b></div>`;
}

function mostraResultadoSim(antes, depois) {
  const box = document.getElementById('fsimResultado');
  box.hidden = false;
  box.innerHTML = comparaLinha('Máx', antes.max, depois.max) + comparaLinha('Mín', antes.min, depois.min)
    + '<button class="bt" id="btLimparSim">Limpar simulação</button>'
    + '<p class="hint">Simulação só no navegador — não altera nenhum dado. Pra virar oficial, desenhe na bancada.</p>';
  document.getElementById('btLimparSim').onclick = limpaSimulacao;
}

function adicionaPontoSim(latlng) {
  simPontos.push([latlng.lat, latlng.lng]);
  simLayer.clearLayers();
  if (simPontos.length > 1) L.polyline(simPontos, { color: '#38d39f', weight: 4, dashArray: '8,6' }).addTo(simLayer);
  simPontos.forEach(p => L.circleMarker(p, { radius: 4, color: '#38d39f', fillColor: '#38d39f', fillOpacity: 1 }).addTo(simLayer));
  document.getElementById('btSimular').textContent = `Concluir (${simPontos.length} ponto${simPontos.length === 1 ? '' : 's'})`;
}

function limpaSimulacao() {
  simulando = false;
  simPontos = [];
  simLayer.clearLayers();
  const btn = document.getElementById('btSimular');
  if (btn) { btn.textContent = 'Simular nova estrada'; btn.classList.remove('p'); }
  const dica = document.getElementById('fsimDica');
  if (dica) dica.hidden = true;
  const box = document.getElementById('fsimResultado');
  if (box) { box.hidden = true; box.innerHTML = ''; }
}

document.getElementById('btSimular').onclick = () => {
  if (!selecionado) return;
  if (!simulando) {
    simulando = true; simPontos = []; simLayer.clearLayers();
    document.getElementById('btSimular').textContent = 'Concluir (0 pontos)';
    document.getElementById('btSimular').classList.add('p');
    document.getElementById('fsimDica').hidden = false;
    document.getElementById('fsimResultado').hidden = true;
    return;
  }
  if (simPontos.length < 2) { limpaSimulacao(); return; }
  simulando = false;
  document.getElementById('fsimDica').hidden = true;
  document.getElementById('btSimular').textContent = 'Calculando…';
  carregaCamadasExtras(() => {
    const { faz, cod } = selecionado;
    const r = FAZENDAS[faz].rotas.find(x => x.t === cod);
    const antes = { max: r.max, min: r.min };
    const depois = simulaParaTalhao(faz, cod, simPontos);
    mostraResultadoSim(antes, depois);
    document.getElementById('btSimular').textContent = 'Simular outra estrada';
    document.getElementById('btSimular').classList.remove('p');
  });
};
