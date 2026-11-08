export const solarMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;
const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const midDays = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];
const radians = Math.PI / 180;
export interface SolarClimate {
  latitude: number;
  longitude: number;
  ghi: number[];
  diffuse: number[];
  period: string;
  retrievedAt: string;
  url: string;
}
export interface GeoPlace {name: string;latitude: number;longitude: number;state: string}

export function validSolarClimate(value: unknown): value is SolarClimate {
  const s = value as SolarClimate;
  return !!s && Number.isFinite(s.latitude) && Math.abs(s.latitude) <= 90 &&
    Number.isFinite(s.longitude) && Math.abs(s.longitude) <= 180 &&
    Array.isArray(s.ghi) && s.ghi.length === 12 && s.ghi.every(v => Number.isFinite(v) && v > 0 && v < 15) &&
    Array.isArray(s.diffuse) && s.diffuse.length === 12 && s.diffuse.every((v, i) => Number.isFinite(v) && v >= 0 && v <= s.ghi[i]) &&
    typeof s.period === 'string' && s.period.length < 300 &&
    typeof s.url === 'string' && s.url.startsWith('https://power.larc.nasa.gov/api/temporal/climatology/point?') &&
    typeof s.retrievedAt === 'string' && Number.isFinite(Date.parse(s.retrievedAt));
}

export function parsePowerClimate(raw: unknown, latitude: number, longitude: number, url: string): SolarClimate {
  const body = raw as {
    properties?: {parameter?: Record<string, Record<string, number>>};
    parameters?: Record<string, {units?: string}>;
    header?: {range?: string};
  };
  function parameter(id: string) {
    const values = body.properties?.parameter?.[id];
    const units = body.parameters?.[id]?.units?.toLowerCase().replace(/\s/g, '');
    const factor = units === 'kw-hr/m^2/day' || units === 'kwh/m^2/day' ? 1
      : units === 'mj/m^2/day' ? 1 / 3.6 : 0;
    if (!values || !factor) throw new Error('SOLAR_UNITS');
    return solarMonths.map(month => values[month] * factor);
  }
  const climate = {
    latitude, longitude,
    ghi: parameter('ALLSKY_SFC_SW_DWN'), diffuse: parameter('ALLSKY_SFC_SW_DIFF'),
    period: body.header?.range ?? 'Climatologia NASA POWER',
    retrievedAt: new Date().toISOString(), url
  };
  if (!validSolarClimate(climate)) throw new Error('SOLAR_DATA');
  return climate;
}

export async function fetchSolarClimate(latitude: number, longitude: number, signal?: AbortSignal) {
  const url = new URL('https://power.larc.nasa.gov/api/temporal/climatology/point');
  url.search = new URLSearchParams({
    parameters: 'ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DIFF', community: 'RE',
    latitude: String(latitude), longitude: String(longitude), format: 'JSON'
  }).toString();
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error('SOLAR_HTTP_' + response.status);
  return parsePowerClimate(await response.json(), latitude, longitude, url.href);
}

export function annualMean(values: number[]) {
  return values.reduce((total, value, month) => total + value * monthDays[month], 0) / 365;
}

// Monthly representative-day beam ratio, isotropic diffuse sky and ground reflection.
// Azimuth is clockwise from geographic north. There is no horizon or shading model.
export function tiltedIrradiation(climate: SolarClimate, tilt: number, azimuth: number, albedo = .2) {
  const latitude = climate.latitude * radians;
  const beta = tilt * radians;
  const bearing = azimuth * radians;
  const normal = [Math.sin(beta) * Math.sin(bearing), Math.sin(beta) * Math.cos(bearing), Math.cos(beta)];
  return climate.ghi.map((ghi, month) => {
    const declination = 23.45 * radians * Math.sin(tau * (284 + midDays[month]) / 365);
    let horizontal = 0;
    let incident = 0;
    for (let sample = 0; sample < 288; sample++) {
      const hourAngle = ((sample + .5) / 288 * 360 - 180) * radians;
      const east = -Math.cos(declination) * Math.sin(hourAngle);
      const north = Math.cos(latitude) * Math.sin(declination) -
        Math.sin(latitude) * Math.cos(declination) * Math.cos(hourAngle);
      const up = Math.sin(latitude) * Math.sin(declination) +
        Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
      if (up <= 0) continue;
      horizontal += up;
      incident += Math.max(0, east * normal[0] + north * normal[1] + up * normal[2]);
    }
    const diffuse = climate.diffuse[month];
    const beamRatio = horizontal > 0 ? incident / horizontal : 0;
    return (ghi - diffuse) * beamRatio + diffuse * (1 + Math.cos(beta)) / 2 +
      albedo * ghi * (1 - Math.cos(beta)) / 2;
  });
}
const tau = 2 * Math.PI;

export function bestAnnualTilt(climate: SolarClimate, azimuth: number) {
  let tilt = 0;
  let best = -Infinity;
  for (let candidate = 0; candidate <= 60; candidate++) {
    const value = annualMean(tiltedIrradiation(climate, candidate, azimuth));
    if (value > best) {best = value;tilt = candidate;}
  }
  return tilt;
}

export async function lookupCity(city: string, state: string, signal?: AbortSignal): Promise<GeoPlace[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({name: city + ', ' + state, countryCode: 'BR', count: '6', language: 'pt', format: 'json'}).toString();
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error('GEO_HTTP_' + response.status);
  const body = await response.json() as {results?: {name: string;admin1?: string;latitude: number;longitude: number;country_code: string}[]};
  return (body.results ?? []).filter(p => p.country_code === 'BR' && Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map(p => ({name: p.name, state: p.admin1 ?? state, latitude: p.latitude, longitude: p.longitude}));
}

export async function lookupCEP(cep: string, signal?: AbortSignal) {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) throw new Error('CEP_INVALID');
  const response = await fetch('https://brasilapi.com.br/api/cep/v2/' + digits, {signal});
  if (!response.ok) throw new Error('CEP_HTTP_' + response.status);
  const raw = await response.json() as {
    city?: string;state?: string;street?: string;neighborhood?: string;
    location?: {coordinates?: {latitude?: string;longitude?: string}};
  };
  if (!raw.city || !raw.state) throw new Error('CEP_DATA');
  const lat = raw.location?.coordinates?.latitude;
  const lon = raw.location?.coordinates?.longitude;
  return {
    city: raw.city, state: raw.state, street: raw.street ?? '', neighborhood: raw.neighborhood ?? '',
    latitude: lat !== undefined && lat !== '' && Number.isFinite(Number(lat)) ? Number(lat) : null,
    longitude: lon !== undefined && lon !== '' && Number.isFinite(Number(lon)) ? Number(lon) : null
  };
}
