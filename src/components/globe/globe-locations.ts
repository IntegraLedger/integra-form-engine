/**
 * Globe locations and arc connections — purely decorative data.
 */

export interface GlobeLocation {
  name: string;
  lat: number;
  lng: number;
}

/** Representative cities spread across major continents */
export const LOCATIONS: GlobeLocation[] = [
  { name: 'New York', lat: 40.71, lng: -74.01 },
  { name: 'London', lat: 51.51, lng: -0.13 },
  { name: 'Tokyo', lat: 35.68, lng: 139.69 },
  { name: 'Singapore', lat: 1.35, lng: 103.82 },
  { name: 'São Paulo', lat: -23.55, lng: -46.63 },
  { name: 'Dubai', lat: 25.2, lng: 55.27 },
  { name: 'Sydney', lat: -33.87, lng: 151.21 },
  { name: 'Lagos', lat: 6.52, lng: 3.38 },
  { name: 'Mumbai', lat: 19.08, lng: 72.88 },
  { name: 'San Francisco', lat: 37.77, lng: -122.42 },
  { name: 'Berlin', lat: 52.52, lng: 13.41 },
  { name: 'Seoul', lat: 37.57, lng: 126.98 },
  { name: 'Toronto', lat: 43.65, lng: -79.38 },
  { name: 'Nairobi', lat: -1.29, lng: 36.82 },
  { name: 'Buenos Aires', lat: -34.6, lng: -58.38 },
];

/** Index pairs into LOCATIONS for arc connections (10 arcs) */
export const ARC_PAIRS: [number, number][] = [
  [0, 1],   // New York → London
  [1, 2],   // London → Tokyo
  [2, 3],   // Tokyo → Singapore
  [3, 8],   // Singapore → Mumbai
  [8, 5],   // Mumbai → Dubai
  [5, 7],   // Dubai → Lagos
  [7, 13],  // Lagos → Nairobi
  [0, 9],   // New York → San Francisco
  [9, 2],   // San Francisco → Tokyo
  [4, 14],  // São Paulo → Buenos Aires
];
