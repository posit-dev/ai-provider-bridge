/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025-2026 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Small, self-contained utilities used by provider-bridge.
 * Kept here to avoid depending on any consumer package.
 */

// ---------------------------------------------------------------------------
// Thinking effort
// ---------------------------------------------------------------------------

/** Whether a resolved thinking effort represents active thinking. */
export function isThinkingEnabled(effort: string | undefined): boolean {
	return effort !== undefined && effort !== "off";
}

// ---------------------------------------------------------------------------
// Model ID helpers
// ---------------------------------------------------------------------------

/**
 * Check if a model ID refers to a Claude (Anthropic) model.
 * Used by multi-protocol clients (PositAiClient, SnowflakeClient) to decide
 * whether to use the Anthropic Messages API or OpenAI Chat Completions API.
 */
export function isClaudeModel(modelId: string): boolean {
	return modelId.startsWith("claude");
}

// ---------------------------------------------------------------------------
// Snowflake
// ---------------------------------------------------------------------------

/**
 * Construct the Snowflake Cortex REST API base URL from an account identifier.
 *
 * @param account - Snowflake account identifier (e.g., "myorg-myaccount")
 * @returns Full Cortex REST API base URL
 */
export function buildSnowflakeCortexUrl(account: string): string {
	return `https://${account}.snowflakecomputing.com/api/v2/cortex/v1`;
}

// ---------------------------------------------------------------------------
// Posit AI
// ---------------------------------------------------------------------------

/**
 * Check whether a response body indicates an agreement-required 403
 * (`prism_account_not_found`). Parses defensively: checks top-level
 * `error_type`, nested `error.error_type`, and falls back to a raw-text
 * `includes` check as a safety net against schema drift.
 */
export function isAgreementRequiredBody(responseBody: string | undefined): boolean {
	if (!responseBody) return false;
	const TARGET = "prism_account_not_found";
	try {
		const parsed: unknown = JSON.parse(responseBody);
		if (parsed && typeof parsed === "object") {
			const obj = parsed as Record<string, unknown>;
			if (obj.error_type === TARGET) return true;
			if (obj.error && typeof obj.error === "object") {
				if ((obj.error as Record<string, unknown>).error_type === TARGET) return true;
			}
		}
	} catch {
		// Not JSON — fall through to raw check
	}
	return responseBody.includes(TARGET);
}

// ---------------------------------------------------------------------------
// Base URL normalization
// ---------------------------------------------------------------------------

/**
 * Normalize an explicitly configured base URL for an `@ai-sdk/*` provider, or
 * return `undefined` when the user has not set one.
 *
 * The AI SDK providers expect `baseURL` to already include the API version
 * segment (e.g. `/v1`, `/v1beta`) and append only the operation path
 * (`/messages`, `/models`, etc). Users who paste just the host with no version
 * path (e.g. `https://api.anthropic.com` instead of `https://api.anthropic.com/v1`)
 * end up hitting `/messages` and `/models` instead of `/v1/messages` and
 * `/v1/models`, which 404.
 *
 * Returning `undefined` for an unset value matters for chat client
 * construction: it lets the SDK apply its own default and base-URL env vars
 * (`OPENAI_BASE_URL`, `ANTHROPIC_BASE_URL`, etc), which non-Positron hosts may
 * rely on. Passing an explicit default here would silently disable that.
 *
 * When a value is set, this appends the version segment if it's exactly the
 * known host with no path, but leaves any other host untouched so custom
 * proxies/gateways that legitimately route without a version segment keep
 * working.
 *
 * @param baseUrl User-configured base URL, or undefined/blank if unset.
 * @param host Known public API host, no trailing slash (e.g. `https://api.anthropic.com`).
 * @param version Version segment to ensure, no slashes (e.g. `v1`, `v1beta`).
 * @returns The normalized base URL with no trailing slash, or `undefined` when unset.
 *
 * @example
 * normalizeConfiguredBaseUrl(undefined, "https://api.anthropic.com", "v1")
 * // undefined  (let the SDK apply its default / env fallback)
 * normalizeConfiguredBaseUrl("https://api.anthropic.com", "https://api.anthropic.com", "v1")
 * // "https://api.anthropic.com/v1"
 * normalizeConfiguredBaseUrl("https://my-proxy.example/anthropic", "https://api.anthropic.com", "v1")
 * // "https://my-proxy.example/anthropic"  (left untouched)
 */
export function normalizeConfiguredBaseUrl(
	baseUrl: string | undefined,
	host: string,
	version: string,
): string | undefined {
	// Treat undefined, empty, and whitespace-only as "unset" so the SDK can
	// still apply its own default and base-URL env vars.
	const trimmed = baseUrl?.trim().replace(/\/+$/, "");
	if (!trimmed) return undefined;

	// Only rewrite the known host when it has no version path; leave custom
	// proxies/gateways (any other host) alone.
	const hostTrimmed = host.replace(/\/+$/, "");
	if (trimmed === hostTrimmed) {
		return `${hostTrimmed}/${version}`;
	}
	return trimmed;
}

/**
 * Like {@link normalizeConfiguredBaseUrl}, but returns the versioned default
 * (`host/version`) when the base URL is unset.
 *
 * Use this for direct fetches (model discovery) that need a concrete URL to
 * build `/models` against and have no SDK env fallback to defer to. Use
 * {@link normalizeConfiguredBaseUrl} for chat client construction instead.
 *
 * @param baseUrl User-configured base URL, or undefined to use the default.
 * @param host Known public API host, no trailing slash (e.g. `https://api.anthropic.com`).
 * @param version Version segment to ensure, no slashes (e.g. `v1`, `v1beta`).
 * @returns The resolved base URL with no trailing slash.
 */
export function normalizeProviderBaseUrl(
	baseUrl: string | undefined,
	host: string,
	version: string,
): string {
	return (
		normalizeConfiguredBaseUrl(baseUrl, host, version) ?? `${host.replace(/\/+$/, "")}/${version}`
	);
}

// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------

/**
 * Join path segments into a single path.
 *
 * @param segments Path segments to join
 * @returns The joined path
 *
 * @example
 * joinPath("/home/user", "documents", "file.txt")
 * // Returns: "/home/user/documents/file.txt"
 */
export function joinPath(...segments: string[]): string {
	if (segments.length === 0) return "";

	// Filter out empty strings and normalize each segment
	const normalized = segments.filter((s) => s.length > 0).map((s) => s.replace(/\\/g, "/")); // Convert backslashes to forward slashes

	// Remove leading/trailing slashes from internal segments
	const parts: string[] = [];
	for (let i = 0; i < normalized.length; i++) {
		let part = normalized[i];

		// For the first segment, preserve leading slashes (absolute vs relative)
		if (i === 0) {
			// Remove only trailing slashes for now
			part = part.replace(/\/+$/, "");
		} else {
			// For other segments, remove leading and trailing slashes
			part = part.replace(/^\/+/, "").replace(/\/+$/, "");
		}

		if (part.length > 0) {
			parts.push(part);
		}
	}

	// Join with forward slashes
	return parts.join("/");
}
