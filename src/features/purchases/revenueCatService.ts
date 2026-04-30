import {
  Entitlements,
  EntitlementId,
  NO_ENTITLEMENTS,
  ProductOffering,
  PurchasesService,
} from './types';

/**
 * RevenueCat-backed implementation. Lazy-required so the module gracefully
 * no-ops when react-native-purchases isn't linked (Expo Go, missing native
 * binding) — getActive() is the swap point in `index.ts`.
 *
 * Configuration: set EXPO_PUBLIC_REVENUECAT_IOS_KEY and
 * EXPO_PUBLIC_REVENUECAT_ANDROID_KEY in your .env (and in EAS build env
 * for production builds). Without keys this implementation refuses to
 * configure and the stub takes over.
 */
export class RevenueCatService implements PurchasesService {
  private readonly Purchases: typeof import('react-native-purchases').default;

  constructor(Purchases: typeof import('react-native-purchases').default) {
    this.Purchases = Purchases;
  }

  static tryCreate(): RevenueCatService | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const mod = require('react-native-purchases');
      return new RevenueCatService(mod.default ?? mod);
    } catch {
      return null;
    }
  }

  async configure(userId: string) {
    const Platform = require('react-native').Platform as { OS: string };
    const apiKey =
      Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
    if (!apiKey) {
      throw new Error('RevenueCat API key not set');
    }
    await this.Purchases.configure({ apiKey, appUserID: userId });
  }

  async getOfferings(): Promise<ProductOffering[]> {
    const offerings = await this.Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];
    return current.availablePackages.map((pkg) => ({
      id: pkg.product.identifier,
      title: pkg.product.title,
      description: pkg.product.description,
      priceString: pkg.product.priceString,
      grants: this.grantsForProduct(pkg.product.identifier),
    }));
  }

  async getEntitlements(): Promise<Entitlements> {
    const info = await this.Purchases.getCustomerInfo();
    return entitlementsFromInfo(info);
  }

  async purchase(productId: string): Promise<Entitlements> {
    const offerings = await this.Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p) => p.product.identifier === productId
    );
    if (!pkg) throw new Error(`Unknown product: ${productId}`);
    const result = await this.Purchases.purchasePackage(pkg);
    return entitlementsFromInfo(result.customerInfo);
  }

  async restore(): Promise<Entitlements> {
    const info = await this.Purchases.restorePurchases();
    return entitlementsFromInfo(info);
  }

  private grantsForProduct(productId: string): EntitlementId[] {
    if (productId.includes('premium')) return ['ad_free', 'premium'];
    if (productId.includes('adfree') || productId.includes('ad_free')) return ['ad_free'];
    return [];
  }
}

function entitlementsFromInfo(info: unknown): Entitlements {
  // The real Customer Info shape exposes `entitlements.active[id]`.
  // We avoid importing the type directly so the file stays compilable
  // when react-native-purchases isn't installed.
  const active = (info as { entitlements?: { active?: Record<string, unknown> } })?.entitlements
    ?.active;
  if (!active) return { ...NO_ENTITLEMENTS };
  return {
    adFree: 'ad_free' in active || 'premium' in active,
    premium: 'premium' in active,
  };
}
