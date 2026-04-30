/**
 * App-level entitlements that gate features. Keep this list small —
 * fewer entitlements is easier to test and less risk of a bug locking
 * a paying customer out of something they bought.
 */
export type EntitlementId = 'ad_free' | 'premium';

export interface Entitlements {
  /** Hides banner / interstitial ads. Granted by ad_free OR premium. */
  adFree: boolean;
  /** 4K collage exports, video slideshows, AI titles, unlimited friends. */
  premium: boolean;
}

export interface ProductOffering {
  id: string;
  title: string;
  description: string;
  priceString: string; // pre-formatted by the store
  /** Which entitlement(s) buying this product grants. */
  grants: EntitlementId[];
}

export interface PurchasesService {
  configure(userId: string): Promise<void>;
  /** Returns the offerings to display on the paywall. */
  getOfferings(): Promise<ProductOffering[]>;
  getEntitlements(): Promise<Entitlements>;
  purchase(productId: string): Promise<Entitlements>;
  restore(): Promise<Entitlements>;
}

export const NO_ENTITLEMENTS: Entitlements = { adFree: false, premium: false };
