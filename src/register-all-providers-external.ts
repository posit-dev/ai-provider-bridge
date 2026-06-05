/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2026 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Provider registration orchestrator (External Build Variant)
 *
 * Same API surface as register-all-providers.ts but only registers the Posit AI provider.
 * Consuming packages swap to this module at build time via bundler aliasing (through
 * providers-external.ts) so that non-positai provider code (and its heavy SDK dependencies)
 * is excluded from the output bundle entirely. The callback types are imported type-only so
 * no non-positai runtime code is pulled in.
 *
 * SYNC NOTE: The `ProviderRegistrationConfig` interface and `registerAllProviders` signature
 * must stay byte-for-byte identical with register-all-providers.ts.
 */

import type { BedrockProviderCallbacks } from "./providers/bedrock-provider";
import type { GoogleVertexProviderCallbacks } from "./providers/google-vertex-provider";
import { registerPositAiProvider } from "./providers/positai-provider";
import type { ProviderRegistry } from "./providers/ProviderRegistry";
import type { Logger, ProviderId } from "./types";

export interface ProviderRegistrationConfig {
	positAiBaseUrl: string;
	userAgent?: string;
	/** If set, only these providers register; otherwise all of them. */
	allowedProviders?: ProviderId[];
	/** Pre-built by the caller. The bridge must NOT construct these. */
	bedrockCallbacks?: BedrockProviderCallbacks;
	googleVertexCallbacks?: GoogleVertexProviderCallbacks;
}

/**
 * Register every provider with the given registry, honoring `config.allowedProviders`.
 *
 * External builds only ship the Posit AI provider; the callback fields are ignored.
 */
export function registerAllProviders(
	registry: ProviderRegistry,
	logger: Logger,
	config: ProviderRegistrationConfig,
): void {
	const allowed = config.allowedProviders ? new Set(config.allowedProviders) : null;
	const isAllowed = (id: ProviderId) => !allowed || allowed.has(id);

	if (isAllowed("positai")) {
		registerPositAiProvider(registry, config.positAiBaseUrl, config.userAgent, logger);
	}
}
