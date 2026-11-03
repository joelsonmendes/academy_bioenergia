# Amazônia — referências, evidências e limites editoriais

Consulta e validação: **1º de novembro de 2026, UTC**. Escopo: conteúdo regional de `src/amazon-lessons.json`, com cinco módulos e textos originais em português, inglês e espanhol. As traduções são editoriais, não versões oficiais das publicações citadas.

Foram selecionadas **nove URLs únicas: seis novas e três reaproveitadas** do catálogo `src/references.json`. Na integração final, as seis novas foram incorporadas ao catálogo, que passou a ter 29 referências. Cada referência dos módulos usa somente `title`, `by`, `url` e, quando documentalmente identificado, `year`.

## Validação das URLs exatas

Todas as URLs abaixo receberam **GET HTTP 200**, com leitura do corpo por `urllib.request.urlopen`. Em todos os casos, a **URL solicitada foi igual à URL final**, incluindo a barra final na página de micro/minigeração da ANEEL. Não se tratou de teste HEAD ou apenas de resultado de busca.

Os horários são de início de cada GET, em 2026-11-01 UTC. O proxy HTTPS herdado estava configurado; foi mantido o comportamento padrão de `urllib`, sem desabilitar proxy ou verificação TLS. O HTML foi conferido pelo título e pelo texto pertinente. O PDF do CEPEL foi identificado pela assinatura `%PDF-1.6` e teve seu texto extraído e examinado.

