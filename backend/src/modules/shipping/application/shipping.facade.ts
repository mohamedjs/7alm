import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { isProviderName, type ShippingProvider, type ShippingProviderName } from "../domain/shipping";
import { absProvider, BostaProvider, mylerzProvider, TestProvider } from "../infrastructure/providers";

/** Factory + facade: the only way other modules reach a courier. */
@Injectable()
export class ShippingFacade {
  private readonly log = new Logger(ShippingFacade.name);
  private readonly providers: Map<ShippingProviderName, ShippingProvider>;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.providers = new Map<ShippingProviderName, ShippingProvider>([
      ["bosta", new BostaProvider(env)],
      ["abs", absProvider()],
      ["mylerz", mylerzProvider()],
      ["test", new TestProvider(env)],
    ]);
  }

  resolveName(name?: string | null): ShippingProviderName {
    return isProviderName(name) ? name : this.env.DEFAULT_SHIPPING_PROVIDER;
  }

  provider(name?: string | null): ShippingProvider {
    const resolved = this.resolveName(name);
    if (name && resolved !== name) this.log.warn(`unknown shipping provider "${name}", using ${resolved}`);
    return this.providers.get(resolved)!;
  }

  available(): ShippingProviderName[] {
    return [...this.providers.keys()];
  }
}
