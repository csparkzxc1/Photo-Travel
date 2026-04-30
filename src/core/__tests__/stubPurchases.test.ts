import { StubPurchasesService } from '../../features/purchases/stubService';
import { NO_ENTITLEMENTS } from '../../features/purchases/types';

describe('StubPurchasesService', () => {
  it('starts with no entitlements', async () => {
    const svc = new StubPurchasesService();
    expect(await svc.getEntitlements()).toEqual(NO_ENTITLEMENTS);
  });

  it('exposes the three default offerings', async () => {
    const svc = new StubPurchasesService();
    const offerings = await svc.getOfferings();
    expect(offerings.map((o) => o.id).sort()).toEqual([
      'phototravel.adfree.monthly',
      'phototravel.premium.monthly',
      'phototravel.premium.yearly',
    ]);
  });

  it('grants ad_free when buying the ad-free product', async () => {
    const svc = new StubPurchasesService();
    const after = await svc.purchase('phototravel.adfree.monthly');
    expect(after).toEqual({ adFree: true, premium: false });
  });

  it('grants both ad_free and premium when buying premium', async () => {
    const svc = new StubPurchasesService();
    const after = await svc.purchase('phototravel.premium.monthly');
    expect(after).toEqual({ adFree: true, premium: true });
  });

  it('throws on unknown product id', async () => {
    const svc = new StubPurchasesService();
    await expect(svc.purchase('phototravel.unknown')).rejects.toThrow(/Unknown product/);
  });

  it('restore returns current state without granting anything new', async () => {
    const svc = new StubPurchasesService();
    expect(await svc.restore()).toEqual(NO_ENTITLEMENTS);
    await svc.purchase('phototravel.adfree.monthly');
    expect(await svc.restore()).toEqual({ adFree: true, premium: false });
  });

  it('purchasing premium after ad_free upgrades both flags', async () => {
    const svc = new StubPurchasesService();
    await svc.purchase('phototravel.adfree.monthly');
    const after = await svc.purchase('phototravel.premium.yearly');
    expect(after).toEqual({ adFree: true, premium: true });
  });
});
