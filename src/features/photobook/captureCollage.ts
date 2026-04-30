import { Platform } from 'react-native';

interface CaptureOptions {
  format?: 'png' | 'jpg';
  quality?: number;
  width?: number;
}

/**
 * Wraps react-native-view-shot's `captureRef` so callers don't import RN
 * native modules directly. The wrapper is wrapped in try/catch + dynamic
 * require so the module gracefully no-ops in Expo Go (where the native
 * binding isn't available) — UI surfaces the error rather than crashing.
 */
export async function captureCollage(
  ref: unknown,
  opts: CaptureOptions = {}
): Promise<{ uri: string } | { error: string }> {
  if (!ref) return { error: '캡처할 영역이 준비되지 않았어요.' };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const { captureRef } = require('react-native-view-shot');
    const uri: string = await captureRef(ref, {
      format: opts.format ?? 'png',
      quality: opts.quality ?? 0.95,
      width: opts.width,
      result: 'tmpfile',
    });
    return { uri };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return {
      error:
        Platform.OS === 'web'
          ? '웹에서는 콜라주 저장이 지원되지 않아요.'
          : `콜라주 생성에 실패했어요: ${msg}`,
    };
  }
}

export async function shareUri(uri: string, mimeType = 'image/png'): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const Sharing = require('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Photo Travel 콜라주' });
    return true;
  } catch {
    return false;
  }
}
