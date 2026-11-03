# Distribuição para comunidades — 2.1.0

A identidade visual Pro 2.0, a logo SENAI Hub original, o rodapé da turma e os cinco laboratórios foram preservados. A distribuição 2.1.0 acrescenta perfis locais e instalação por usuário sem downloads no computador de destino.

## Arquitetura e formas de acesso

| Entrega | Finalidade |
| --- | --- |
| `dist/index.html` | Arquivo portátil autônomo com imagens, estilos e código incorporados. |
| `dist/web/` | Distribuição modular: HTML, scripts, CSS, WebPs, manifest, ícones e worker separados. Base do PWA e dos pacotes comunitários. |
| Pacote Windows x64 | Node.js oficial incluído; `INSTALAR_ATUALIZAR.cmd` e `INICIAR.cmd`. |
| Pacote Linux x64 | Node.js oficial incluído; `sh INSTALAR_ATUALIZAR.sh` e `sh INICIAR.sh`. |
| `COMECE_AQUI.html` | Manual autoral sem dependências de rede, incluído nos dois pacotes. |

O aluno não precisa instalar Node.js, npm, Python ou Docker. Precisa de navegador compatível com JavaScript moderno já disponível no computador. Pacotes para Windows 10/11 x64 e Linux x64 com kernel ≥ 4.18 e glibc ≥ 2.28; não abrangem ARM, Windows 32 bits, macOS ou Alpine/musl. Requisitos do runtime foram conferidos no `BUILDING.md` da tag v24.22.2, não na branch principal: <https://github.com/nodejs/node/blob/v24.22.2/BUILDING.md>.

O servidor local usa exclusivamente `127.0.0.1:47329`. Não publica a plataforma na rede, não instala serviço do sistema, não cria regra de firewall e não exige administrador. Mantém uma janela aberta durante o estudo. O navegador e a capacidade de executar aplicações locais dependem da política da instituição.

## Cadernos e recuperação

- Até 50 cadernos, incluindo o principal, identificados por apelidos únicos.
- O caderno principal conserva as chaves de armazenamento da versão anterior. Novos cadernos separam parâmetros dos cinco laboratórios, notas, cenários, estudos, projetos, sessão de turma e identidade de dispositivo.
- A página identifica o caderno por parâmetro de URL. Duas abas abertas não passam a gravar silenciosamente no perfil selecionado em outra aba.
- A troca solicita persistência antes de reabrir a plataforma. Se nenhum armazenamento funcionar, a troca não prossegue.
- IndexedDB e recuperação local continuam disponíveis no HTML e no PWA. No pacote comunitário, o servidor grava também JSON validado em uma pasta privada da conta do sistema.
- Os JSONs de disco não contêm tokens da turma nem segredos de dispositivo. São arquivos locais sem criptografia própria. Os cadernos não implementam autenticação e não impedem o acesso de outras pessoas na mesma conta do computador.
- Cada arquivo conserva uma cópia anterior válida em `.previous.json`; leituras tentam essa cópia quando o arquivo atual estiver corrompido. Repetições da mesma sequência são idempotentes; versões antigas ou divergentes na mesma sequência não sobrescrevem o trabalho.
- Cópias do navegador e disco são comparadas na abertura, e uma cópia válida mais recente pode recuperar o caderno e os parâmetros originais. O inventário de perfis de disco recompõe a lista local quando necessário.
- Backup individual: exportar JSON e importar no caderno escolhido do outro computador. A importação substitui o caderno aberto. Backup integral: fechar o programa e copiar a pasta `cadernos`; preservar antes qualquer pasta existente no destino.

Pastas padrão: Windows `%LOCALAPPDATA%\BioEnergiaAcademy\cadernos`; Linux `${XDG_DATA_HOME:-~/.local/share}/BioEnergiaAcademy/cadernos`. O iniciador mostra o caminho real. A aplicação preserva cópias locais ao encontrar conflito e orienta exportação; não funde automaticamente alterações de vários computadores.

## Instalação e atualização

O instalador verifica tamanho e SHA-256 dos arquivos declarados, rejeita caminhos inseguros e links simbólicos nos arquivos de origem e só atualiza o iniciador após copiar a distribuição completa. As releases ficam separadas e as anteriores são conservadas. A pasta de cadernos fica fora delas. Instalar o mesmo pacote novamente reutiliza a release íntegra; uma cópia danificada é preservada separadamente antes do reparo.

O aplicativo precisa estar fechado para a atualização. O atalho e o iniciador apontam para a nova release. Quando existe um worker instalado, a aplicação solicita sua atualização e oferece reabertura após salvar. A porta e a origem permanecem estáveis para conservar o armazenamento do navegador.

Hashes detectam corrupção e divergências; não fornecem assinatura própria do publicador. Os binários Node.js foram obtidos do domínio oficial e comparados ao `SHASUMS256.txt` oficial por HTTPS. A assinatura GPG desse arquivo não foi verificada separadamente. Licenças do Node.js e das bibliotecas acompanham o pacote, assim como `RUNTIME_PROVENIENCIA.json`.

Fonte oficial da versão: <https://nodejs.org/en/download/archive/v24.22.2>.

## Reprodução dos pacotes pelo desenvolvedor

Na máquina de preparação com internet:

```sh
npm ci
npm run typecheck
npm run build
npm test
python3 scripts/prepare-runtimes.py --output .cache/runtimes
npm run package:offline -- --runtimes .cache/runtimes --output dist/community
node scripts/verify-community.mjs --packages dist/community
```

O preparador utiliza somente Python padrão, mantém proxy e validação TLS e extrai apenas o executável e a licença dos arquivos oficiais. O empacotador confere o hash do executável extraído. Ao criar ZIPs, incluir somente `distribution.json` e os caminhos declarados em `files`; arquivos temporários ou ocultos não fazem parte da distribuição. O runtime, os pacotes e os dados locais não devem ser versionados no repositório de código-fonte.

## Verificação e limites

Os 40 testes automatizados incluem isolamento de perfis, migração das chaves principais, persistência, recuperação, conflito, proteção de origem/host/cliente remoto, integridade de instalação, atualização, cache modular e sincronização por perfil. `PACOTES_VERIFICADOS.json` registra o teste real de instalação, início, arquivos estáticos, gravação e reinstalação com o runtime Linux incluído. O teste utiliza pasta temporária e não cria atalho no desktop.

A interface foi conferida em desktop e em viewport de 375 CSS px, com PT/EN/ES e temas claro/escuro. A troca de equipes preservou um cenário de 600 W/m² e a justificativa do projeto, enquanto outra equipe iniciou com 800 W/m² e justificativa vazia. A interface confirmou gravação em disco na prévia de teste.

O executável Windows teve procedência e integridade verificadas; não havia Windows disponível para executá-lo ou testar o atalho. O funcionamento em dispositivos físicos, políticas institucionais, atalhos do sistema e instalação PWA ainda precisam de teste no ambiente de destino. Não foi realizada desconexão física da rede do navegador; os testes de worker simulam ausência de rede e o iniciador/instalador não baixam recursos durante o uso.

Apostilas autorais e recursos de simulação estão incluídos. Publicações externas continuam acessíveis por links; não foram redistribuídos PDFs de terceiros sem licença confirmada. O pacote comunitário não ativa serviços remotos de turma, SSO ou sincronização em nuvem. As hipóteses e os limites dos modelos didáticos permanecem descritos no Campus Amazônia.
