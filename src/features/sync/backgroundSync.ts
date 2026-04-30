import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { useAppStore } from '@data/store';
import { ensureMediaPermission, fetchGpsAssets } from './mediaLibrary';

export const BACKGROUND_SYNC_TASK = 'phototravel.background-sync';

const MIN_INTERVAL_SEC = 6 * 60 * 60; // 6 hours

/**
 * Defines the background fetch task at module-load time. Expo requires this
 * to be registered at the JS root (App.tsx imports this file once), and the
 * task body has to be tolerant of cold starts — the JS context may have just
 * spun up with a freshly hydrated zustand store.
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const state = useAppStore.getState();
    if (!state.backgroundSyncEnabled || !state.onboarded) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const permission = await ensureMediaPermission();
    if (permission !== 'granted' && permission !== 'limited') {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const watermark = state.lastSyncedAtMs ?? 0;
    const assets = await fetchGpsAssets({
      maxPages: 3,
      pageSize: 100,
      createdAfter: watermark,
    });

    const { added } = useAppStore.getState().ingestDelta(assets);
    return added > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    if (__DEV__) console.warn('[backgroundSync] task failed', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<boolean> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
        status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      return false;
    }
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: MIN_INTERVAL_SEC,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    useAppStore.getState().setBackgroundSyncEnabled(true);
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[backgroundSync] register failed', err);
    return false;
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    }
  } finally {
    useAppStore.getState().setBackgroundSyncEnabled(false);
  }
}
