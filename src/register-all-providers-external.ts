/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2026 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Provider registration orchestrator (External Build Variant)
 *
 * Same API surface as register-all-providers.ts but only registers the Posit AI provider.
 * Consuming packages swap to this module at build time via bundler aliasing (through
 * providers-external.ts) so that non-positai provider code (and its heavy SDK dependencies)
 * is excluded from the output bundle entirely.
 *
 * SYNC NOTE: The `registerAllProviders` signature must stay in sync with
 * register-all-providers.ts. The `ProviderRegistrationConfig` interface is re-exported from
 * there (type-only, erased at build) so the two variants share one interface definition and
 * no non-positai runtime code is pulled in.
 */

// Re-export the shared config interface and orchestrator signature from the full module
// (type-only, so it brings in zero non-positai runtime code). The matching `import type` gives
// local bindings for the signature below.
export type { ProviderRegistrationConfig, RegisterAllProviders } from "./register-all-providers";
import { isProviderAllowed } from "./provider-allow-list";
import { registerPositAiProvider } from "./providers/positai-provider";
import type { RegisterAllProviders } from "./register-all-providers";

/**
 * Register every provider with the given registry, honoring `config.allowedProviders`.
 *
 * External builds only ship the Posit AI provider; the callback fields are ignored.
 */
export const registerAllProviders: RegisterAllProviders = (registry, logger, config) => {
	if (isProviderAllowed("positai", config.allowedProviders)) {
		registerPositAiProvider(registry, config.positAiBaseUrl, config.userAgent, logger);
	}
};
