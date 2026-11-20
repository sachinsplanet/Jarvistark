import type { LedgerEvent } from "../ledger/schema.js";
import { clone } from "../workspace.js";
import { type StoragePort, WorkspaceChangedError } from "./storage.js";

export class InMemoryStorage implements StoragePort {
	private events: LedgerEvent[] = [];

	async readEvents(): Promise<LedgerEvent[]> {
		return clone(this.events);
	}

	async commitEvents(expectedHead: string, events: LedgerEvent[]): Promise<void> {
		if ((this.events.at(-1)?.hash ?? "GENESIS") !== expectedHead) {
			throw new WorkspaceChangedError();
		}
		this.events.push(...clone(events));
	}
}
