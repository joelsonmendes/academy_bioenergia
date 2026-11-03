# Campus Amazônia — guia de uso e teste

BioEnergia Academy Pro 2.0, extensão Amazônia. Revisão: 01/11/2026.

## Três formas de usar

| Forma | O que funciona | Dependência |
| --- | --- | --- |
| HTML em computador ou celular | Cinco usinas originais, bancada solar/eólica, instrumentos virtuais, microrrede de 24 h, projetos, apostila e caderno | Navegador com JavaScript. Nenhum serviço pago ou instalação de bibliotecas. |
| PWA em hospedagem estática | Todos os recursos locais e instalação/cache offline do conteúdo | HTTPS ou localhost; cache preparado em “Estudar offline”. |
| Servidor de turma Node.js | Recursos acima, sincronização de caderno, perguntas de texto, respostas do docente e acompanhamento | Servidor configurado, credenciais da turma, diretório privado persistente e HTTPS para acesso remoto. |

O arquivo HTML não ativa sozinho uma conta em nuvem nem um servidor de turma. Na cópia local, perguntas ficam no caderno e podem ser exportadas/importadas. Os links das publicações originais exigem internet. A apostila produzida pela própria plataforma pode ser lida sem rede.

## Roteiro para o aluno

1. Abra **Campus Amazônia → Bancada virtual**. Compare o arranjo de referência com uma montagem feita selecionando dois terminais por vez. A lista de fios permite remover ligações. Barramentos eletricamente equivalentes da bateria são aceitos.
2. Meça tensão CC, tensão CA eficaz e correntes de ramo. Troque as pontas CC e observe o sinal. Examine a curva I–V aproximada e a senoide ideal do inversor.
3. Insira abertura de entrada solar, inversão, curto virtual, proteção CA aberta ou sobrecarga. Um circuito solar aberto não equivale a bateria desconectada. Os curtos são tratados por uma proteção idealizada; não há cálculo de corrente real de curto/arco.
4. Compare a mesma corrente com comprimentos e seções de cobre diferentes. A meta de queda de 3% é do exercício; não é um limite normativo universal nem verificação de ampacidade.
5. Em **Microrrede 24 h**, escolha escola ribeirinha, centro comunitário ou dia pouco ensolarado. Edite cargas, horários, ciclo médio, HSP, armazenamento e combustível. Todas as comunidades e demandas dos casos são fictícias.
6. Observe energia não atendida, consumo de diesel e SOC final. Um SOC final menor que o inicial evidencia consumo da reserva no dia; não demonstra operação repetível indefinidamente.
7. Em **Projetos e manutenção**, registre as hipóteses, fontes, logística e decisões. Use o diagrama funcional e o esquema conceitual PE/BEP para discutir o que falta em um projeto executivo. A revisão do docente é indispensável.
8. Em **Estudar offline**, baixe a apostila, o HTML e o caderno JSON. Importe o caderno para transferir o trabalho. As credenciais ficam fora do backup.

## Modelos e limites

- A bancada usa módulo hipotético de 550 Wp, Vmp 41 V, Voc 49,5 V e Isc 14,3 A em STC. É uma aproximação linear de três pontos, não um modelo de diodo ou uma curva medida. O coeficiente de tensão é uma hipótese de −0,35%/°C.
- O eólico da bancada representa CC após retificação, com densidade, Cp e perdas supostos. Não representa a forma de onda bruta de um gerador real. Os cortes hipotéticos de velocidade são 3 e 20 m/s.
- A bateria da bancada é genérica. A relação de tensão versus SOC é ilustrativa e não define uma química, BMS ou curva de fabricante. O passo de 10 minutos mantém as potências constantes.
- O cálculo de cabo é limitado ao trecho fonte–controlador, com resistividade de referência de cobre 0,0175 Ω·mm²/m a 20 °C e coeficiente térmico suposto de 0,00393/°C. A queda exibida para comparação de seções é no ponto de referência de potência da fonte. A corrente do alicate considera a potência realmente transferida no modelo.
- O controlador e o inversor têm eficiências hipotéticas de 96% e 92% na bancada. A carga equivalente é resistiva; FP = 1 é hipótese, e 60 Hz é frequência nominal. Harmônicos e transientes não são calculados.
- A microrrede usa 24 intervalos de uma hora, perfil solar normalizado entre 6 h e 18 h, eficiência de carga/descarga, limites de energia e potência e consumo de diesel parametrizado. Não é previsão meteorológica nem estudo de estabilidade. Não está conectada a sensores ou a uma instalação real; portanto é modelo virtual, não gêmeo digital com telemetria.
- A forma ideal de consumo de diesel é `L/h = a + b × kW`, com coeficientes declarados pelo usuário. Com combustível escasso, a operação se limita a uma fração da hora. Os valores iniciais não são ficha técnica nem cotação de combustível.
- Estatísticas e dados climáticos de fontes externas não são importados automaticamente. A referência do INPE permite pesquisar o Acre; HSP inicial é hipótese do exercício.
- A parte de biomassa conserva o laboratório original e acrescenta inventário regional, origem, sazonalidade, umidade, usos concorrentes e logística. Dados de madeira não devem ser transferidos diretamente a caroços de açaí ou outros resíduos sem caracterização.
- Umidade amazônica do interior não comprova maresia. A influência salina precisa de evidência local.

