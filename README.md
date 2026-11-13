# BioEnergia Academy Pro 2.0

Distribuição 2.1.0 — Campus Amazônia e comunidades offline. A marca e o visual Pro 2.0 foram preservados.

Plataforma educacional para biomassa, energia fotovoltaica, eólica, hidrelétrica e correntes de maré. Interface em português, inglês e espanhol, com temas claro e escuro, exploração de componentes, simuladores, fórmulas explicadas, cenários, atividades e referências institucionais.

## Testar o HTML

Abra `dist/index.html` no navegador. O arquivo contém React, estilos e as cinco imagens em WebP incorporados. Os simuladores funcionam sem internet. Os links das referências abrem páginas externas.

A logo original do SENAI Hub está incorporada ao cabeçalho, com área de respiro e fundo claro nos dois temas. O rodapé identifica o projeto da turma do Curso Técnico em Sistemas de Energias Renováveis.

As imagens são **renders conceituais gerados para uso didático**, e não fotografias de usinas reais ou desenhos executivos. Os cálculos usam modelos simplificados de regime permanente. As hipóteses e os limites aparecem no laboratório.

O orientador funciona por regras locais e utiliza os parâmetros do cenário. Não utiliza IA generativa nem envia perguntas para serviços externos. Cenários, anotações e progresso ficam no navegador; a exportação permite guardar uma cópia.

## Tecnologias efetivamente utilizadas

| Camada | Implementação nesta entrega |
| --- | --- |
| Interface | React, TypeScript com verificação estrita e Tailwind CSS compilado |
| Cálculo | Motor TypeScript compartilhado entre navegador e API |
| Serviço opcional | Node.js e API REST |
| Comunidade offline | Iniciador e instalação por usuário para Windows/Linux x64, com runtime incluído, cadernos separados e cópia em disco |
| Métricas | Endpoint Prometheus com contadores de requisições, simulações, latência e memória real do processo |
| Painéis | Configuração e dashboard de Grafana provisionados por arquivos |
| Contêiner | Dockerfile e Docker Compose |
| Orquestração | Manifestos de Deployment e Service para Kubernetes |

O HTML calcula localmente. A API é um serviço adicional para integrações; os cliques do HTML offline não são enviados automaticamente ao servidor. As métricas descrevem o serviço de software, não medições de usinas ou sensores.

Não foram criados serviços pagos, contas em nuvem, bancos de dados ou aplicativos nativos. Firebase, Supabase e Amplify são alternativas para uma futura camada de identidade e dados. Datadog e Sentry exigem configuração e credenciais próprias. Swift, Kotlin, Flutter, React Native, .NET MAUI e Ionic correspondem a outros alvos de aplicação. Vue, Angular, Svelte, Next.js e Nuxt são opções de arquitetura; não é necessário combiná-los para executar este projeto. Um CMS pode ser integrado posteriormente se houver demanda por edição de conteúdo por docentes.

## Desenvolvimento

Requisitos: Node.js 24 e npm. As dependências estão fixadas em `package-lock.json`.

```bash
npm ci
npm run typecheck
npm run build
npm test
npm start
```

A aplicação estará disponível em `http://127.0.0.1:8080`. Para testar somente o HTML, nenhuma instalação é necessária. O build é portátil e grava os resultados dentro de `dist/`.

## API REST

| Método | Rota | Função |
| --- | --- | --- |
| GET | `/healthz` | Verificação de funcionamento |
| GET | `/api/sources` | Fontes disponíveis e parâmetros iniciais |
| POST | `/api/simulate` | Cálculo de um cenário validado |
| GET | `/metrics` | Métricas no formato Prometheus |

Exemplo de corpo JSON para `/api/simulate`:

```json
{
  "source": "biomass",
  "values": {
    "mass": 60,
    "lhv": 18.5,
    "moisture": 25,
    "etaBio": 25,
    "aux": 8,
    "hours": 10
  }
}
```

As respostas informam potência em kW e energia em kWh. Valores fora dos intervalos, parâmetros desconhecidos, fonte inválida e JSON malformado são rejeitados. As rotas de simulação são locais e públicas. O servidor opcional de turma acrescenta sessões e papéis próprios em `/api/learning/*`, ativados somente com configuração explícita. Consulte o guia do Campus Amazônia para o piloto com apelidos e seus limites; ele não integra identidade institucional ou SSO.

## Docker, Prometheus e Grafana

Copie `.env.example` para `.env` e defina uma senha própria para `GRAFANA_ADMIN_PASSWORD`. Depois:

```bash
docker compose --profile monitoring up --build -d
```

Endereços locais:

- Aplicação: `http://127.0.0.1:8080`
- Prometheus: `http://127.0.0.1:9090`
- Grafana: `http://127.0.0.1:3001` — usuário `admin` e a senha definida em `.env`

