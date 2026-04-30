export type ISODate = string;

export type Plan = 'free' | 'premium';

export interface UserSettings {
  syncMode: 'realtime' | 'daily' | 'manual';
  theme: 'system' | 'light' | 'dark';
  cloudBackup: boolean;
  adsRemoved: boolean;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  profileImage?: string;
  plan: Plan;
  totalVisits: number;
  joinedAt: ISODate;
  settings: UserSettings;
}

export interface Photo {
  id: string;
  userId: string;
  localUri: string;
  cloudUri?: string;
  takenAt: ISODate;
  lat: number;
  lng: number;
  accuracy: number;
  regionId?: string;
  tripId?: string;
  exifData?: Record<string, unknown>;
}

export type RegionLevel = 1 | 2 | 3;

export interface Region {
  id: string;
  countryCode: string;
  level: RegionLevel;
  name_ko: string;
  name_local: string;
  name_en: string;
  parentId?: string;
  population?: number;
  areaKm2?: number;
  bbox: [number, number, number, number];
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface Trip {
  id: string;
  userId: string;
  title: string;
  startDate: ISODate;
  endDate: ISODate;
  regionIds: string[];
  representativePhotoId?: string;
  photoCount: number;
  videoCount: number;
  collageTemplateUsed?: string;
  isSignificant: boolean;
}

export interface Visit {
  userId: string;
  regionId: string;
  firstVisitedAt: ISODate;
  lastVisitedAt: ISODate;
  totalPhotos: number;
  totalTrips: number;
}

export interface Country {
  code: string;
  name_ko: string;
  name_en: string;
  flagEmoji: string;
  totalRegions: number;
  supportedLevel: RegionLevel;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt?: ISODate;
}
