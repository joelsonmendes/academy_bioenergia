# Aerogerador 3D

**BioEnergia Academy · Aerogerador de eixo horizontal**

Abra **Laboratório 3D → Aerogerador 3D**. Alterne entre a vista geral, a nacele em corte e a vista explodida. Selecione as peças na cena ou na lista. Use **Animar operação** para acompanhar a rotação, a multiplicação de velocidade e o anemômetro. As setas indicam a direção do vento.

## Componentes e observações

| Componente | Função no conjunto |
| --- | --- |
| Pás e cubo | As forças aerodinâmicas nas pás geram torque, transmitido pelo cubo ao eixo lento. |
| Controle de passo (*pitch*) | Gira cada pá em torno do seu eixo longitudinal. A posição em bandeira ilustra a redução de torque aerodinâmico na parada por vento forte. |
| Eixo lento, mancal e caixa multiplicadora | O mancal sustenta o eixo. As engrenagens aumentam a rotação do eixo que aciona o gerador. |
| Eixo rápido e freio | O eixo rápido aciona o gerador. O freio integra o sistema de parada e imobilização. |
| Gerador e conversor | O gerador converte potência mecânica em elétrica. A eletrônica de potência condiciona a energia para conexão elétrica. |
| Orientação (*yaw*) | Gira a nacele em torno do eixo vertical da torre. Use **Demonstrar yaw** para observar a mudança de orientação. |
| Anemômetro, sensor de direção, torre e nacele | Os sensores medem o vento. A torre eleva e sustenta a nacele, que abriga os equipamentos. |

## Ensaio de potência

Restaure o cenário inicial. O rotor tem diâmetro didático de **8 m**, área varrida de **50,27 m²**, densidade do ar de **1,225 kg/m³**, coeficiente de potência de **0,42**, rendimento global de **90%** e limite elétrico de **20 kW**.

| Velocidade | Potência do vento na área varrida | Saída elétrica | O que observar |
| ---: | ---: | ---: | --- |
| 2 m/s | 0,25 kW | 0,00 kW | Abaixo da partida. |
| 8 m/s | 15,76 kW | 5,96 kW | Geração na faixa de operação. |
| 10 m/s | 30,79 kW | 11,64 kW | Efeito da relação cúbica com a velocidade. |
| 14 m/s | 84,48 kW | 20,00 kW | Saída no limite nominal. |
| 25 m/s | 481,06 kW | 0,00 kW | Parada por vento forte. Compare as pás e o anemômetro. |

Peça ao aluno que registre quatro pontos da curva, explique a diferença entre potência do vento e potência entregue e identifique os eixos de rotação de *pitch* e *yaw*. Ao manter a saída de 5,96 kW por 8 h no cenário inicial, a energia calculada com os valores sem arredondamento é de 47,67 kWh.

## Memória de cálculo

- Área varrida A = πD²/4.
- Potência disponível P do vento = ½ρAv³/1.000, em kW. Use ρ em kg/m³, A em m² e v em m/s.
- Na faixa de operação, a potência captada estimada é P do vento × Cₚ. A saída elétrica é limitada ao menor valor entre a potência captada × rendimento e a potência nominal.
- O modelo produz a partir de 3 m/s e interrompe a geração a partir de 25 m/s. Os valores de partida e parada de um equipamento comercial dependem do fabricante.
- Energia E = P elétrica × t, em kWh, para potência constante e tempo em horas.

A cena representa uma arquitetura com caixa multiplicadora. Geometria, engrenamento, ângulo de passo e rotações da animação são ilustrativos. O demonstrador de yaw gira a nacele no modelo, e a curva considera vento alinhado ao rotor. O cálculo compartilha os parâmetros do simulador eólico e usa densidade, Cₚ e rendimento constantes. A resposta transitória do equipamento fica fora do ensaio.

## Referências

- U.S. Department of Energy. [Explore a Wind Turbine — componentes e funções](https://www.energy.gov/cmei/systems/explore-wind-turbine-text-version).
- U.S. Department of Energy. [How Do Wind Turbines Survive Severe Weather and Storms?](https://www.energy.gov/cmei/wind/articles/how-do-wind-turbines-survive-severe-weather-and-storms).
- EPE. [ABCDEnergia — fontes de energia, seção Energia Eólica](https://www.epe.gov.br/pt/abcdenergia/fontes-de-energia).
