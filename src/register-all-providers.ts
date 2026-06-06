/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2026 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Provider registration orchestrator (Internal Build Variant)
 *
 * Centralizes the "construct a ProviderRegistry and register every provider" loop that
 * downstream consumers would otherwise hand-roll. External builds swap to
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
 * Register every provider with the given registry, honoring `config.allowedProviders`.
 */
export function registerAllProviders(
	registry: ProviderRegistry,
	logger: Logger,
	config: ProviderRegistrationConfig,
): void {
	const providers: [ProviderId, () => void][] = [
		[
			"positai",
			() => registerPositAiProvider(registry, config.positAiBaseUrl, config.userAgent, logger),
		],
		["anthropic", () => registerAnthropicProvider(registry, logger)],
		["copilot", () => registerCopilotProvider(registry, logger)],
		["openai", () => registerOpenAIProvider(registry, logger)],
		["openrouter", () => registerOpenRouterProvider(registry, logger)],
		["ollama", () => registerOllamaProvider(registry, logger)],
		["lmstudio", () => registerLMStudioProvider(registry, logger)],
		["bedrock", () => registerBedrockProvider(registry, logger, config.bedrockCallbacks)],
		["gemini", () => registerGeminiProvider(registry, logger)],
		[
			"google-vertex",
			() => registerGoogleVertexProvider(registry, logger, config.googleVertexCallbacks),
		],
		["openai-compatible", () => registerOpenAICompatibleProvider(registry, logger)],
		["ms-foundry", () => registerFoundryProvider(registry, logger)],
		["snowflake-cortex", () => registerSnowflakeCortexProvider(registry, logger)],
		["deepseek", () => registerDeepSeekProvider(registry, logger)],
	];

	const allowed = config.allowedProviders ? new Set(config.allowedProviders) : null;
	const isAllowed = (id: ProviderId) => !allowed || allowed.has(id);

	for (const [id, register] of providers) {
		if (isAllowed(id)) {
			register();
		}
	}
}
