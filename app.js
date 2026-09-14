const CORES = {
  GALHEIRO: '#c2703d', JAVA: '#3d6bc2', MATO_GROSSO: '#8a3dc2',
  PANAMA: '#3dc2ad', PPEDRA: '#2f6b3a', PROMISSAO: '#c2c23d', TUCANO: '#c23d70',
};
const ORDEM = ['PPEDRA', 'GALHEIRO', 'JAVA', 'MATO_GROSSO', 'PANAMA', 'PROMISSAO', 'TUCANO'];
const fmt = m => m == null ? '—' : (m / 1000).toFixed(2).replace('.', ',');

const map = L.map('mapa', { attributionControl: false, preferCanvas: true });
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 21, maxNativeZoom: 19 }).addTo(map);
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
      .on('click', () => seleciona(faz, cod))
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

function seleciona(faz, cod) {
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

  const poly = camadas[faz].talhoes[cod];
  if (poly) {
    poly.setStyle({ weight: 3, fillOpacity: .3 });
    map.fitBounds(poly.getBounds(), { padding: [80, 80], maxZoom: 16 });
  }
  if (r.p && r.p.length) {
    L.polyline(r.p, { color: '#000', weight: 7, opacity: .3 }).addTo(camadaSelecao);
    L.polyline(r.p, { color: '#d92b2b', weight: 3 }).addTo(camadaSelecao);
  }

  const btn = document.querySelector(`.talhoes button[data-faz="${faz}"][data-cod="${CSS.escape(cod)}"]`);
  if (btn) { btn.classList.add('sel'); btn.closest('details').open = true; btn.scrollIntoView({ block: 'nearest' }); }

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

document.querySelector('#ficha .fechar').onclick = () => {
  document.getElementById('ficha').classList.remove('on');
  if (selecionado) {
    const ant = camadas[selecionado.faz].talhoes[selecionado.cod];
    if (ant) ant.setStyle({ weight: 1, fillOpacity: .12 });
    document.querySelectorAll('.talhoes button.sel').forEach(b => b.classList.remove('sel'));
    selecionado = null;
  }
  camadaSelecao.clearLayers();
};

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

lista.querySelectorAll('.talhoes button').forEach(b => b.onclick = () => seleciona(b.dataset.faz, b.dataset.cod));
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
    || '<p style="padding:10px 2px;color:var(--mut);font-size:12.5px">Nada encontrado.</p>';
  resultados.querySelectorAll('.res').forEach(b => b.onclick = () => {
    seleciona(b.dataset.faz, b.dataset.cod);
    busca.value = ''; resultados.innerHTML = '';
  });
};

// --- exportar ---
const CAMPOS = [
  { k: 'fazenda', label: 'Fazenda', get: r => r.fazenda },
  { k: 'talhao', label: 'Talhão', get: r => r.talhao },
  { k: 'situacao', label: 'Situação', get: r => r.situacao },
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
      <a class="item" href="${d.slug}_bancada.html">Bancada de estradas</a>
      <a class="item" href="${d.slug}_distancias.xlsx" download>Planilha .xlsx</a>
      <a class="item" href="${d.slug}_rotas.kml" download>KML das rotas</a>
    </div>
  </details>`;
}).join('') + `<button class="item" id="btSobre">Como a medida é feita</button>`;

document.getElementById('expTodos').onclick = () => exportaCSV(CAMPOS.map(c => c.k), 'talhoes_todos_os_dados.csv');
document.getElementById('expMax').onclick = () => exportaCSV(['fazenda', 'talhao', 'situacao', 'max'], 'talhoes_distancia_maxima.csv');
document.getElementById('expCampos').onclick = () => modalCampos.classList.add('on');

const modalInfo = document.getElementById('modalInfo');
function abreInfo(titulo, html) {
  document.getElementById('infoTitulo').textContent = titulo;
  document.getElementById('infoCorpo').innerHTML = html;
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
document.getElementById('btPendencias').onclick = () => abreInfo('Pendências', `
  <p><b>Java</b> e <b>Ponte de Pedra</b> entregam a colheita na sede do <b>Tucano</b>, mas a estrada que liga
  essas fazendas ainda não foi desenhada — por enquanto a distância mostrada é até a própria sede de cada uma.</p>
  <p>Fazendas com talhões ainda sem estrada mapeada até a sede: ${ORDEM.filter(f => semAcesso(f) > 0)
    .map(f => `<b>${FAZENDAS[f].nome}</b> (${semAcesso(f)})`).join(', ')}.</p>`);
document.getElementById('infoFechar').onclick = () => modalInfo.classList.remove('on');
modalInfo.onclick = e => { if (e.target === modalInfo) modalInfo.classList.remove('on'); };

// dropdowns do nav: só um aberto por vez, fecha ao clicar fora
const dropdowns = [
  { btn: document.getElementById('btExportar'), painel: document.getElementById('painelExportar') },
  { btn: document.getElementById('btFazendas'), painel: document.getElementById('painelFazendas') },
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
avisos.push('<b>Java</b> e <b>Ponte de Pedra</b>: entrega da colheita é feita na sede do Tucano, ' +
  'mas a estrada de ligação entre as fazendas ainda não foi desenhada.');
const naoConferidas = ORDEM.filter(f => FAZENDAS[f].situacao_label === 'Calculada, não conferida');
if (naoConferidas.length) {
  avisos.push(`${naoConferidas.map(f => `<b>${FAZENDAS[f].nome}</b>`).join(' e ')}: calculado a partir ` +
    'das divisas, ainda não conferido em campo.');
}
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
