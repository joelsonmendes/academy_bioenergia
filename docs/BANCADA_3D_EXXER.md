# Bancada renovável 3D

**BioEnergia Academy · Guia de adaptação didática**

Abra **Laboratório 3D → Bancada renovável**. Selecione o modo, inspecione os módulos e registre um minuto antes de mudar cada variável. A coleta automática avança um minuto simulado por segundo. O CSV reúne até as últimas 120 amostras da sessão, inclusive de modos diferentes. Exporte-o antes de reiniciar ou sair da bancada.

## Relação com os materiais recebidos

As referências de página abaixo usam a ordem dos arquivos PDF.

| Material e páginas | Conteúdo aproveitado | Adaptação na plataforma |
| --- | --- | --- |
| Guia teórico ERN100, pp. 9–12 | Associação de módulos e conversão fotovoltaica | Controle de módulos em série e ramais em paralelo. Tensão, corrente e potência disponíveis no PMP. |
| Guia teórico ERN100, pp. 13–24 | Aerogerador, conversão CC/CA, sistemas conectados, isolados e híbridos | Seleção da fonte, troca com a rede, bateria e atendimento à carga. |
| Guia teórico ERN100, pp. 25–35, e Caderno do aluno, pp. 2–12 | Inspeção dos módulos, aquisição de dados e sistema com dois reservatórios | Componentes 3D selecionáveis, supervisório virtual, duas colunas de água e distância medida por sensor ultrassônico virtual. |
| Guia prático ERN100, tarefas 1–4, pp. 4–18, e Caderno, pp. 13–19 | Variação de vento ou luz em geração on-grid e registro de parâmetros | Modo **On-grid** com fonte solar, eólica ou combinada, medição de importação/exportação e perda simulada da rede. |
| Guia prático ERN100, tarefas 5–9, pp. 19–37, e Caderno, pp. 20–28 | Geração isolada solar, eólica e mista, armazenamento e alimentação das cargas | Modo **Off-grid** com balanço por minuto, corrente da bateria com sinal, estado de carga e déficit. |
| Guia prático ERN100, tarefa 10, pp. 38–41, e Caderno, pp. 29–30 | Comparação entre luz, potência e transferência de água | Modo **Bombeamento solar** com alimentação FV direta ilustrativa, altura manométrica ajustável, vazão média, volume e distância. |

Os modelos, roteiros e percursos de energia foram construídos para a plataforma. Os percursos coloridos são esquemáticos. O modo bombeamento usa alimentação direta, uma simplificação em relação à montagem com bateria mostrada na prática do fabricante. As ligações por terminais, os instrumentos e as falhas virtuais podem ser praticados em **Campus Amazônia → Bancada virtual**.

### Dados que exigem conferência no equipamento

- A capa usa a designação **ERN100**, enquanto o capítulo de exploração também cita **RENEW2000**. A revisão da bancada física deve ser identificada pela plaqueta e pelo manual que a acompanha.
- O guia teórico apresenta a bateria como 12 V e “30 [A]” (p. 29). A capacidade em Ah requer confirmação.
- Na p. 30, o título da carga e a identificação da lâmpada indicam 24 V, mas a linha de alimentação indica 12 V. O valor deve ser confirmado na carga instalada.
- Na p. 32, a corrente e a faixa do controlador aparecem junto à designação do modelo. Conferir o datasheet da unidade montada antes de adotar os valores.

Os parâmetros da simulação foram definidos para fins didáticos. A montagem física depende do manual da unidade, do esquema aprovado e da supervisão docente.

## Aplicação em aula

