import { Photo } from './types';
import { pickHighlights } from './highlights';

export type CollageTemplateId = 'fourcut' | 'ninegrid' | 'polaroid' | 'magazine';

export interface CollageSlot {
  /** Normalised rect coordinates (0–1). x,y is top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  caption?: 'date' | 'region' | 'none';
}

export interface CollageTemplate {
  id: CollageTemplateId;
  /** width / height. 0.5 = portrait stripe, 1 = square, 1.78 = landscape. */
  aspectRatio: number;
  background: string;
  slots: CollageSlot[];
  /** Foreground frame styling */
  borderColor?: string;
  borderWidth?: number;
}

const PHOTO_BOOTH_BG = '#1B2330';
const POLAROID_BG = '#F4ECE2';
const MAGAZINE_BG = '#FFFFFF';

/**
 * Korean-style 4-cut photo booth (인생네컷): four landscape photos stacked
 * vertically on a long portrait strip with a title slot below.
 */
const FOURCUT: CollageTemplate = {
  id: 'fourcut',
  aspectRatio: 0.4,
  background: PHOTO_BOOTH_BG,
  borderColor: '#FFFFFF',
  borderWidth: 6,
  slots: [
    { x: 0.06, y: 0.04, w: 0.88, h: 0.21 },
    { x: 0.06, y: 0.27, w: 0.88, h: 0.21 },
    { x: 0.06, y: 0.5, w: 0.88, h: 0.21 },
    { x: 0.06, y: 0.73, w: 0.88, h: 0.21, caption: 'date' },
  ],
};

const NINEGRID: CollageTemplate = {
  id: 'ninegrid',
  aspectRatio: 1,
  background: '#FFFFFF',
  borderColor: '#FFFFFF',
  borderWidth: 2,
  slots: Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const gap = 0.012;
    const cell = (1 - gap * 4) / 3;
    return {
      x: gap + col * (cell + gap),
      y: gap + row * (cell + gap),
      w: cell,
      h: cell,
    };
  }),
};

/**
 * Scattered polaroids — five photos at jaunty rotations layered so the
 * viewer's eye follows top-left → bottom-right.
 */
const POLAROID: CollageTemplate = {
  id: 'polaroid',
  aspectRatio: 1,
  background: POLAROID_BG,
  borderColor: '#FFFFFF',
  borderWidth: 4,
  slots: [
    { x: 0.05, y: 0.06, w: 0.42, h: 0.42, rotation: -7, caption: 'region' },
    { x: 0.5, y: 0.04, w: 0.4, h: 0.4, rotation: 5 },
    { x: 0.32, y: 0.32, w: 0.42, h: 0.42, rotation: 2, caption: 'date' },
    { x: 0.04, y: 0.52, w: 0.4, h: 0.4, rotation: 8 },
    { x: 0.5, y: 0.55, w: 0.45, h: 0.4, rotation: -3 },
  ],
};

/**
 * Magazine cover: one large hero photo + 3 supporting columns underneath.
 */
const MAGAZINE: CollageTemplate = {
  id: 'magazine',
  aspectRatio: 0.75,
  background: MAGAZINE_BG,
  slots: [
    { x: 0, y: 0, w: 1, h: 0.55, caption: 'region' },
    { x: 0, y: 0.57, w: 0.32, h: 0.4 },
    { x: 0.34, y: 0.57, w: 0.32, h: 0.4 },
    { x: 0.68, y: 0.57, w: 0.32, h: 0.4, caption: 'date' },
  ],
};

export const COLLAGE_TEMPLATES: Record<CollageTemplateId, CollageTemplate> = {
  fourcut: FOURCUT,
  ninegrid: NINEGRID,
  polaroid: POLAROID,
  magazine: MAGAZINE,
};

export interface ComposedSlot {
  slot: CollageSlot;
  photo: Photo | null;
}

export interface ComposedCollage {
  template: CollageTemplate;
  composed: ComposedSlot[];
}

/**
 * Picks the right number of highlights for the template and pairs them
 * with slots in time order. Returns null slots if there aren't enough
 * photos so the renderer can show empty frames rather than crashing.
 */
export function composeCollage(
  templateId: CollageTemplateId,
  photos: Photo[]
): ComposedCollage {
  const template = COLLAGE_TEMPLATES[templateId];
  const picks = pickHighlights(photos, { count: template.slots.length });
  const composed: ComposedSlot[] = template.slots.map((slot, i) => ({
    slot,
    photo: picks[i] ?? null,
  }));
  return { template, composed };
}
