/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2026 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// The external bundle excludes all 14 provider SDKs ONLY because every reference to
// ./register-all-providers in register-all-providers-external.ts is type-only (import type /
// export type), which esbuild erases. Deleting the `type` keyword turns those into runtime
// re-exports of register-all-providers.ts, dragging every SDK into the lightweight bundle.
// The actual aliasing lives downstream and can't be tested here, so guard the precondition at
// the source level instead.
//
// Scope: this validates the top-level `import type` / `export type` form this file uses. It
// intentionally does not accept the inline `import { type X }` form (also bundle-safe, but not
// the style used here), and does not catch side-effect (`import "..."`), dynamic, or
// barrel-routed imports. Those are out of scope for this regex check.

const externalSource = readFileSync(
	fileURLToPath(new URL("../register-all-providers-external.ts", import.meta.url)),
	"utf8",
);

// Matches a top-level `import ... from "<spec>";` / `export ... from "<spec>";` statement.
// `[^;]` keeps each match within a single statement (no crossing a `;` boundary) while still
// spanning multi-line imports. Capture group 1 is the module specifier.
const IMPORT_EXPORT_FROM = /^[ \t]*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["'][^;]*;/gm;

describe("register-all-providers-external bundle split", () => {
	it("references ./register-all-providers only via type-only import/export", () => {
		const referencingStatements = [...externalSource.matchAll(IMPORT_EXPORT_FROM)].filter(
			(match) => match[1] === "./register-all-providers",
		);

		// Sanity check: the shared config interface is sourced from register-all-providers, so at
		// least one reference must exist. Zero matches means the regex (not the source) drifted.
		expect(referencingStatements.length).toBeGreaterThan(0);

		for (const match of referencingStatements) {
			expect(match[0].trimStart()).toMatch(/^(?:import|export)\s+type\b/);
		}
	});
});
