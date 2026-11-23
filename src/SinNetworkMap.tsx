import {useId, type CSSProperties} from 'react';
import {Icon} from './components';
import {T} from './model';
import {useApp} from './store';
import {sinRegionText} from './sin-content';
import {sinRegions} from './sin-engine';
import type {SinRegion, SinResult} from './sin-engine';
import {acreNode, brazilOutline, mapCorridors, mapNodes, mapSize} from './sin-geography';

export type SinMapSelection = SinRegion | 'acre';
const regionIcons: Record<SinRegion, string> = {north: 'drop', northeast: 'wind', central: 'bolt', south: 'grid'};

export function SinNetworkMap({result, selected, onSelect, playing}: {
  result: SinResult;
  selected: SinMapSelection;
  onSelect: (region: SinMapSelection) => void;
  playing: boolean;
}) {
  const {t, lang} = useApp();
  const power = new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : lang);
  const id = useId();
  const {width, height} = mapSize;
  const position = ({x, y}: {x: number; y: number}) => ({left: x / width * 100 + '%', top: y / height * 100 + '%'});

  return <div className="sin-map" data-playing={playing}>
    <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={id + '-land'} x1="0" x2="1" y1="0" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor="var(--sin-land-top)"/>
          <stop offset="1" stopColor="var(--sin-land-bottom)"/>
        </linearGradient>
        <pattern id={id + '-grid'} width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M22 0H0V22" fill="none" stroke="var(--sin-grid)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${id}-grid)`}/>
      <g className="sin-map-radar">
        <circle cx="375" cy="275" r="104"/><circle cx="375" cy="275" r="172"/><circle cx="375" cy="275" r="237"/>
        <path d="M375 27V532 M80 275H627"/>
      </g>
      <path d={brazilOutline} className="sin-land" fill={`url(#${id}-land)`}/>
      {result.corridors.map(({id: corridorId, flow, limit, enabled}) => {
        const {path, arrow: [x, y, angle]} = mapCorridors[corridorId];
        const active = flow !== 0;
        const status = !enabled ? 'off' : Math.abs(flow) >= limit ? 'limit' : active ? 'active' : 'idle';
        const loading = Math.abs(flow) / limit;
        return <g key={corridorId} style={{'--sin-flow-duration': `${2.2 - loading}s`} as CSSProperties} className={`sin-link sin-link-${status}`} data-direction={flow < 0 ? 'reverse' : 'forward'}>
          {active && <path className="sin-link-halo" d={path}/>}
          <path className="sin-link-base" d={path} strokeWidth={active ? 2.5 + 3 * Math.abs(flow) / limit : 2.5}/>
          {active && <>
            <path className="sin-link-trail" d={path} pathLength="100"/>
            <path className="sin-link-particles" d={path} pathLength="100"/>
            <path className="sin-link-arrow" d="M-7 -6 1 0-7 6 M1 -6 9 0 1 6"
              transform={`translate(${x} ${y}) rotate(${angle + (flow < 0 ? 180 : 0)})`}/>
          </>}
          {!enabled && <path className="sin-link-arrow" d="M-5 -5 5 5 M-5 5 5 -5" transform={`translate(${x} ${y})`}/>}
        </g>;
      })}
    </svg>
    <div className="sin-map-points" role="group" aria-label={t(T('Locais no mapa do SIN', 'Locations on the SIN map', 'Lugares en el mapa del SIN'))}>
      {sinRegions.map(region => <button type="button" key={region} className="sin-point" style={position(mapNodes[region])}
        data-deficit={result.regions[region].deficit > 0} aria-pressed={selected === region}
        aria-label={t(sinRegionText[region].name)} onClick={() => onSelect(region)}>
        <span className="sin-point-marker"><Icon name={regionIcons[region]}/></span>
        <span className="sin-point-label">{t(sinRegionText[region].short)}</span>
      </button>)}
      <button type="button" className="sin-point sin-point-acre" style={position(acreNode)}
        aria-pressed={selected === 'acre'} aria-label={t(T('Acre · Rio Branco', 'Acre · Rio Branco', 'Acre · Rio Branco'))} onClick={() => onSelect('acre')}>
        <span className="sin-point-marker"><span/></span><span className="sin-point-label">Acre</span>
      </button>
    </div>
    <div className="sin-map-hud">
      <span>{t(T('Carga atendida', 'Load served', 'Carga atendida'))}</span>
      <strong>{power.format(result.total.served)} <small>MW</small></strong>
    </div>
  </div>;
}
