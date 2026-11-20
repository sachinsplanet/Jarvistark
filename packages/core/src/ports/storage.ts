import type { LedgerEvent } from "../ledger/schema.js";

export class WorkspaceChangedError extends Error {
	constructor() {
		super("Workspace changed. Review the current version before continuing.");
	}
}

/** Commit a complete batch atomically, comparing the expected head. Existing
 * events must never change. Failure leaves the prior journal intact. */
export interface StoragePort {
	readEvents(): Promise<LedgerEvent[]>;
	commitEvents(expectedHead: string, events: LedgerEvent[]): Promise<void>;
}

/** Trusted execution capability supplied by the shell, never proposal JSON. */
export interface RunnerPort {
	run(command: string): Promise<{ exitCode: number; output: string; executedBy: string }>;
}
