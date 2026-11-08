import React from 'react';
import type {Language} from './types';
import {tr, format, T} from './model';
import type {PVProject, PVCalculation} from './pv-report-engine';
import {pvSystems} from './pv-report-content';

export function PVUnifilar({project, result, lang, diagramRef}: {
  project: PVProject;result: PVCalculation;lang: Language;diagramRef?: React.Ref<SVGSVGElement>;
}) {
  const t = (pt: string, en: string, es: string) => tr(T(pt, en, es), lang);
  const n = (v: number | null, digits = 1) => format(v, lang, digits);
  const storage = project.system !== 'ongrid';
  const grid = project.system !== 'offgrid';
  const hybrid = project.system === 'hybrid';
  const v = project.inputs;

  function box(x: number, y: number, width: number, height: number, title: string, rows: string[], accent = '#dceee5') {
    return <g>
      <rect x={x} y={y} width={width} height={height} rx="5" fill="#fff" stroke="#294655" strokeWidth="1.8"/>
      <rect x={x + 1} y={y + 1} width={width - 2} height="30" rx="4" fill={accent}/>
      <text x={x + width / 2} y={y + 21} textAnchor="middle" fontSize="14" fontWeight="700">{title}</text>
      {rows.map((text, index) => <text key={index} x={x + width / 2} y={y + 52 + index * 20} textAnchor="middle" fontSize="13">{text}</text>)}
    </g>;
  }
  function breaker(x: number, y: number, label: string) {
    return <g fill="#fff" stroke="#263d4b" strokeWidth="2">
      <circle cx={x - 14} cy={y} r="3"/><circle cx={x + 14} cy={y} r="3"/>
      <path d={'M' + (x - 12) + ' ' + (y - 2) + 'l21 -17'} fill="none"/>
      <text x={x} y={y + 27} textAnchor="middle" stroke="none" fill="#263d4b" fontSize="13">{label}</text>
    </g>;
  }

  return (
    <svg ref={diagramRef} className="pv-unifilar" viewBox="0 0 1100 570" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label={t('Diagrama unifilar fotovoltaico preliminar', 'Preliminary PV single-line diagram', 'Diagrama unifilar fotovoltaico preliminar')}>
      <title>{t('Diagrama unifilar', 'Single-line diagram', 'Diagrama unifilar') + ' · ' + tr(pvSystems[project.system], lang)}</title>
      <rect width="1100" height="570" fill="#fff"/>
      <g fontFamily="Arial, sans-serif" fill="#183643">
        <text x="28" y="31" fontSize="20" fontWeight="700">BIOENERGIA ACADEMY</text>
        <text x="28" y="55" fontSize="14">{tr(pvSystems[project.system], lang)} · {n(result.installedKWp, 2)} kWp · {n(v.inverterKW)} kW CA</text>
        <text x="1070" y="31" textAnchor="end" fontSize="12" fill="#657b86">
          {t('UNIFILAR PRELIMINAR', 'PRELIMINARY SINGLE-LINE', 'UNIFILAR PRELIMINAR')}
        </text>
        <g stroke="#263d4b" strokeWidth="2.4" fill="none">
          <path d="M210 165H242 M422 165H483 M673 165H747 M777 165H905"/>
          {grid && <path d="M980 226V276"/>}
          {grid && <path d="M980 252H827V276"/>}
          {storage && <path d="M435 382H496 M526 382H577V226"/>}
          {hybrid && <path d="M673 204H704V410H748 M778 410H905"/>}
        </g>
        {box(28, 105, 182, 121, t('ARRANJO FV', 'PV ARRAY', 'GENERADOR FV'), [
          result.modules + ' × ' + n(v.moduleW, 0) + ' W',
          result.strings + ' strings × ' + result.ns + ' ' + t('módulos', 'modules', 'módulos'),
          'Voc ' + n(result.stringVoc) + ' V (' + t('frio', 'cold', 'frío') + ')'
        ])}
        {box(242, 105, 180, 121, t('PROTEÇÃO CC', 'DC PROTECTION', 'PROTECCIÓN CC'), [
          'gPV ' + (result.fuseA ? n(result.fuseA, 0) + ' A' : '—') + (result.fuseNeeded ? '' : ' *'),
          t('Seccionamento por MPPT', 'Isolation per MPPT', 'Seccionamiento por MPPT'),
          'DPS · Ucpv > ' + n(result.stringVoc, 0) + ' V'
        ], '#e8edf2')}
        {box(483, 105, 190, 121, t('INVERSOR', 'INVERTER', 'INVERSOR'), [
          n(v.inverterKW) + ' kW · ' + n(v.acV, 0) + ' V CA',
          v.mppts + ' MPPT · CC → CA',
          storage ? 'BAT ' + n(v.batteryV) + ' V' + (hybrid ? ' · GRID / EPS' : '') : 'GRID'
        ])}
        {breaker(762, 165, 'QF1 · ' + (result.acBreakerA ?? '—') + ' A')}
        <text x="820" y="139" textAnchor="middle" fontSize="12">DPS CA **</text>
        <text x="825" y="216" textAnchor="middle" fontSize="12">
          {n(v.acSection, 1)} mm² · {n(v.acV, 0)} V
        </text>
        {box(905, 105, 165, 121, grid ? 'QDG' : t('QUADRO CA', 'AC PANEL', 'CUADRO CA'), [
          grid ? t('Barramento CA', 'AC bus', 'Barra CA') : t('Cargas autônomas', 'Stand-alone loads', 'Cargas autónomas'),
          v.phases === 3 ? t('Trifásico', 'Three-phase', 'Trifásico') : t('Circuito de 2 fios', 'Two-wire circuit', 'Circuito de 2 hilos'),
          n(v.acV, 0) + ' V'
        ], '#e8edf2')}
        {grid && <>
          {box(905, 276, 165, 86, t('REDE E MEDIÇÃO', 'GRID AND METER', 'RED Y MEDICIÓN'), [
            t('Padrão da distribuidora', 'Utility service point', 'Acometida distribuidora'),
            t('Proteções a coordenar', 'Coordinate protection', 'Coordinar protecciones')
          ], '#e8edf2')}
          {box(734, 276, 160, 86, t('CARGAS GERAIS', 'GENERAL LOADS', 'CARGAS GENERALES'), [
            t('Circuitos da unidade', 'Installation circuits', 'Circuitos de la unidad')
          ], '#f5f7f9')}
        </>}
        {storage && <>
          {box(265, 337, 170, 90, t('BANCO DE BATERIAS', 'BATTERY BANK', 'BANCO DE BATERÍAS'), [
            result.batterySeries + 'S × ' + result.batteryParallel + 'P · ' + n(v.batteryV) + ' V',
            n(result.batteryKwh, 2) + ' kWh · BMS'
          ])}
          {breaker(511, 382, 'QBAT · ' + (result.batteryFuseA ?? '—') + ' A')}
          <text x="455" y="317" textAnchor="middle" fontSize="12">
            {t('Proteção CC + seccionamento', 'DC protection + isolation', 'Protección CC + seccionamiento')}
          </text>
        </>}
        {hybrid && <>
          {breaker(763, 410, 'QEPS **')}
          {box(905, 379, 165, 86, t('QUADRO EPS', 'EPS PANEL', 'CUADRO EPS'), [
            t('Cargas críticas isoladas', 'Isolated critical loads', 'Cargas críticas aisladas'),
            n(result.peakKW, 2) + ' kW'
          ])}
          <text x="708" y="352" fontSize="12">EPS</text>
        </>}
        <text x="230" y="248" textAnchor="middle" fontSize="12">
          CC · {n(v.dcSection, 1)} mm² · {n(v.dcLength, 0)} m/{t('ida', 'one way', 'ida')}
        </text>
        <g stroke="#2c825a" strokeWidth="1.6" strokeDasharray="7 5" fill="none">
          <path d="M119 226V493H1062 M332 226V307H242V493 M650 226V493 M980 465V493"/>
          {!hybrid && <path d="M980 226V493"/>}
          {storage && <path d="M350 427V493"/>}
        </g>
        <g stroke="#2c825a" strokeWidth="2" fill="none">
          <path d="M1062 493V508 M1045 508H1079 M1050 514H1074 M1056 520H1068"/>
        </g>
        <text x="28" y="536" fontSize="12">
          PE · {t('Equipotencialização de massas, estruturas e DPS. Definir esquema de aterramento no projeto.',
            'Bond equipment frames, structures and SPDs. Define the earthing arrangement in the design.',
            'Equipotencializar masas, estructuras y DPS. Definir puesta a tierra en el proyecto.')}
        </text>
        <text x="28" y="557" fontSize="11" fill="#617480">
          {t('* Verificar exigência de gPV por corrente reversa. ** Definir DPS e proteção EPS conforme fabricante, rede e instalação.',
            '* Verify gPV requirement against reverse current. ** Define SPDs and EPS protection for the equipment, grid and installation.',
            '* Verificar gPV según corriente inversa. ** Definir DPS y protección EPS según fabricante, red e instalación.')}
        </text>
      </g>
    </svg>
  );
}
