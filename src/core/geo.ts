import { Region } from './types';

export type Point = { lng: number; lat: number };

/**
 * Ray casting algorithm for point-in-polygon. Returns true if point is inside ring.
 * Ring is an array of [lng, lat] pairs (GeoJSON convention).
 */
export function pointInRing(point: Point, ring: number[][]): boolean {
  const { lng: x, lat: y } = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(point: Point, polygon: GeoJSON.Polygon): boolean {
  if (!polygon.coordinates.length) return false;
  const [outer, ...holes] = polygon.coordinates;
  if (!pointInRing(point, outer)) return false;
  for (const hole of holes) {
    if (pointInRing(point, hole)) return false;
  }
  return true;
}

export function pointInMultiPolygon(point: Point, mp: GeoJSON.MultiPolygon): boolean {
  for (const poly of mp.coordinates) {
    if (pointInPolygon(point, { type: 'Polygon', coordinates: poly })) return true;
  }
  return false;
}

export function pointInRegion(point: Point, region: Region): boolean {
  if (!withinBbox(point, region.bbox)) return false;
  return region.geometry.type === 'MultiPolygon'
    ? pointInMultiPolygon(point, region.geometry)
    : pointInPolygon(point, region.geometry);
}

export function withinBbox(point: Point, bbox: [number, number, number, number]): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return point.lng >= minLng && point.lng <= maxLng && point.lat >= minLat && point.lat <= maxLat;
}

const R_EARTH_KM = 6371;

export function haversineKm(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bboxCenter(bbox: [number, number, number, number]): Point {
  return { lng: (bbox[0] + bbox[2]) / 2, lat: (bbox[1] + bbox[3]) / 2 };
}
