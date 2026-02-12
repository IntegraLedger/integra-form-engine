/**
 * Continent coastline data from Natural Earth (110m resolution)
 * via world-atlas + topojson-client.
 *
 * Exports pre-decoded coordinate rings as [lat, lng][] arrays.
 */

import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { GeoJsonProperties, Geometry, Feature } from 'geojson';
import landTopo from 'world-atlas/land-110m.json';

// Decode TopoJSON → GeoJSON
const landGeo = feature(
  landTopo as unknown as Topology,
  (landTopo as unknown as Topology<{ land: GeometryCollection }>).objects.land,
);

/**
 * All coastline coordinate rings as [lat, lng][] arrays.
 * GeoJSON stores coords as [lng, lat] — we swap to [lat, lng]
 * to match our latLngToXYZ() convention.
 */
export const COASTLINES: [number, number][][] = [];

function extractFromGeometry(geom: Geometry): void {
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) {
      COASTLINES.push(ring.map(([lng, lat]) => [lat, lng]));
    }
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      for (const ring of poly) {
        COASTLINES.push(ring.map(([lng, lat]) => [lat, lng]));
      }
    }
  }
}

// Handle both Feature and FeatureCollection returns
const features: Feature<Geometry, GeoJsonProperties>[] =
  'features' in landGeo ? landGeo.features : [landGeo];

for (const feat of features) {
  extractFromGeometry(feat.geometry);
}
