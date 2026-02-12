export interface StateConfig {
  abbr: string;
  name: string;
  fipsPrefix: string;
}

export const STATE_CONFIGS: Record<string, StateConfig> = {
  AL: { abbr: 'AL', name: 'Alabama', fipsPrefix: '01' },
  AK: { abbr: 'AK', name: 'Alaska', fipsPrefix: '02' },
  AZ: { abbr: 'AZ', name: 'Arizona', fipsPrefix: '04' },
  AR: { abbr: 'AR', name: 'Arkansas', fipsPrefix: '05' },
  CA: { abbr: 'CA', name: 'California', fipsPrefix: '06' },
  CO: { abbr: 'CO', name: 'Colorado', fipsPrefix: '08' },
  CT: { abbr: 'CT', name: 'Connecticut', fipsPrefix: '09' },
  DE: { abbr: 'DE', name: 'Delaware', fipsPrefix: '10' },
  FL: { abbr: 'FL', name: 'Florida', fipsPrefix: '12' },
  GA: { abbr: 'GA', name: 'Georgia', fipsPrefix: '13' },
  HI: { abbr: 'HI', name: 'Hawaii', fipsPrefix: '15' },
  ID: { abbr: 'ID', name: 'Idaho', fipsPrefix: '16' },
  IL: { abbr: 'IL', name: 'Illinois', fipsPrefix: '17' },
  IN: { abbr: 'IN', name: 'Indiana', fipsPrefix: '18' },
  IA: { abbr: 'IA', name: 'Iowa', fipsPrefix: '19' },
  KS: { abbr: 'KS', name: 'Kansas', fipsPrefix: '20' },
  KY: { abbr: 'KY', name: 'Kentucky', fipsPrefix: '21' },
  LA: { abbr: 'LA', name: 'Louisiana', fipsPrefix: '22' },
  ME: { abbr: 'ME', name: 'Maine', fipsPrefix: '23' },
  MD: { abbr: 'MD', name: 'Maryland', fipsPrefix: '24' },
  MA: { abbr: 'MA', name: 'Massachusetts', fipsPrefix: '25' },
  MI: { abbr: 'MI', name: 'Michigan', fipsPrefix: '26' },
  MN: { abbr: 'MN', name: 'Minnesota', fipsPrefix: '27' },
  MS: { abbr: 'MS', name: 'Mississippi', fipsPrefix: '28' },
  MO: { abbr: 'MO', name: 'Missouri', fipsPrefix: '29' },
  MT: { abbr: 'MT', name: 'Montana', fipsPrefix: '30' },
  NE: { abbr: 'NE', name: 'Nebraska', fipsPrefix: '31' },
  NV: { abbr: 'NV', name: 'Nevada', fipsPrefix: '32' },
  NH: { abbr: 'NH', name: 'New Hampshire', fipsPrefix: '33' },
  NJ: { abbr: 'NJ', name: 'New Jersey', fipsPrefix: '34' },
  NM: { abbr: 'NM', name: 'New Mexico', fipsPrefix: '35' },
  NY: { abbr: 'NY', name: 'New York', fipsPrefix: '36' },
  NC: { abbr: 'NC', name: 'North Carolina', fipsPrefix: '37' },
  ND: { abbr: 'ND', name: 'North Dakota', fipsPrefix: '38' },
  OH: { abbr: 'OH', name: 'Ohio', fipsPrefix: '39' },
  OK: { abbr: 'OK', name: 'Oklahoma', fipsPrefix: '40' },
  OR: { abbr: 'OR', name: 'Oregon', fipsPrefix: '41' },
  PA: { abbr: 'PA', name: 'Pennsylvania', fipsPrefix: '42' },
  RI: { abbr: 'RI', name: 'Rhode Island', fipsPrefix: '44' },
  SC: { abbr: 'SC', name: 'South Carolina', fipsPrefix: '45' },
  SD: { abbr: 'SD', name: 'South Dakota', fipsPrefix: '46' },
  TN: { abbr: 'TN', name: 'Tennessee', fipsPrefix: '47' },
  TX: { abbr: 'TX', name: 'Texas', fipsPrefix: '48' },
  UT: { abbr: 'UT', name: 'Utah', fipsPrefix: '49' },
  VT: { abbr: 'VT', name: 'Vermont', fipsPrefix: '50' },
  VA: { abbr: 'VA', name: 'Virginia', fipsPrefix: '51' },
  WA: { abbr: 'WA', name: 'Washington', fipsPrefix: '53' },
  WV: { abbr: 'WV', name: 'West Virginia', fipsPrefix: '54' },
  WI: { abbr: 'WI', name: 'Wisconsin', fipsPrefix: '55' },
  WY: { abbr: 'WY', name: 'Wyoming', fipsPrefix: '56' },
  DC: { abbr: 'DC', name: 'District of Columbia', fipsPrefix: '11' },
};

export function getStateName(abbr: string): string {
  return STATE_CONFIGS[abbr]?.name ?? abbr;
}

export function getStateConfig(abbr: string): StateConfig | undefined {
  return STATE_CONFIGS[abbr];
}

export function getAllStates(): StateConfig[] {
  return Object.values(STATE_CONFIGS).sort((a, b) => a.name.localeCompare(b.name));
}
