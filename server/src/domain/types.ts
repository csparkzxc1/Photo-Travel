export interface UserRow {
  id: string;
  email: string;
  nickname: string;
  plan: 'free' | 'premium';
}

export interface PhotoUpload {
  id: string;
  takenAt: string; // ISO
  lat: number;
  lng: number;
  accuracyM?: number;
  cloudUri?: string;
}

export interface PhotoRow {
  id: string;
  userId: string;
  takenAt: string;
  lat: number;
  lng: number;
  accuracyM: number | null;
  regionId: string | null;
  cloudUri: string | null;
}

export interface RegionRow {
  id: string;
  countryCode: string;
  level: 1 | 2 | 3;
  parentId: string | null;
  nameKo: string;
  nameEn: string;
}

export interface VisitRow {
  userId: string;
  regionId: string;
  firstVisitedAt: string;
  lastVisitedAt: string;
  totalPhotos: number;
  totalTrips: number;
}

export interface TripRow {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  regionIds: string[];
  representativePhotoId: string | null;
  photoCount: number;
  videoCount: number;
  isSignificant: boolean;
}

export interface RankingRow {
  userId: string;
  nickname: string;
  visitedRegionCount: number;
}
