import * as MediaLibrary from 'expo-media-library';
import { RawAsset } from '@core/photoProcessor';

export type PermissionState = 'granted' | 'limited' | 'denied' | 'undetermined';

export async function ensureMediaPermission(): Promise<PermissionState> {
  const current = await MediaLibrary.getPermissionsAsync();
  if (current.granted) return current.accessPrivileges === 'limited' ? 'limited' : 'granted';
  if (current.status === 'denied' && !current.canAskAgain) return 'denied';

  const requested = await MediaLibrary.requestPermissionsAsync();
  if (!requested.granted) return requested.canAskAgain ? 'undetermined' : 'denied';
  return requested.accessPrivileges === 'limited' ? 'limited' : 'granted';
}

export interface FetchOptions {
  /** Pages of assets to load (each page is `pageSize` photos). */
  maxPages?: number;
  pageSize?: number;
  /** Optional callback for incremental UI updates. */
  onProgress?: (loaded: number, total: number | null) => void;
}

/**
 * Fetches photos from the device's media library and resolves their EXIF GPS.
 *
 * Two-phase fetch is required: `getAssetsAsync` returns lightweight metadata
 * (id, uri, creationTime) cheaply, then `getAssetInfoAsync` resolves the full
 * EXIF location for each — which is the slow call. We batch by page so the
 * caller can render progress.
 */
export async function fetchGpsAssets(opts: FetchOptions = {}): Promise<RawAsset[]> {
  const { maxPages = 5, pageSize = 200, onProgress } = opts;

  const result: RawAsset[] = [];
  let after: string | undefined;
  let loaded = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const batch = await MediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      first: pageSize,
      after,
      sortBy: [['creationTime', false]],
    });

    const enriched = await Promise.all(
      batch.assets.map(async (a) => {
        try {
          const info = await MediaLibrary.getAssetInfoAsync(a, {
            shouldDownloadFromNetwork: false,
          });
          if (!info.location) return null;
          return {
            id: a.id,
            uri: info.localUri ?? a.uri,
            creationTime: a.creationTime,
            location: { latitude: info.location.latitude, longitude: info.location.longitude },
            accuracy: undefined,
          } as RawAsset;
        } catch {
          return null;
        }
      })
    );

    for (const asset of enriched) {
      if (asset) result.push(asset);
    }
    loaded += batch.assets.length;
    onProgress?.(loaded, batch.totalCount ?? null);

    if (!batch.hasNextPage || !batch.endCursor) break;
    after = batch.endCursor;
  }

  return result;
}
