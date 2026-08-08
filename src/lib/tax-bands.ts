export interface TaxBand {
  upTo: number | null;
  rate: number;
}

export function bandLabel(band: TaxBand, lowerBound: number): string {
  if (band.upTo === null) return `Above ${lowerBound.toLocaleString()}`;
  const lower = lowerBound + 0.01;
  return `${lower.toLocaleString(undefined, { minimumFractionDigits: 2 })} - ${band.upTo.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export interface TaxBandBucket {
  label: string;
  rate: number;
  taxableAmount: number;
  employeeCount: number;
  taxAmount: number;
}

/** Buckets each employee into the band their taxable salary falls under, for a WHT bracket summary. */
export function bucketByTaxBand(bands: TaxBand[], items: { taxableSalary: number; incomeTax: number }[]): TaxBandBucket[] {
  const buckets: TaxBandBucket[] = [];
  let lowerBound = 0;
  for (const band of bands) {
    buckets.push({ label: bandLabel(band, lowerBound), rate: band.rate, taxableAmount: 0, employeeCount: 0, taxAmount: 0 });
    lowerBound = band.upTo ?? lowerBound;
  }

  for (const item of items) {
    let idx = bands.findIndex((b) => b.upTo === null || item.taxableSalary <= b.upTo);
    if (idx === -1) idx = bands.length - 1;
    const bucket = buckets[idx];
    if (!bucket) continue;
    bucket.taxableAmount += item.taxableSalary;
    bucket.employeeCount += 1;
    bucket.taxAmount += item.incomeTax;
  }

  return buckets;
}
