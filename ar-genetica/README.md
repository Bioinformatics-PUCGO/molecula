# AR Genética — dois links de realidade aumentada em tamanho real

Duas páginas que abrem pela câmera do celular, sem aplicativo:

| Link | O que mostra | Tamanho |
|---|---|---|
| `…/ar-genetica/molecula/` | DNA polimerase beta humana copiando o DNA (PDB **1BPY**). Dá para ver só o DNA. | maior dimensão **2,5 m** |
| `…/ar-genetica/fotos/` | Para fotos virtuais: **celular gigante**, **Foto 51 (homenagem a Rosalind Franklin)** e **cromossomo** | 1,50 m · 2,00 m · 1,80 m |

O aluno lê o QR Code, toca em **Ver em tamanho real (AR)**, aponta para o chão e o objeto aparece na escala real. Depois é só andar ao redor e tirar a foto.

## 1. Publicar

Suba a pasta `ar-genetica` inteira para o GitHub (pode ficar dentro do repositório do jogo) e ative o GitHub Pages. A câmera só funciona em **HTTPS**, que o GitHub Pages já oferece. Os dois endereços ficam, por exemplo:

```
https://SEU-USUARIO.github.io/SEU-REPOSITORIO/ar-genetica/molecula/
https://SEU-USUARIO.github.io/SEU-REPOSITORIO/ar-genetica/fotos/
```

## 2. Imprimir os cartazes com QR Code

Com o site publicado, abra cada endereço com `?cartaz` no final e clique em **Imprimir cartaz (A4)**. Sai uma página por link. Abra pelo endereço **público**, senão o QR aponta para o lugar errado. O cartaz da molécula vai na porta da sala.

## 3. Antes do evento: gerar os arquivos da molécula (recomendado)

A página da molécula baixa a estrutura 1BPY do banco de dados PDB **na hora**, no celular de cada aluno. Funciona, mas depende da internet do local e do site do PDB. Para não depender disso e ter mais compatibilidade com o Android:

1. Em um computador com internet, abra `…/molecula/?exportar` e espere a molécula aparecer.
2. Abra **Ferramenta da equipe: baixar os .glb** e baixe os dois arquivos.
3. Coloque `polimerase-dna.glb` e `dna.glb` em `assets/models/` e suba para o GitHub.

Daí em diante a página usa esses arquivos prontos. Se a internet cair e não houver arquivo pronto, a página mostra um **DNA ilustrativo** em 2,5 m, com um aviso.

## 3b. Usar qualquer molécula do PDB (arquivo .pdb na pasta)

Você pode baixar o arquivo `.pdb` de qualquer estrutura e guardá-lo em `assets/pdb/`:

1. No site rcsb.org, abra a estrutura e escolha **Download Files → PDB Format**.
2. Salve em `assets/pdb/` e suba para o GitHub.
3. Para abrir: `…/molecula/?arquivo=nome-do-arquivo.pdb`. Se o arquivo tiver o código como nome (por exemplo `1BPY.pdb`), basta `?pdb=1BPY`.

**Dica para o evento:** salve o `1BPY.pdb` em `assets/pdb/`. A página procura esse arquivo **antes** de ir ao site do PDB, então a molécula padrão passa a funcionar sem internet. A página também aceita `?pdb=CODIGO` para baixar na hora, sem arquivo.

Limites: o formato `.pdb` não existe para estruturas muito grandes (só `.cif`), e a página lê só `.pdb`. Estruturas com milhares de resíduos geram modelos pesados para o celular. Abra `?exportar` depois para salvar o `.glb` pronto.

## 4. O que o aluno precisa

- **iPhone (Safari):** abre o Quick Look, com botão de câmera para tirar a foto.
- **Android (Chrome):** realidade aumentada pelo WebXR ou pelo Scene Viewer, em aparelhos compatíveis com ARCore. A foto é uma captura de tela.
- Se o link abrir dentro do WhatsApp ou Instagram, a câmera pode ser bloqueada: tocar em "Abrir no navegador".
- No computador, a página mostra o modelo em 3D e um QR Code para abrir no celular.

## 5. Sobre a "cientista"

Um modelo 3D realista de uma pessoa exige um artista 3D ou um modelo licenciado; com formas simples ficaria artificial. Por isso o link das fotos traz a **Foto 51** (painel de 2 m, com legenda sobre Rosalind Franklin) e o **cromossomo**, que é a alternativa que você sugeriu. A imagem da Foto 51 é uma **recriação por simulação** da difração de raios X de uma hélice, e a legenda diz isso; não é a fotografia original. Se você tiver um modelo `.glb` licenciado de uma cientista, ele pode ser colocado no seletor.

O celular gigante mostra "Trilha Genética · CEGGen × GenIA" na tela. Dá para acrescentar uma hashtag ou perfil nas redes: peça e regeneramos o arquivo.

## 6. Estrutura da pasta

```
molecula/index.html      página da molécula
fotos/index.html         página das fotos
assets/models/           .glb dos objetos de foto (e da molécula, depois do passo 3)
assets/pdb/              arquivos .pdb seus (opcional)
assets/js/               código (model-viewer, leitura do PDB, QR Code)
ferramentas/             gerar-modelos.html: refaz os .glb das fotos (uso da equipe)
```

## 7. Testar antes de imprimir

- Teste em **pelo menos um iPhone e um Android reais**, no corredor onde o QR vai ficar.
- A molécula precisa de espaço: cerca de 3 m livres no chão, em frente à porta.
- Confira a molécula 1BPY quando abrir pela primeira vez com internet.

## Créditos e licenças

- Estrutura: PDB 1BPY — Sawaya, Prasad, Wilson, Kraut, Pelletier. *Biochemistry* 36:11205 (1997). Dados do RCSB Protein Data Bank.
- `model-viewer` (Google, Apache-2.0), `three.js` (MIT), `qrcode-generator` (MIT).
