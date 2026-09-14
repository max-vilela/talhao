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
| `BANCADA_UNIFICADA.html` | Bancada única — mapa interativo para desenhar/corrigir a malha das sete fazendas |
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

## A bancada única

As sete fazendas compartilham **uma só bancada** (`BANCADA_UNIFICADA.html`), em vez de uma por
fazenda — Ponte de Pedra, Java e Tucano ficam perto o bastante para dividir estradas entre si
(a entrega da colheita de Java e Ponte de Pedra é feita na sede do Tucano), e um único ponto de
manutenção evita duplicar trabalho. Cada talhão usa uma chave interna com o prefixo da fazenda
(ex.: `FAZENDA_JAVA/T-01`) para não colidir com talhões de mesmo código em outra fazenda — a
tabela e os rótulos no mapa mostram só o código curto.

Estradas desenhadas à mão que pertencem a uma fazenda só levam o nome dela, ex.:
`ESTRADA 01 - PONTE DE PEDRA` — isso é o que já existe em `dados/estradas_extra.json` no
pipeline. Estradas novas desenhadas na bancada única (a ligação entre fazendas, por exemplo)
podem ficar sem esse sufixo até alguém decidir a qual fazenda atribuir.

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
   `<slug>_rotas.json`, `_distancias.xlsx` e `_rotas.kml`.
2. Rodar `scripts/gera_bancada_unificada.py` no pipeline — remonta a bancada única com as
   sete fazendas (lê os `_rotas.json` de novo, não precisa dos outros passos).
3. Copiar os arquivos gerados para a raiz deste repositório (`_distancias.xlsx`, `_rotas.kml`,
   `BANCADA_UNIFICADA.html`; as páginas de consulta `FAZENDA_<nome>.html` só precisam ser
   regeradas — via `scripts/gera_site.py` no pipeline — se a malha ou a lista de talhões mudou).
4. Nas páginas de consulta (`FAZENDA_<nome>.html`), trocar `vendor/leaflet.*` por `leaflet.*`
   e `'arquivos/' + D.slug` por `D.slug` — o pipeline gera pensando numa estrutura com
   subpastas `vendor/`/`arquivos/` que este repositório não usa (tudo fica na raiz).
5. Reconstruir `dados_mapa.js` a partir dos `_rotas.json` de cada fazenda (mesmo formato:
   `slug`, `sede`, `talhoes`, `rotas`, `nome`, `situacao`, `situacao_label`).
6. Se entrar fazenda nova, acrescentar a chave em `ORDEM` e uma cor em `CORES` no `app.js` —
   e, se ela compartilhar estrada com alguma das três, também em `FAZENDAS` dentro de
   `scripts/gera_bancada_unificada.py`.
7. Commit e push — o GitHub Pages publica sozinho.

## Publicação

GitHub Pages, branch `main`, raiz do repositório (Settings → Pages). Site 100% estático — sem
build, sem backend, sem banco de dados.
