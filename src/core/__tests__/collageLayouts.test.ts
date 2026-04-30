import { COLLAGE_TEMPLATES, composeCollage } from '../collageLayouts';
import { Photo } from '../types';

function photo(id: string, takenAt: string): Photo {
  return {
    id,
    userId: 'u',
    localUri: `mock://${id}`,
    takenAt,
    lat: 0,
    lng: 0,
    accuracy: 10,
  };
}

describe('COLLAGE_TEMPLATES', () => {
  it('has all four templates with valid slot rectangles', () => {
    const ids = Object.keys(COLLAGE_TEMPLATES);
    expect(ids.sort()).toEqual(['fourcut', 'magazine', 'ninegrid', 'polaroid']);
    for (const t of Object.values(COLLAGE_TEMPLATES)) {
      expect(t.slots.length).toBeGreaterThan(0);
      for (const s of t.slots) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.x + s.w).toBeLessThanOrEqual(1.001);
        expect(s.y + s.h).toBeLessThanOrEqual(1.001);
      }
    }
  });

  it('ninegrid has exactly nine slots', () => {
    expect(COLLAGE_TEMPLATES.ninegrid.slots).toHaveLength(9);
  });

  it('fourcut is taller than wide', () => {
    expect(COLLAGE_TEMPLATES.fourcut.aspectRatio).toBeLessThan(1);
  });
});

describe('composeCollage', () => {
  const photos = Array.from({ length: 12 }, (_, i) =>
    photo(`p${i}`, `2025-05-${String(1 + i).padStart(2, '0')}T10:00:00Z`)
  );

  it('produces one ComposedSlot per template slot', () => {
    const result = composeCollage('ninegrid', photos);
    expect(result.composed).toHaveLength(9);
    expect(result.composed.every((s) => s.photo !== null)).toBe(true);
  });

  it('leaves slots null when photos run out', () => {
    const result = composeCollage('ninegrid', photos.slice(0, 5));
    expect(result.composed.filter((s) => s.photo === null)).toHaveLength(4);
    expect(result.composed.filter((s) => s.photo !== null)).toHaveLength(5);
  });

  it('orders composed photos chronologically', () => {
    const result = composeCollage('fourcut', photos);
    const filledTimes = result.composed
      .filter((s) => s.photo)
      .map((s) => s.photo!.takenAt);
    const sorted = [...filledTimes].sort();
    expect(filledTimes).toEqual(sorted);
  });
});
