# Hidrelétrica 3D

**BioEnergia Academy · Unidade Francis de eixo vertical**

Abra **Laboratório 3D → Hidrelétrica**. Explore a casa de força, o conjunto em corte e a vista explodida. Selecione uma peça na cena ou na lista para ler sua função. Ative o trajeto da água e inicie a animação para acompanhar o escoamento e o giro do conjunto.

## Caminho da água e da energia

| Componente | O que observar |
| --- | --- |
| Conduto forçado e caixa espiral | O conduto leva água à unidade. A caixa espiral distribui o escoamento ao redor do rotor. |
| Distribuidor | As palhetas diretrizes orientam a água e regulam a vazão que chega ao rotor. |
| Rotor Francis | As pás fixas recebem o escoamento pela periferia e o redirecionam para a saída axial. O rotor entrega torque ao eixo. |
| Eixo, rotor do gerador e estator | O eixo transmite torque. O campo magnético do rotor induz tensão alternada nos enrolamentos fixos do estator. |
| Tubo de sucção | O duto de seção crescente conduz a água ao canal de fuga e recupera parte da energia cinética em pressão. |
| Galerias e ponte rolante | A estrutura dá acesso à unidade. A ponte rolante movimenta componentes durante montagem e manutenção. |

## Prática de aula

1. Restaure o cenário inicial. Use queda bruta de **20 m**, perda de **2 m**, rendimento de **85%** na turbina e **95%** no gerador. O limite elétrico é de **100 kW**.
2. Registre a queda líquida, a potência hidráulica, a potência no eixo e a potência entregue para vazão de **0,50 m³/s**.
3. Aumente a vazão para **1,00 m³/s**, mantenha os demais ajustes e explique por que a potência elétrica entregue atinge o limite. Depois, iguale a perda de carga à queda bruta e verifique o resultado.
4. Relacione cada etapa da memória de cálculo a um componente. Entregue os três resultados e justifique-os.

| Ensaio | Queda líquida | Potência hidráulica | Potência no eixo | Potência elétrica entregue |
| --- | ---: | ---: | ---: | ---: |
| Cenário inicial | 18,00 m | 88,29 kW | 75,05 kW | 71,29 kW |
| Vazão dobrada | 18,00 m | 176,58 kW | 150,09 kW | 100,00 kW |
| Perda igual à queda bruta | 0,00 m | 0,00 kW | 0,00 kW | 0,00 kW |

## Premissas

O laboratório usa os mesmos dados e cálculos do simulador hidrelétrico. A queda líquida é a diferença entre queda bruta e perdas, limitada a zero. A potência hidráulica em kW é ρ × g × Q × H líquida / 1.000, com densidade de 1.000 kg/m³, g de 9,81 m/s², vazão em m³/s e queda em m. Os rendimentos reduzem a potência em cada etapa. A energia em kWh é a saída elétrica multiplicada pelo tempo em h.

A geometria, a quantidade de pás e polos e as velocidades da animação são ilustrativas. O exemplo usa uma unidade didática de 100 kW, rendimentos constantes e perda de carga ajustada manualmente. O limite elétrico é aplicado à saída estimada. A resposta do regulador, as curvas de rendimento e os transitórios hidráulicos ficam fora deste ensaio. As três imagens orientaram o corte e a organização visual do modelo. Os recursos 3D são gerados no navegador.

## Referências

- Itaipu Binacional. [Principais características técnicas, seção Unidade Geradora](https://www.itaipu.gov.br/sites/default/files/af_df/2202_023_revista_aspectos_tecnicos_bizuarios_018.pdf).
- U.S. Department of Energy. [Types of Hydropower Turbines](https://www.energy.gov/cmei/water/types-hydropower-turbines).
