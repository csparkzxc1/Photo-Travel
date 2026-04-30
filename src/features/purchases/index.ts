import { RevenueCatService } from './revenueCatService';
import { StubPurchasesService } from './stubService';
import { PurchasesService } from './types';

export * from './types';
export { StubPurchasesService } from './stubService';

let active: PurchasesService | null = null;

/**
 * Swap point: the rest of the app calls getPurchases() and never knows
 * whether RevenueCat or the stub answered. The first call decides:
 * if RevenueCat's native module + an API key are available, use it;
 * otherwise fall back to the stub.
 */
export function getPurchases(): PurchasesService {
  if (active) return active;
  const hasKey =
    !!process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
    !!process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (hasKey) {
    const rc = RevenueCatService.tryCreate();
    if (rc) {
      active = rc;
      return rc;
    }
  }
  active = new StubPurchasesService();
  return active;
}

/** Test/dev hook to force a specific implementation. */
export function setPurchasesForTesting(svc: PurchasesService) {
  active = svc;
}

export function resetPurchasesForTesting() {
  active = null;
}