O datasource e o dashboard são provisionados pelos arquivos de `infra/grafana/`. O Prometheus consulta `app:8080/metrics` dentro da rede do Compose. Para gerar movimento nos gráficos de simulação, envie cenários para a API; o HTML offline não gera tráfego de API automaticamente.

As imagens de Prometheus e Grafana usam a tag `latest` para facilitar o ambiente local. Para uma implantação reproduzível, fixe as versões ou os digests escolhidos pela equipe.

## Kubernetes

O arquivo `infra/kubernetes/app.yaml` contém namespace, duas réplicas da aplicação, verificações de funcionamento, limites de recursos e um Service interno. Antes de aplicar, publique a imagem em um registro acessível pelo cluster e ajuste o campo `image`. O manifesto não instala Grafana ou Prometheus e não publica um endereço externo.

```bash
docker build -t bioenergia-academy:2.1.0 .
# Publique/carregue a imagem conforme o cluster e ajuste o manifesto.
kubectl apply -f infra/kubernetes/app.yaml
```

Os arquivos de Docker e Kubernetes foram preparados, mas não foram implantados em servidor ou cluster nesta entrega.

## Organização

- `src/App.tsx`: telas e interações.
- `src/store.tsx`: estado, idioma, tema e armazenamento local.
- `src/energy.ts`: motor de cálculo.
- `src/content.js`: conteúdo didático e referências.
- `src/formula.js`: equações e substituição dos valores.
- `src/guide.js`: orientador por regras.
- `assets/*.webp`: imagens utilizadas na interface.
- `src/profiles.ts` e `src/Community.tsx`: cadernos locais por aluno e interface de troca/backup.
- `offline/`: servidor local, persistência em disco e instalador sem downloads no destino.
- `dist/web/`: distribuição modular pronta, com scripts, estilos e WebPs separados.
- `assets/hotspots.json`: pontos de exploração dos componentes.
- `server/`: API, motor compilado e testes.
- `infra/`: monitoramento e orquestração.
- `docs/IMAGENS.md`: direção visual e prompts dos renders.
- `licenses/`: licenças das bibliotecas distribuídas.

## Verificação

A entrega inclui verificação TypeScript, build de produção, testes do motor e da API, validação do endpoint de métricas e conferência visual no navegador. As configurações de contêiner e cluster precisam ser verificadas no ambiente em que forem executadas.


## Revisão da biblioteca — 01/11/2026

29 referências, incluindo 15 brasileiras e 31 links de acesso conferidos. O catálogo em `src/references.json` contém a origem, o idioma, o tipo, o ano quando identificado e a data de revisão. Todos os módulos incluem leituras brasileiras. A busca aceita múltiplas palavras, com ou sem acentos, e combina filtros por tecnologia e origem.

Use `npm run check:links` para repetir a conferência dos endereços. O relatório de revisão está em `docs/REVISAO_FONTES.md`; os resultados técnicos completos, em `docs/LINKS_VERIFICADOS.json`. Os links externos precisam de internet e sua disponibilidade pode mudar.


## Campus Amazônia

A extensão preserva a Pro 2.0 e inclui bancada solar/eólica com conexões interativas, instrumentos virtuais, três casos de microrrede solar–bateria–diesel, cinco módulos de estudo PT/EN/ES, caderno portátil e serviço opcional de turma e tutoria. A distribuição contém HTML autônomo e PWA. Consulte `docs/AMAZONIA_GUIA_TESTE.md` para uso, limites dos modelos, persistência, ativação do servidor de turma e validação. A identidade SENAI Hub original e a autoria da turma foram mantidas.

A **Bancada fotovoltaica** abre pelo menu e pela área de conexões do Campus Amazônia. Ela inclui montagem com fotos, modos on-grid, off-grid e híbrido com saída EPS, e ajuste de 1 a 12 módulos em série. As ligações ficam no navegador, por caderno. O simulador está em português e funciona no PWA, no pacote comunitário e no HTML portátil. Os limites didáticos, referências e créditos das fotos ficam no próprio módulo.

## Computadores das comunidades

Os pacotes comunitários incluem `COMECE_AQUI.html`, iniciador, instalador/atualizador, runtime oficial e a distribuição modular. Podem ser levados por pendrive e usados sem internet no primeiro acesso. Cadernos ficam fora das pastas de release; atualizações conservam os trabalhos e as versões anteriores. Para testar sem instalar, utilize o iniciador da pasta extraída. O diretório `cadernos` padrão continua sendo da conta local do sistema, inclusive no modo portátil.

Consulte `docs/COMUNIDADES_OFFLINE.md` para requisitos, backups, segurança local, geração dos pacotes e limites de verificação. O servidor comunitário atende somente este computador; não equivale a um servidor de turma na rede. No PWA para hospedagem, utilize o conteúdo de `dist/web/`; mantenha `dist/index.html` como opção autônoma para cópia direta.
