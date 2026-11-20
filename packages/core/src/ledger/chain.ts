import { contentHash } from "./hasher.js";
import type { LedgerEvent } from "./schema.js";

/**
 * Deterministically stringify any JSON value with sorted keys.
 * This guarantees canonical serialization across runtimes.
 */
export function canonicalJson(value: unknown): string {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
	}
	const obj = value as Record<string, unknown>;
	const sortedKeys = Object.keys(obj).sort();
	const entries = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`);
	return `{${entries.join(",")}}`;
}

/**
 * Compute the cryptographic content hash of a ledger event.
 * Hash is computed over canonical JSON of the event excluding its own `hash` property.
 */
export function computeEventHash(event: Omit<LedgerEvent, "hash">): string {
	const { hash: _omitted, ...rest } = event as Record<string, unknown>;
	return contentHash(canonicalJson(rest));
}

export interface ChainVerificationResult {
	valid: boolean;
	error?: string;
	brokenIndex?: number;
	brokenEventId?: string;
}

/**
 * Verifies that a sequence of ledger events forms an unbroken, untampered hash chain.
 * - Event 0 must have prev === "GENESIS"
 * - Every event's hash must match computeEventHash(event)
 * - Every subsequent event's prev must match the preceding event's hash
 */
export function verifyLedgerChain(events: LedgerEvent[]): ChainVerificationResult {
	if (events.length === 0) {
		return { valid: true };
	}

	for (let i = 0; i < events.length; i++) {
		const current = events[i];
		const expectedPrev = i === 0 ? "GENESIS" : events[i - 1].hash;

		if (current.prev !== expectedPrev) {
			return {
				valid: false,
				error: `Broken chain link at index ${i} (${current.id}): prev "${current.prev}" does not match expected "${expectedPrev}"`,
				brokenIndex: i,
				brokenEventId: current.id,
			};
		}

		const recomputedHash = computeEventHash(current);
		if (current.hash !== recomputedHash) {
			return {
				valid: false,
				error: `Tampered event content at index ${i} (${current.id}): hash "${current.hash}" does not match recomputed "${recomputedHash}"`,
				brokenIndex: i,
				brokenEventId: current.id,
			};
		}
	}

	return { valid: true };
}
