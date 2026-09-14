# Distâncias dos talhões até a sede

Site publicado em **https://max-vilela.github.io/talhao/**.

Mostra, para cada talhão de sete fazendas, a distância até a sede **pelas estradas** (não em
linha reta) — substitui o processo manual de medir talhão a talhão com a régua do Google Earth.

## O que tem aqui

Este repositório é **só o site publicado** (estático, para o GitHub Pages). O cálculo em si
— ler o KML do Google Earth, montar a malha de estradas e rodar o caminho mínimo — roda num
projeto Python separado, fora deste repositório. Aqui entram os resultados prontos.

| Arquivo / grupo | O que é |
|---|---|
| `index.html`, `app.js`, `mapa.css`, `dados_mapa.js` | O mapa único (página inicial): todas as fazendas, busca, exportação, menu |
| `FAZENDA_<nome>.html` | Consulta por fazenda: tabela ordenável, busca, mapa da rota de cada talhão |
| `FAZENDA_<nome>_bancada.html` | Bancada — mapa interativo autocontido para desenhar/corrigir a malha de estradas |
| `FAZENDA_<nome>_distancias.xlsx` | Planilha por fazenda (máx, mín, reta, fator, área) |
| `FAZENDA_<nome>_rotas.kml` | Rotas + malha, para abrir no Google Earth |
| `leaflet.js`, `leaflet.css` | Biblioteca de mapa, sem CDN |

## O mapa principal

`index.html` mostra a sede e os talhões das sete fazendas num mapa só, coloridos por fazenda.

- **Sidebar** (à esquerda): busca por talhão em todas as fazendas, e lista fazenda → talhão.
  Clicar num talhão centraliza o mapa, destaca o polígono e mostra a rota até a sede.
- **Menu** (topo): **Exportar** (CSV — todos os dados, só distância máxima, ou escolher campos),
  **Fazendas** (link para a consulta/bancada/planilha/KML de cada uma) e **Pendências**.
- **Alerta rolando** no topo do mapa: resume o que falta (estrada não mapeada, malha ainda não
  conferida em campo).

## Estado das sete fazendas

| Fazenda | Talhões | Situação |
|---|---|---|
| Ponte de Pedra | 51 | **Conferida em campo** — malha toda desenhada e validada. |
| Mato Grosso | 28 | Calculada só com as divisas; ninguém da fazenda conferiu ainda. |
| Panamá | 24 | Calculada só com as divisas; ninguém da fazenda conferiu ainda. |
| Java | 35 | Parcial — 14 talhões sem estrada mapeada até a sede. |
| Galheiro | 103 | Parcial — 67 talhões sem estrada mapeada até a sede. |
| Promissão | 40 | Parcial — 14 talhões sem estrada mapeada até a sede. |
| Tucano | 70 | Parcial — 52 talhões sem estrada mapeada até a sede. |

**Pendência em aberto:** Java e Ponte de Pedra entregam a colheita na sede do Tucano, mas a
estrada que liga essas fazendas ainda não foi desenhada. Por enquanto o site mostra, para as
duas, a distância até a própria sede — quando a estrada existir, o cálculo passa a apontar
para a sede do Tucano.

## Como ler os números

- **Máx** — pior caso: menor caminho pela estrada até o ponto mais extremo do talhão.
- **Mín** — até o ponto de acesso mais próximo do talhão.
- **Reta** — distância direta, só referência.
- **Fator** — Máx ÷ Reta. Entre 1,2 e 2,5 é normal; acima de 3 costuma indicar estrada faltando
  na malha (exceto talhão colado na sede, onde a reta é tão curta que o fator estoura sozinho).
- Não considera sentido de tráfego, restrição de peso, ponte, porteira ou época de chuva.

## Atualizando o site

Quando o KML do Google Earth muda (nova sede, malha corrigida na bancada, nova fazenda):

1. Rodar o pipeline (projeto Python separado) para as fazendas afetadas — gera
   `<slug>_rotas.json`, `_distancias.xlsx`, `_rotas.kml` e `_bancada.html`.
2. Copiar esses arquivos para a raiz deste repositório.
3. Nas páginas de consulta (`FAZENDA_<nome>.html`), trocar `vendor/leaflet.*` por `leaflet.*`
   e `'arquivos/' + D.slug` por `D.slug` — o pipeline gera pensando numa estrutura com
   subpastas `vendor/`/`arquivos/` que este repositório não usa (tudo fica na raiz).
4. Reconstruir `dados_mapa.js` a partir dos `_rotas.json` de cada fazenda (mesmo formato:
   `slug`, `sede`, `talhoes`, `rotas`, `nome`, `situacao`, `situacao_label`).
5. Se entrar fazenda nova, acrescentar a chave em `ORDEM` e uma cor em `CORES` no `app.js`.
6. Commit e push — o GitHub Pages publica sozinho.

## Publicação

GitHub Pages, branch `main`, raiz do repositório (Settings → Pages). Site 100% estático — sem
build, sem backend, sem banco de dados.
