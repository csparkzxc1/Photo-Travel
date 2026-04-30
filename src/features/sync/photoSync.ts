import { useAppStore } from '@data/store';
import { ensureMediaPermission, fetchGpsAssets, PermissionState } from './mediaLibrary';

export interface SyncResult {
  permission: PermissionState;
  matched: number;
  withGps: number;
  total: number;
}

/**
 * Orchestrates a full sync: permission → fetch → process → store update.
 *
 * The store transitions through `requesting → syncing → success | error` so
 * any UI subscriber can render the right state. Errors are captured and
 * surfaced via `syncStatus.error` rather than thrown, so callers can simply
 * await the promise without a try/catch in render code.
 */
export async function syncFromGallery(): Promise<SyncResult> {
  const { setSyncStatus, ingestAssets } = useAppStore.getState();

  setSyncStatus({ kind: 'requesting' });
  const permission = await ensureMediaPermission();
  if (permission === 'denied' || permission === 'undetermined') {
    setSyncStatus({
      kind: 'error',
      message:
        permission === 'denied'
          ? '갤러리 접근 권한이 거부되었어요. 설정에서 허용해주세요.'
          : '갤러리 접근 권한이 필요해요.',
    });
    return { permission, matched: 0, withGps: 0, total: 0 };
  }

  setSyncStatus({ kind: 'syncing', loaded: 0, total: null });

  try {
    const assets = await fetchGpsAssets({
      maxPages: 10,
      pageSize: 200,
      onProgress: (loaded, total) =>
        setSyncStatus({ kind: 'syncing', loaded, total }),
    });
    ingestAssets(assets);
    const status = useAppStore.getState().syncStatus;
    if (status.kind === 'success') {
      return {
        permission,
        matched: status.matched,
        withGps: status.withGps,
        total: status.total,
      };
    }
    return { permission, matched: 0, withGps: 0, total: assets.length };
  } catch (err) {
    setSyncStatus({
      kind: 'error',
      message: err instanceof Error ? err.message : '동기화 중 오류가 발생했어요.',
    });
    return { permission, matched: 0, withGps: 0, total: 0 };
  }
}