| Chave | Origem no catálogo | URL solicitada e final | UTC | Corpo recebido |
| --- | --- | --- | --- | --- |
| EPE-isolados | Nova | [Sistemas Isolados](https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/sistemas-isolados) | 21:07:26 | 97.456 bytes; HTML |
| INPE-Acre | Nova | [Dados de irradiação do Acre](https://labren.ccst.inpe.br/atlas_2017_AC.html) | 21:07:26 | 80.029 bytes; HTML |
| ANEEL-isolados | Nova | [Sistemas Isolados e com Fontes Intermitentes](https://www.gov.br/aneel/pt-br/assuntos/distribuicao/sistemas-isolados-e-com-fontes-intermitentes) | 21:07:26 | 447.345 bytes; HTML |
| ANEEL-MMGD | Nova | [Micro e Minigeração Distribuída](https://www.gov.br/aneel/pt-br/assuntos/geracao-distribuida/) | 21:07:26 | 467.793 bytes; HTML |
| CEPEL-FV | Nova | [Manual de Engenharia para Sistemas Fotovoltaicos](https://cresesb.cepel.br/publicacoes/download/Manual_de_Engenharia_FV_2014.pdf) | 21:07:26 | 17.589.021 bytes; PDF |
| Embrapa-açaí | Nova | [Aproveitamento energético dos resíduos da agroindústria](https://www.alice.cnptia.embrapa.br/handle/doc/949536) | 21:07:26 | 18.174 bytes; HTML |
| INPE-Atlas | Reuso: `inpe-solar` | [Atlas Brasileiro de Energia Solar](https://labren.ccst.inpe.br/atlas_2017.html) | 21:07:31 | 196.031 bytes; HTML |
| Embrapa-umidade | Reuso: `embrapa-moisture` | [Influência da umidade no poder calorífico superior da madeira](https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/315901) | 21:07:32 | 19.669 bytes; HTML |
| Embrapa-biomassa | Reuso: `embrapa-biomass` | [Biomassa e sua participação na matriz energética brasileira](https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/1090875) | 21:07:32 | 22.539 bytes; HTML |

Os tamanhos registram as respostas desta consulta, não um contrato de tamanho ou permanência do conteúdo. Disponibilidade futura e revisão posterior das páginas não foram verificadas.

## Evidência por fonte e limites de uso

### EPE-isolados — conceito e planejamento

- **Evidência:** a página define isolamento em relação ao SIN na configuração normal e apresenta a atuação da EPE no planejamento. O corpo recebido contém a definição, não apenas navegação.
- **Uso:** módulos `amazon-isolated-hybrid` e `amazon-riverside-school-project`.
- **Limite:** não foi copiada a contagem dinâmica de localidades, nem inferida a situação de uma escola ou de todo o Acre. A escola é fictícia. Nenhum ano de publicação foi atribuído à página no JSON.
- **Rastreio web:** `turn19search0`, `turn20view1`, `turn21view3`.

### INPE-Acre — acesso à consulta regional

- **Evidência:** título e conteúdo identificam a base do Acre; há seleção de célula, coordenadas e tipos de irradiação, além de acessos a formatos de dados.
- **Uso:** consulta orientada no projeto da escola, com identificação de célula, mês, grandeza e unidade.
- **Limite:** não se realizou levantamento do telhado nem se incorporou tabela, CSV, mapa ou valor numérico do Atlas ao JSON. `year: 2017` identifica a edição da base, não uma data presumida de atualização da página estadual.
- **Rastreio web:** `turn20view0`. A busca também recuperou a versão em inglês em `turn19search6`; a URL adotada e validada é a portuguesa da tabela acima.

### ANEEL-isolados e ANEEL-MMGD — regimes que não devem ser confundidos

- **Evidência:** a primeira página descreve atendimento SIGFI e MIGDI e acompanhamento pelas distribuidoras; a segunda aborda MMGD, SCEE e modalidades de compensação. Ambas indicam publicação em fevereiro de 2022 e modificação em 09/06/2026.
- **Uso:** distinguir uma bancada autônoma, a ausência de ligação ao SIN e a micro/minigeração conectada à distribuidora no contexto da compensação. Uma rede local pode integrar um sistema isolado; potência pequena, por si só, não prova enquadramento regulatório.
- **Limite:** não foram reproduzidos limites de potência, disponibilidade mensal, prazos de créditos ou condições tarifárias. A prévia indexada de MMGD contém explicações que não apareceram integralmente no texto extraído do GET; a evidência local confirmou o conteúdo sobre compensação e conexão das unidades consumidoras. O manual do CEPEL também distingue aplicações isoladas e conectadas. Não se usou a prévia para importar limites ou regras adicionais.
- **Rastreio web, isolados:** `turn19search1`, `turn20view2`.
- **Rastreio web, MMGD:** `turn19search10`, `turn20view3`, `turn21view4`.

### CEPEL-FV — instrumentação e ambiente quente e úmido

- **Identificação:** Pinho e Galdino, organizadores; CEPEL/CRESESB; edição de **2014**, confirmada na abertura do documento.
- **Evidência localizada:** item 4.9.2, pp. 248–250, sobre supervisão e registros; item 7.4, pp. 382–383, sobre calor, umidade e instalação dos componentes; capítulo 8, especialmente itens 8.3.6 e 8.3.7, p. 433, sobre sensores, registros e plano de manutenção. A p. 277 menciona maresia em aplicações remotas específicas; isso não caracteriza o interior do Acre como ambiente marinho.
- **Uso:** base técnica geral para atividades de instrumentação e observação. A adaptação regional é uma proposta pedagógica, não resultado de inspeção local.
- **Limite:** documento histórico, com referências normativas e exemplos de baterias que precisam de consulta atual e específica. Não foram adotados seus limites, intervalos, graus IP ou prescrições regulatórias como exigências vigentes. Procedimentos para chumbo-ácido não foram apresentados como aplicáveis a lítio.
- **Rastreio web:** `turn20search10`, `turn21view0`, `turn24view2`, `turn24view3`, `turn24view4`.

### Embrapa-açaí — pertinência regional sem combustível comprovado

- **Identificação:** Pessoa e Reis, capítulo de **2012**, em *Tecnologias para inovação nas cadeias euterpe*, pp. 287–303 segundo o registro bibliográfico.
- **Evidência:** título, autoria, ano e descritores do repositório vinculam aproveitamento energético, resíduos e açaí. Essa identificação foi confirmada no HTML recebido.
- **Uso:** justificar a escolha de caroços de açaí como candidato de investigação em um inventário fictício.
- **Limite:** o registro não demonstra estoque, fornecedor, poder calorífico, ensaio de gerador, adequação comercial ou disponibilidade no Acre. A extração web do PDF associado apresentou caracteres ilegíveis; nenhum resultado quantitativo daquele PDF foi usado.
- **Rastreio web:** `turn21view1`; limitação de extração observada em `turn23view0`.

### Fontes existentes reaproveitadas

- **INPE-Atlas — 2017:** a página confirma a edição, unidades de médias do total diário e caráter espacial da base. Registra revisão de 19/11/2020, p. 34, fórmula 5. A atividade orienta consulta; não transforma climatologia em previsão. A página também informa condições de uso e atribuição da base, que não foi reproduzida aqui. Rastreio: `turn21view2`.
- **Embrapa-umidade — 2008:** o registro confirma autores e Comunicado Técnico 220; o texto associado relaciona avaliação energética da madeira, poder calorífico e umidade. Não é evidência experimental para açaí, nem origem de uma nova equação do simulador. Rastreio: `turn20view4`, `turn23view1`, `turn24view0`.
- **Embrapa-biomassa — 2018:** capítulo técnico com recursos e resíduos de biomassa. Foi usado como contexto conceitual, sem reaproveitar suas estatísticas como atuais ou inferir disponibilidade local. Rastreio: `turn20view5`, `turn23view2`, `turn24view1`.

Os identificadores `turn…` são rastreio da consulta web desta sessão, não identificadores permanentes de publicação. As URLs finais validadas estão na tabela.

## Decisões didáticas e conferências

| Tema | Decisão incorporada |
| --- | --- |
| Sistemas híbridos | Comparação fictícia de FV/bateria com FV/bateria/gerador genérico. A bateria é armazenamento. Nenhum combustível real foi selecionado ou validado. |
| Bancada | 48 V CC é a hipótese nominal inicial, alinhada à interface. Não é declaração de segurança, instrução de montagem ou especificação de equipamento. |
| Grandezas | Tensão, corrente, irradiância e temperatura têm unidades explícitas. Potência CC simplificada usa `P = V × I`. Estado de carga é apresentado como estimativa. |
| Modelo virtual e gêmeo digital | Convenção editorial da trilha: dados sintéticos sustentam modelo virtual; gêmeo digital exigiria vínculo a equipamento identificado, telemetria datada, avaliação da qualidade e comparação com medições. O CEPEL sustenta a discussão de aquisição de dados, não uma definição normativa de gêmeo digital. O texto não afirma que essa integração já exista na plataforma. |
| Queda de tensão | Valores fictícios: `100 × (48,0 − 46,8) / 48,0 = 2,5%`. Meta pedagógica de até **3%**, explicitamente sem atribuição de limite geral à ABNT NBR 5410. |
| Normas | Apenas orientação de consulta oficial à edição vigente/licenciada da ABNT NBR 5410 e às demais normas aplicáveis. Nenhum ano de edição foi inventado, nenhum texto normativo foi copiado e nenhuma conformidade foi declarada. |
| Calor, umidade e maresia | Umidade, chuva e possível condensação são condições a investigar. Maresia costeira envolve exposição salina; sua presença não foi inferida para o interior amazônico. Nenhuma classe de corrosividade foi atribuída. |
| Biomassa | Investigar oferta sazonal, umidade, origem, usos concorrentes e logística. Estudo de madeira não foi transferido como ensaio de açaí; energia do material não foi confundida com eletricidade entregue. |
| Escola | Inventário alinhado ao caso da interface: iluminação 1.296 Wh, ventiladores 2.160 Wh, notebooks 2.700 Wh, refrigeração 1.008 Wh, roteador 288 Wh e bomba 500 Wh. Total fictício **7.952 Wh/dia antes das perdas**. Não dimensiona bateria, inversor ou módulos por si só. |
| Dias de menor geração | Cenários inteiramente sintéticos, sem série meteorológica importada, garantia de autonomia ou promessa de atendimento. |

## Conferência de integração

Contrato esperado: array com cinco objetos `{id, title, summary, objectives, sections, activity, references}`. Títulos, resumos, objetivos, seções e atividades contêm `pt`, `en` e `es` não vazios; cada referência conserva o mesmo título, autoria, URL e ano em todos os módulos em que aparece.

Os IDs são `amazon-isolated-hybrid`, `amazon-pv-battery-instrumentation`, `amazon-biomass-residues`, `amazon-operation-humidity` e `amazon-riverside-school-project`.

A pesquisa de conteúdo cobriu parse do JSON, contrato de campos, idiomas, IDs, referências, contagem de URLs e cálculos didáticos. A integração principal também validou TypeScript, build, comportamento no navegador e modelos numéricos; o registro final está em `VERIFICACAO.json`. A microrrede simula um dia: a atividade explica como transportar o SOC final para o início do dia seguinte ao comparar uma sequência de dias.
