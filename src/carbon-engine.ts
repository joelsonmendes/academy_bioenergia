export const sbceThresholds = {report: 10000, reconcile: 25000};
export const maxCarbonActivity = 1_000_000_000;
export type EmissionsBand = 'under' | 'report' | 'reconcile';
export type CarbonCase = 'microgrid' | 'industry' | 'electricity';
export interface CarbonInput {activity: number | null; factor: number | null; reduction: number}

export const carbonDefaults: Record<CarbonCase, CarbonInput> = {
  microgrid: {activity: 8000, factor: 2.68, reduction: 30},
  industry: {activity: 300000, factor: 2.68, reduction: 18},
  electricity: {activity: 800, factor: .05, reduction: 20}
};

function validNumber(value: number | null, maximum: number): value is number {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= maximum;
}

// The statutory bands alone do not establish whether a source is regulated.
export function sbceBand(annualTonnes: number | null): EmissionsBand | null {
  if (!validNumber(annualTonnes, maxCarbonActivity)) return null;
  if (annualTonnes > sbceThresholds.reconcile) return 'reconcile';
  if (annualTonnes > sbceThresholds.report) return 'report';
  return 'under';
}

export function estimateCarbon(kind: CarbonCase, {activity, factor, reduction}: CarbonInput) {
  if (!validNumber(activity, maxCarbonActivity) || !validNumber(factor, 100) || !validNumber(reduction, 100)) return null;
  // Diesel factors are kg CO2/L. Purchased electricity factors are t CO2/MWh.
  const tonnesPerUnit = kind === 'electricity' ? factor : factor / 1000;
  const savedActivity = activity * reduction / 100;
  const remainingActivity = activity - savedActivity;
  return {
    baseline: activity * tonnesPerUnit,
    project: remainingActivity * tonnesPerUnit,
    avoided: savedActivity * tonnesPerUnit,
    savedActivity,
    remainingActivity
  };
}
