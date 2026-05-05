// Countries that drive on the LEFT side of the road (ISO2 codes).
// All other countries drive on the RIGHT.
const LEFT_HAND_TRAFFIC = new Set([
  'AG', // Antigua and Barbuda
  'AU', // Australia
  'BB', // Barbados
  'BD', // Bangladesh
  'BN', // Brunei
  'BS', // Bahamas
  'BT', // Bhutan
  'BW', // Botswana
  'CY', // Cyprus
  'DM', // Dominica
  'FJ', // Fiji
  'GB', // United Kingdom
  'GD', // Grenada
  'GY', // Guyana
  'ID', // Indonesia
  'IE', // Ireland
  'IN', // India
  'JM', // Jamaica
  'JP', // Japan
  'KE', // Kenya
  'KI', // Kiribati
  'KN', // Saint Kitts and Nevis
  'LC', // Saint Lucia
  'LK', // Sri Lanka
  'LS', // Lesotho
  'MT', // Malta
  'MU', // Mauritius
  'MV', // Maldives
  'MW', // Malawi
  'MY', // Malaysia
  'MZ', // Mozambique
  'NA', // Namibia
  'NP', // Nepal
  'NR', // Nauru
  'NZ', // New Zealand
  'NG', // Nigeria
  'PG', // Papua New Guinea
  'PK', // Pakistan
  'PW', // Palau
  'RW', // Rwanda
  'SB', // Solomon Islands
  'SC', // Seychelles
  'SG', // Singapore
  'SL', // Sierra Leone
  'SR', // Suriname
  'SS', // South Sudan
  'SZ', // Eswatini
  'TH', // Thailand
  'TL', // Timor-Leste
  'TO', // Tonga
  'TT', // Trinidad and Tobago
  'TV', // Tuvalu
  'TZ', // Tanzania
  'UG', // Uganda
  'VC', // Saint Vincent and the Grenadines
  'VU', // Vanuatu
  'WS', // Samoa
  'ZA', // South Africa
  'ZM', // Zambia
  'ZW', // Zimbabwe
]);

export type DrivingSide = 'Left' | 'Right';

export function getDrivingSide(iso2: string): DrivingSide {
  return LEFT_HAND_TRAFFIC.has(iso2.toUpperCase()) ? 'Left' : 'Right';
}
