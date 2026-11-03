const moduleTerms = {
  biomass: 'energia biomassa biomass biomasa bioenergia bioenergy',
  solar: 'energia solar fotovoltaica fotovoltaico photovoltaic FV',
  wind: 'energia eólica eólico wind viento vento',
  hydro: 'energia hidrelétrica hidroelétrica hidráulica hidroeletricidade hydropower hydroelectric hidroeléctrica',
  tidal: 'energia maré marés maremotriz mareomotriz tidal mareas oceanos',
};

export const normalizeSearch = value => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** @param {import('./types').Reference} reference */
export function referenceSearchText(reference) {
  const scope = typeof reference.scope === 'string' ? reference.scope : Object.values(reference.scope).join(' ');
  return normalizeSearch([
    reference.by, reference.title, reference.url, scope, reference.keywords ?? '', reference.year ?? '',
    reference.modules.map(key => moduleTerms[key]).join(' '),
    reference.origin === 'BR' ? 'Brasil Brazil brasileira brasileiro brasileña' : 'internacional international internacional',
    reference.language === 'pt' ? 'português portuguese portugués' : 'inglês english inglés',
  ].join(' '));
}

/**
 * Match all words, regardless of order or accents, and combine both filters.
 * @param {import('./types').Reference[]} catalog
 * @param {{search?: string, module?: import('./types').SourceKey|'all', origin?: 'BR'|'INT'|'all'}} options
 */
export function filterReferences(catalog, {search = '', module = 'all', origin = 'all'} = {}) {
  const terms = normalizeSearch(search).split(' ').filter(Boolean);
  return catalog.filter(reference =>
    (module === 'all' || reference.modules.includes(module)) &&
    (origin === 'all' || reference.origin === origin) &&
    terms.every(term => referenceSearchText(reference).includes(term)));
}
