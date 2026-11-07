# Usina de biomassa 3D

Abra **Laboratório 3D → Usina de biomassa**. A estação representa uma usina de combustão direta de biomassa sólida com turbina a vapor de condensação. O modelo e o cálculo carregam com os arquivos locais da plataforma. As referências externas são para consulta com internet.

## Roteiro de aula

1. Na **Vista geral**, identifique o estoque, a esteira de dosagem, a caldeira, a turbina, o gerador e o transformador. Ative **Animar operação** para acompanhar as setas de fluxo.
2. Selecione **Corte da caldeira**. Localize a grelha, os tubos de água e as saídas independentes de vapor e de gases. Identifique como o calor da combustão chega à água.
3. Em **Ciclo a vapor**, siga o vapor vivo até a turbina, o vapor de escape até o condensador e a água de alimentação de volta à caldeira. Compare com **Resfriamento**, que destaca a circulação de água entre condensador e torre.
4. Em **Gases e cinzas**, compare o duto entre a caldeira, o filtro e a chaminé com as linhas de retirada de cinzas de fundo e volantes.
5. Em **Ilha de geração**, acompanhe a transmissão de torque e a saída elétrica. Use **Detalhar turbina e gerador** para inspecionar a carcaça, o rotor, o acoplamento, o estator e os terminais em vista montada ou explodida.

## Ensaio com cavacos de serraria no Acre

Em um cenário didático, compare dois lotes de cavacos com a mesma vazão mássica de biomassa úmida. Use **Carregar ensaio** e alterne **25% de umidade** e **50% de umidade**. Mantenha 60 kg/h, PCI seco de 18,50 MJ/kg, rendimento elétrico bruto de 25%, auxiliares de 8% da geração bruta e período de 10 h.

| Umidade em base úmida | PCI recebido (MJ/kg) | Potência térmica (kWₜ) | Potência elétrica bruta (kWₑ) | Auxiliares (kWₑ) | Potência elétrica líquida (kWₑ) | Energia líquida (kWh) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 25% | 13,26 | 221,07 | 55,27 | 4,42 | 50,85 | 508,46 |
| 50% | 8,03 | 133,81 | 33,45 | 2,68 | 30,78 | 307,76 |

Explique a redução de aproximadamente 39,5% na potência líquida com base na menor fração de matéria seca e na energia de evaporação da água. Ao zerar a alimentação, o balanço em regime permanente indica potência zero e a animação para.

## Memória de cálculo

- **PCI recebido** em MJ/kg = máx(0, PCI seco × (1 − U) − 2,443 × U), com U como fração de umidade em base úmida.
- **Potência térmica do combustível** em kWₜ = vazão mássica em kg/h × PCI recebido / 3,6.
- **Potência elétrica bruta** em kWₑ = potência térmica × rendimento elétrico bruto em fração.
- **Potência elétrica líquida** em kWₑ = potência bruta × (1 − fração de consumo auxiliar).
- **Energia líquida** em kWh = potência líquida × tempo de operação em horas.

A geometria e as velocidades de animação são ilustrativas. O cálculo usa rendimento global assumido em regime permanente. Para dimensionar uma instalação, são necessários dados de ensaios do combustível, condições do ciclo a vapor e especificações dos equipamentos.

## Referências técnicas

- A seção de equipamentos descreve o ciclo Rankine em projetos brasileiros a biomassa e distingue turbinas de condensação, contrapressão e extração. [EPE. Nota Técnica EPE-DEE-089/2019-r0](https://www.epe.gov.br/sites-pt/publicacoes-dados-abertos/publicacoes/PublicacoesArquivos/publicacao-433/EPE-DEE-089-2019-r0%20-%20NT%20BIOMASSA%20LEILOES.pdf)
- A Figura 7-1 reúne os circuitos de vapor, resfriamento, gases e cinzas de uma usina a biomassa. [U.S. EPA. Biomass Combined Heat and Power Catalog of Technologies](https://www.epa.gov/sites/default/files/2015-07/documents/biomass_combined_heat_and_power_catalog_of_technologies_v.1.1.pdf)
- O Comunicado Técnico 220 examina a influência da umidade no poder calorífico superior da madeira. O ensaio da plataforma usa uma aproximação para o PCI recebido. [Embrapa Florestas. Influência da umidade no poder calorífico superior da madeira](https://www.infoteca.cnptia.embrapa.br/handle/doc/315901)
