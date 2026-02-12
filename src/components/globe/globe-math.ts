/**
 * Globe math utilities — rotation, projection, and great-circle interpolation.
 */

const DEG = Math.PI / 180;

/** Tilt the globe 30° back toward the viewer (north pole tips toward camera). */
export const TILT = -30 * DEG;
const COS_TILT = Math.cos(TILT);
const SIN_TILT = Math.sin(TILT);

/** Convert latitude/longitude to [x, y, z] on a unit sphere. */
export function latLngToXYZ(lat: number, lng: number): [number, number, number] {
  const la = lat * DEG;
  const lo = lng * DEG;
  return [Math.cos(la) * Math.sin(lo), -Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

/** Rotate a point around the Y axis by `angle` radians. */
export function rotateY(
  x: number,
  y: number,
  z: number,
  angle: number,
): [number, number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c + z * s, y, -x * s + z * c];
}

/** Rotate a point around the X axis by `angle` radians. */
export function rotateX(
  x: number,
  y: number,
  z: number,
  angle: number,
): [number, number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x, y * c - z * s, y * s + z * c];
}

/** Spin around Y (geographic poles) then apply 23.4° visual axial tilt. */
export function tiltAndRotate(
  x: number,
  y: number,
  z: number,
  yAngle: number,
): [number, number, number] {
  // Spin around Y first so rotation axis = geographic poles
  const [rx, ry, rz] = rotateY(x, y, z, yAngle);
  // Then tilt around X for visual presentation
  return [rx, ry * COS_TILT - rz * SIN_TILT, ry * SIN_TILT + rz * COS_TILT];
}

/** Orthographic projection → screen coords + depth. */
export function project(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  radius: number,
): { sx: number; sy: number; z: number } {
  return { sx: cx + x * radius, sy: cy + y * radius, z };
}

/**
 * Generate points along a great-circle arc between two unit-sphere points
 * using spherical linear interpolation (slerp).
 * Returns `steps + 1` points as [x,y,z] tuples.
 */
export function greatCircleArc(
  a: [number, number, number],
  b: [number, number, number],
  steps: number,
): [number, number, number][] {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const omega = Math.acos(Math.min(1, Math.max(-1, dot)));
  const sinOmega = Math.sin(omega);

  if (sinOmega < 1e-6) return [a, b];

  const points: [number, number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const fA = Math.sin((1 - t) * omega) / sinOmega;
    const fB = Math.sin(t * omega) / sinOmega;
    points.push([
      fA * a[0] + fB * b[0],
      fA * a[1] + fB * b[1],
      fA * a[2] + fB * b[2],
    ]);
  }
  return points;
}
