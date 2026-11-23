import {useId, useState} from 'react';
import {Icon, Button} from './components';
import {T} from './model';
import {useApp} from './store';

const sources = [
  ['ONS · Integração Acre–Rondônia', 'https://www.ons.org.br/AcervoDigitalDocumentosEPublicacoes/PEN2011_SumarioExecutivo.pdf#page=44'],
  ['ONS · PAR/PEL 2025', 'https://www.ons.org.br/Paginas/energia-no-futuro/suprimento-eletrico/parpel2025/sumario-executivo/index.aspx'],
  ['ONS · PEN SISOL 2026', 'https://www.ons.org.br/AcervoDigitalDocumentosEPublicacoes/RT-ONS%20DPL%200437-2025%20-%20PEN%20SISOL%202026.pdf#page=13'],
  ['EPE · Interligação das localidades', 'https://www.epe.gov.br/pt/imprensa/noticias/epe-publica-analise-de-interligacao-das-4-ultimas-areas-isoladas-no-estado-do-acre'],
  ['EPE · Baterias no POTEE 2026', 'https://epe.gov.br/pt/imprensa/noticias/plano-de-outorgas-do-mme-inclui-empreendimentos-com-tecnologias-inovadoras-resultado-de-estudos-da-epe'],
  ['MME · POTEE 2026', 'https://www.gov.br/mme/pt-br/assuntos/secretarias/sntep/publicacoes/plano-de-outorgas-de-transmissao-de-energia-eletrica-potee/documentos/2026']
];

export function SinAcre({playing}: {playing: boolean}) {
  const {t} = useApp();
  const q = (pt: string, en: string, es: string) => t(T(pt, en, es));
  const [interrupted, setInterrupted] = useState(false);
  const id = useId();
  return <section className="sin-panel sin-acre-panel" id="sin-acre" tabIndex={-1} aria-labelledby={id}>
    <div className="sin-map-heading">
      <div>
        <h2 id={id}>{q('O Acre no SIN', 'Acre in the SIN', 'Acre en el SIN')}</h2>
        <p>{q('Corredor de 230 kV · esquema didático', '230 kV corridor · educational diagram', 'Corredor de 230 kV · esquema didáctico')}</p>
      </div>
      <Button icon={interrupted ? 'reset' : 'bolt'} onClick={() => setInterrupted(value => !value)}>
        {interrupted ? q('Restabelecer trecho', 'Restore section', 'Restablecer tramo') : q('Simular falha Feijó–Cruzeiro do Sul', 'Simulate Feijó–Cruzeiro do Sul outage', 'Simular falla Feijó–Cruzeiro do Sul')}
      </Button>
    </div>
    <div className="sin-acre-circuit" data-playing={playing}>
      <div className="sin-acre-station"><Icon name="network"/><strong>Rio Branco</strong><small>{q('No SIN desde 2009', 'In the SIN since 2009', 'En el SIN desde 2009')}</small></div>
      <span className="sin-acre-line" aria-hidden="true"/>
      <div className="sin-acre-station"><Icon name="bolt"/><strong>Feijó</strong><small>{q('Subestação', 'Substation', 'Subestación')}</small></div>
      <span className="sin-acre-line" data-interrupted={interrupted} aria-hidden="true">{interrupted && <Icon name="close"/>}</span>
      <div className="sin-acre-station" data-interrupted={interrupted}><Icon name="grid"/><strong>Cruzeiro do Sul</strong><small>{q('No SIN desde 16/12/2024', 'In the SIN since 16 Dec 2024', 'En el SIN desde 16/12/2024')}</small></div>
    </div>
    <p className="sin-acre-signal" role="status">{interrupted
      ? q('Trecho indisponível. Cruzeiro do Sul perde o suprimento por esse caminho no cenário simulado. Rio Branco e Feijó permanecem ligados no esquema.',
          'Section unavailable. Cruzeiro do Sul loses supply through this route in the simulation. Rio Branco and Feijó remain connected in the diagram.',
          'Tramo no disponible. Cruzeiro do Sul pierde el suministro por esta ruta en la simulación. Rio Branco y Feijó permanecen conectados en el esquema.')
      : q('Trechos disponíveis. A animação acompanha o percurso do suprimento até Cruzeiro do Sul.',
          'Sections available. The animation follows the supply route to Cruzeiro do Sul.',
          'Tramos disponibles. La animación sigue la ruta del suministro hasta Cruzeiro do Sul.')}</p>
    <div className="sin-acre-facts">
      <div>
        <h3>{q('Sistemas isolados no Acre', 'Isolated systems in Acre', 'Sistemas aislados en Acre')}</h3>
        <p>{q('O PEN SISOL 2026 do ONS lista cinco localidades. As quatro sedes abaixo têm geração térmica local. Vila Restauração, comunidade de Marechal Thaumaturgo, tem geração solar com baterias.',
          'The ONS 2026 plan lists five localities. The four municipal seats below have local thermal generation. Vila Restauração, a community in Marechal Thaumaturgo, uses solar generation with batteries.',
          'El plan 2026 del ONS identifica cinco localidades. Las cuatro cabeceras abajo tienen generación térmica local. Vila Restauração, comunidad de Marechal Thaumaturgo, usa generación solar con baterías.')}</p>
        <ul className="sin-acre-places">
          {['Jordão', 'Marechal Thaumaturgo', 'Porto Walter', 'Santa Rosa do Purus', 'Vila Restauração'].map(place => <li key={place}>{place}</li>)}
        </ul>
      </div>
      <div>
        <h3>{q('Por que a interligação é difícil?', 'Why is interconnection difficult?', '¿Por qué es difícil la interconexión?')}</h3>
        <p>{q('Longas distâncias, acesso sem estradas e travessias de rios encarecem a construção e a manutenção. A escolha do traçado também depende de avaliações socioambientais e da viabilidade econômica de cada localidade.',
          'Long distances, limited road access and river crossings raise construction and maintenance costs. Route selection also depends on environmental and social assessment and the economics of each locality.',
          'Las distancias, la falta de acceso por carretera y los cruces de ríos encarecen la obra y el mantenimiento. El trazado también depende de la evaluación socioambiental y la viabilidad económica de cada localidad.')}</p>
        <h3>{q('Reforços no planejamento', 'Planned upgrades', 'Refuerzos en planificación')}</h3>
        <p>{q('O POTEE 2026 inclui um sistema de baterias de 100 MW e 200 MWh em Cruzeiro do Sul. O projeto visa apoiar o suprimento durante contingências.',
          'The 2026 transmission plan includes a 100 MW, 200 MWh battery system at Cruzeiro do Sul to support supply during outages.',
          'El plan de transmisión de 2026 incluye un sistema de baterías de 100 MW y 200 MWh en Cruzeiro do Sul para respaldar el suministro durante contingencias.')}</p>
      </div>
    </div>
    <div className="reference-links sin-sources">
      {sources.map(([label, url]) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">{label}<Icon name="external"/></a>)}
    </div>
  </section>;
}
