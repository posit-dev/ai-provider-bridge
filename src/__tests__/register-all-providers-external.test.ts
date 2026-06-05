/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2026 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderRegistry } from "../providers/ProviderRegistry";
import type { Logger } from "../types";

// Mock the only provider the external variant can register.
vi.mock("../providers/positai-provider", () => ({ registerPositAiProvider: vi.fn() }));

import { registerPositAiProvider } from "../providers/positai-provider";
import { registerAllProviders } from "../register-all-providers-external";

const mockLogger: Logger = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	trace: vi.fn(),
};

const BASE_URL = "https://posit.example.com/v1";

describe("registerAllProviders (external)", () => {
	let registry: ProviderRegistry;

	beforeEach(() => {
		vi.clearAllMocks();
		registry = new ProviderRegistry(mockLogger);
	});

	it("registers positai when allowedProviders is omitted", () => {
		registerAllProviders(registry, mockLogger, { positAiBaseUrl: BASE_URL });

		expect(registerPositAiProvider).toHaveBeenCalledTimes(1);
	});

	it("registers positai when it is in allowedProviders", () => {
		registerAllProviders(registry, mockLogger, {
			positAiBaseUrl: BASE_URL,
			allowedProviders: ["positai", "anthropic"],
		});

		expect(registerPositAiProvider).toHaveBeenCalledTimes(1);
	});

	it("does not register positai when allowedProviders excludes it", () => {
		registerAllProviders(registry, mockLogger, {
			positAiBaseUrl: BASE_URL,
			allowedProviders: ["anthropic"],
		});

		expect(registerPositAiProvider).not.toHaveBeenCalled();
	});

	it("ignores bedrock and google-vertex callbacks (no other provider registers)", () => {
		const bedrockCallbacks = { onProviderStatusChange: vi.fn().mockResolvedValue(undefined) };
		const googleVertexCallbacks = { onProviderStatusChange: vi.fn().mockResolvedValue(undefined) };

		registerAllProviders(registry, mockLogger, {
			positAiBaseUrl: BASE_URL,
			bedrockCallbacks,
			googleVertexCallbacks,
		});

		// Only positai ever registers in the external variant, regardless of config.
		expect(registerPositAiProvider).toHaveBeenCalledTimes(1);
	});
});
