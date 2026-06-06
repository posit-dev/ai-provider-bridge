/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2026 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Provider registration orchestrator (Internal Build Variant)
 *
 * Centralizes the "register every provider into a ProviderRegistry" loop that
 * downstream consumers would otherwise hand-roll. The caller owns the registry's
 * lifecycle and passes it in. External builds swap to
 * register-all-providers-external.ts via bundler aliasing (through providers-external.ts).
 *
 * SYNC NOTE: The `registerAllProviders` signature must stay in sync with
 * register-all-providers-external.ts. That variant re-exports the
 * `ProviderRegistrationConfig` interface defined here, so the interface lives in one place.
 */

import { registerAnthropicProvider } from "./providers/anthropic-provider";
import {
	registerBedrockProvider,
	type BedrockProviderCallbacks,
} from "./providers/bedrock-provider";
import { registerCopilotProvider } from "./providers/copilot-provider";
import { registerDeepSeekProvider } from "./providers/deepseek-provider";
import { registerFoundryProvider } from "./providers/foundry-provider";
import { registerGeminiProvider } from "./providers/gemini-provider";
import {
	registerGoogleVertexProvider,
	type GoogleVertexProviderCallbacks,
} from "./providers/google-vertex-provider";
import { registerLMStudioProvider } from "./providers/lmstudio-provider";
import { registerOllamaProvider } from "./providers/ollama-provider";
import { registerOpenAICompatibleProvider } from "./providers/openai-compatible-provider";
import { registerOpenAIProvider } from "./providers/openai-provider";
import { registerOpenRouterProvider } from "./providers/openrouter-provider";
import { registerPositAiProvider } from "./providers/positai-provider";
import type { ProviderRegistry } from "./providers/ProviderRegistry";
import { registerSnowflakeCortexProvider } from "./providers/snowflake-cortex-provider";
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
 * One provider's registration. Receives the caller's registry/logger plus the full config so
 * each entry pulls whatever it needs (base URL, callbacks) without the orchestrator
 * special-casing it.
 */
type ProviderRegistrar = (
	registry: ProviderRegistry,
	logger: Logger,
	config: ProviderRegistrationConfig,
) => void;

/**
 * Every provider's registration, paired with its ProviderId. Exported so a test can assert the
 * id set equals PROVIDER_IDS (the single source of truth): a mislabeled, duplicated, or missing
 * id here would silently corrupt `allowedProviders` filtering, which keys on these labels.
 */
export const PROVIDER_REGISTRARS: readonly [ProviderId, ProviderRegistrar][] = [
	[
		"positai",
		(registry, logger, config) =>
			registerPositAiProvider(registry, config.positAiBaseUrl, config.userAgent, logger),
	],
	["anthropic", (registry, logger) => registerAnthropicProvider(registry, logger)],
	["copilot", (registry, logger) => registerCopilotProvider(registry, logger)],
	["openai", (registry, logger) => registerOpenAIProvider(registry, logger)],
	["openrouter", (registry, logger) => registerOpenRouterProvider(registry, logger)],
	["ollama", (registry, logger) => registerOllamaProvider(registry, logger)],
	["lmstudio", (registry, logger) => registerLMStudioProvider(registry, logger)],
	[
		"bedrock",
		(registry, logger, config) =>
			registerBedrockProvider(registry, logger, config.bedrockCallbacks),
	],
	["gemini", (registry, logger) => registerGeminiProvider(registry, logger)],
	[
		"google-vertex",
		(registry, logger, config) =>
			registerGoogleVertexProvider(registry, logger, config.googleVertexCallbacks),
	],
	["openai-compatible", (registry, logger) => registerOpenAICompatibleProvider(registry, logger)],
	["ms-foundry", (registry, logger) => registerFoundryProvider(registry, logger)],
	["snowflake-cortex", (registry, logger) => registerSnowflakeCortexProvider(registry, logger)],
	["deepseek", (registry, logger) => registerDeepSeekProvider(registry, logger)],
];

/**
 * Register every provider with the given registry, honoring `config.allowedProviders`.
 */
export function registerAllProviders(
	registry: ProviderRegistry,
	logger: Logger,
	config: ProviderRegistrationConfig,
): void {
	const allowed = config.allowedProviders ? new Set(config.allowedProviders) : null;
	const isAllowed = (id: ProviderId) => !allowed || allowed.has(id);

	for (const [id, register] of PROVIDER_REGISTRARS) {
		if (isAllowed(id)) {
			register(registry, logger, config);
		}
	}
}