## Instalar e preparar o PWA

Na distribuição 2.1.0, use o diretório **`dist/web/` completo** para hospedagem PWA: HTML, `app.js`, `styles.css`, `config.js`, pasta `assets/`, manifest, ícones SVG/PNG, worker, apostila e HTML portátil. Copie todos os arquivos e subpastas, inclusive os ícones de 192 e 512 pixels. Podem ser publicados juntos em uma hospedagem HTTPS, inclusive numa subpasta. O pacote PWA de teste já reúne essa distribuição. `dist/index.html` continua sendo a opção autônoma para abrir por arquivo. A apostila em HTML tem cerca de 35 KB, permite leitura direta e impressão e incorpora a logo sem depender de JavaScript ou rede.

No navegador, abra **Campus Amazônia → Estudar offline → Preparar acesso offline no navegador**. O service worker armazena o conteúdo estático da plataforma. Quando o navegador oferecer a instalação, use **Instalar aplicativo** ou seu menu de instalação. A oferta depende do navegador e do sistema operacional.

O cache utiliza versão derivada do conteúdo e remove apenas versões antigas do mesmo escopo. Não armazena respostas de API, notas ou tokens no Cache API. Dados do estudante ficam em IndexedDB, com cópia local de recuperação quando disponível. Exporte periodicamente o caderno, pois navegador, modo privado, limpeza ou falta de espaço podem remover dados.

## Servidor de turma: piloto com apelidos

Requer Node.js 24, dependências instaladas e build. Não há necessidade de credenciais de uma plataforma externa.

```sh
npm ci
npm run typecheck
npm run build
```

Copie `.env.example` para `.env`. Defina valores próprios para `LEARNING_CLASS_CODE` (mínimo 8 caracteres) e `LEARNING_TEACHER_KEY` (mínimo 12). Nunca distribua a chave docente aos estudantes. `BIOENERGIA_DATA_DIR` deve apontar para um diretório privado persistente, fora de qualquer publicação estática. Então:

```sh
npm start
```

O processo usa loopback por padrão. Um administrador deve configurar acesso remoto e HTTPS adequados ao ambiente antes de ofertar a turma. A interface não solicita credenciais institucionais do SENAI. Este piloto não integra SSO ou identidade institucional.

O mural carrega as mensagens mais recentes, com até cinco respostas por tópico e limite aproximado de 64 KB de JSON por consulta. O servidor conserva o histórico do piloto. Os relatórios de progresso mostram contadores, sem transmitir o texto das notas de cada estudante ao restante da turma.

Cada navegador do estudante cria uma identidade aleatória com segredo próprio. Sessões têm validade de 24 h e são invalidadas se o processo reiniciar. O aluno pode entrar novamente com seu código; a identidade local é reutilizada. O docente tem acesso separado para feedback e visão de progresso. Outros estudantes não recebem os cadernos privados. Perguntas são compartilhadas no mural da turma.

O servidor conserva uma fotografia do caderno por dispositivo, com sequência monotônica; repetições são idempotentes e uma sequência antiga não substitui uma mais nova. Conflitos mantêm a cópia local e exigem revisão/exportação; não há fusão automática de notas entre vários dispositivos. O JSON do aluno é o mecanismo de transferência entre dispositivos.

Com a página aberta, mudanças são enviadas após persistência local e o retorno da conexão dispara nova tentativa. Em navegadores que suportam Background Sync, o worker também pode enviar pendências sem a página aberta. Essa execução é oportunista, depende do navegador e não tem prazo garantido. Sessão expirada exige nova entrada. O aplicativo não confirma “sincronizado” antes de o servidor responder.

O piloto persiste em `learning.json`, com escrita atômica e permissão de arquivo restrita. Use **um processo/réplica** para esse armazenamento. O perfil Docker tem volume persistente próprio; `infra/kubernetes/classroom.yaml` fornece uma instância de uma réplica com PVC e referência a Secret, sem incluir valores secretos. O manifesto original de duas réplicas continua destinado ao ambiente sem servidor de turma ativo. Escala com vários processos exige banco transacional e revisão da autenticação, retenção e gestão de dados.

## Validação

```sh
npm test
npm run check:links
```

Os testes cobrem referências numéricas, ligações equivalentes, falhas, conservação de energia, combustível insuficiente, SOC, autenticação, papéis, persistência, idempotência, privacidade de respostas, cache offline e fila de sincronização em segundo plano. A lista final de verificações do navegador fica em `VERIFICACAO.json`.

Docker e Kubernetes são arquivos de preparação. Não foram executados/aplicados durante esta entrega. A instalação PWA em um dispositivo físico e os efeitos de políticas de economia de bateria devem ser testados no ambiente de uso.

## Computadores das comunidades

Os pacotes Windows/Linux incluem iniciador, instalador, runtime e distribuição modular. O manual `COMECE_AQUI.html` acompanha cada ZIP. Os cadernos locais são selecionados no botão com ícone de livro do cabeçalho. O principal mantém o armazenamento anterior; os demais separam parâmetros e progresso por apelido. No pacote comunitário, uma cópia validada fica também em disco, fora da pasta de release. Consulte `COMUNIDADES_OFFLINE.md` para instalação, atualização por pendrive, backup, requisitos e limites de verificação.
