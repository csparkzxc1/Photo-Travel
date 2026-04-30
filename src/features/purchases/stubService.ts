import {
  Entitlements,
  NO_ENTITLEMENTS,
  ProductOffering,
  PurchasesService,
} from './types';

const STUB_OFFERINGS: ProductOffering[] = [
  {
    id: 'phototravel.adfree.monthly',
    title: '광고 제거',
    description: '월 ₩2,900 · 모든 광고 제거',
    priceString: '₩2,900 / 월',
    grants: ['ad_free'],
  },
  {
    id: 'phototravel.premium.monthly',
    title: '프리미엄',
    description: '월 ₩4,900 · 4K 콜라주, 영상 슬라이드쇼, AI 추천',
    priceString: '₩4,900 / 월',
    grants: ['ad_free', 'premium'],
  },
  {
    id: 'phototravel.premium.yearly',
    title: '프리미엄 (연간)',
    description: '연 ₩39,000 · 33% 절약',
    priceString: '₩39,000 / 년',
    grants: ['ad_free', 'premium'],
  },
];

/**
 * In-process implementation used in dev builds, Expo Go, and tests.
 *
 * Mirrors the RevenueCat shape: `purchase()` flips local entitlement state
 * to "granted" so the rest of the UI behaves identically to production.
 * No real billing, no network — fast and deterministic for unit tests.
 */
export class StubPurchasesService implements PurchasesService {
  private state: Entitlements = { ...NO_ENTITLEMENTS };

  async configure(_userId: string) {
    // no-op
  }

  async getOfferings() {
    return STUB_OFFERINGS;
  }

  async getEntitlements() {
    return { ...this.state };
  }

  async purchase(productId: string) {
    const offering = STUB_OFFERINGS.find((o) => o.id === productId);
    if (!offering) {
      throw new Error(`Unknown product: ${productId}`);
    }
    for (const grant of offering.grants) {
      if (grant === 'ad_free') this.state.adFree = true;
      if (grant === 'premium') {
        this.state.premium = true;
        this.state.adFree = true;
      }
    }
    return { ...this.state };
  }

  async restore() {
    return { ...this.state };
  }

  /** Test helper — direct access not on the interface. */
  __setEntitlements(next: Entitlements) {
    this.state = { ...next };
  }
}
