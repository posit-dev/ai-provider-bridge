/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2026 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Shared allow-list predicate for provider registration.
 *
 * The internal (register-all-providers.ts) and external (register-all-providers-external.ts)
 * build variants must honor `allowedProviders` identically. Keeping the predicate here -- the
 * single source -- prevents the two variants from drifting (e.g. diverging on what an empty
 * array means).
 *
 * The only dependency is `type ProviderId`, which erases at build time, so importing this adds
 * no runtime or SDK code to the lightweight external bundle.
 */

import type { ProviderId } from "./types";

/**
 * Whether `id` should register, given an optional allow-list.
 *
 * - omitted/undefined: every provider is allowed.
 * - empty array: nothing is allowed.
 * - otherwise: only ids present in the array are allowed.
 */
export function isProviderAllowed(id: ProviderId, allowedProviders?: ProviderId[]): boolean {
	return !allowedProviders || allowedProviders.includes(id);
}