| Ensaio | Condições | Resultado esperado e evidência |
| --- | --- | --- |
| On-grid | FV com 2 módulos em série, 1 ramal, 25 °C e carga de 100 W. Compare 800 e 250 W/m² com rede presente. Simule sua retirada depois. | O medidor passa de 50,4 W exportados a 53 W importados. Sem rede, a saída CA do inversor modelado vai a zero. O aluno explica por que ainda existe potência FV disponível no PMP. |
| Off-grid | Solar + eólica, carga de 100 W e bateria acima da reserva. Zere a irradiância e depois o vento. | A corrente muda de sinal conforme o balanço. Registre o SOC em minutos sucessivos e identifique o momento em que parte da demanda deixa de ser atendida. |
| Bombeamento | Irradiância de 800 W/m², 2 módulos em série, 1 ramal, 25 °C e reservatório superior abaixo de 12 L. Compare alturas de 5 m e 10 m antes de avançar o tempo. | Vazão aproximada de 7,34 e 3,67 L/min. Registre volume, altura e vazão. O nível de 20 L interrompe a transferência. |

Para avaliar, peça ao aluno que registre as condições iniciais, mude uma variável por vez, apresente duas amostras comparáveis e justifique o resultado pelo balanço de energia ou de volume. A planilha pode ser aberta com separador ponto e vírgula. As potências e as vazões exportadas representam o minuto registrado, enquanto SOC, volumes e distância representam o estado no início desse minuto.

## Premissas e fórmulas

| Grandeza | Modelo didático |
| --- | --- |
| FV | Módulos idênticos, 100 W e 18 V no PMP a 1.000 W/m² e 25 °C. Potência disponível proporcional à irradiância, ao número de módulos e ao fator térmico 1 − 0,0035 × (T − 25). No PMP ilustrativo, V = Nₛ × tensão do módulo à temperatura T e I = P/V. |
| Eólica | Mesmo motor de cálculo do simulador. P = ½ × ρ × A × v³ × Cₚ × η, com rotor de 1,25 m, ρ = 1,225 kg/m³, Cₚ = 0,30, conversão de 85% e limite de 150 W. Faixa de geração de 3 m/s até abaixo de 25 m/s. |
| On-grid | Saída CA de até 250 W com rendimento de 94%. Com rede presente, P de troca = P do inversor − P da carga. Valor positivo indica exportação. Tensão CA virtual de 220 V e fator de potência unitário. |
| Off-grid | Conversão das fontes de 94%, inversor de 92% e armazenamento ilustrativo de 240 Wh a 24 V. SOC de 20% a 95%, até 150 W de carga ou descarga e eficiência de 95% em cada sentido. Por minuto, ΔE (Wh) = (0,95 × P de carga − P de descarga/0,95)/60. |
| Bombeamento | Alimentação FV direta com conversor de 94%, bomba com até 20 W elétricos e eficiência hidráulica de 30%. Abaixo de 4 W disponíveis no acionamento, a bomba fica parada. Pₕ = ρ × g × Q × H para Q em m³/s e H em m. Q (L/min) = 60.000 × Pₕ/(ρ × g × H). A altura já representa a altura manométrica total. |
| Reservatórios | Volume total de 24 L, máximo superior de 20 L, reserva inferior de 1 L e seção equivalente uniforme. Distância no tanque superior d (cm) = 30 − 25 × V superior/20, com V em L. |

O modelo usa rendimentos fixos e regimes médios para comparar grandezas. A simulação roda localmente no navegador. Os links para leituras externas requerem acesso à internet.

## Referências

- EXXER. *Guia do aluno ERN100*, módulos teórico e prático, versão V01. Materiais enviados para análise.
- EXXER. *Caderno — Guia do Aluno — Bancada Fotovoltaica*. Material enviado para análise.
- CEPEL/CRESESB. [Manual de Engenharia para Sistemas Fotovoltaicos, seção de bombeamento de água](https://cresesb.cepel.br/publicacoes/download/Manual_de_Engenharia_FV_2014.pdf).
- U.S. Department of Energy. [Solar Integration: Inverters and Grid Services Basics](https://www.energy.gov/cmei/systems/solar-integration-inverters-and-grid-services-basics).
