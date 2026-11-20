import { JarvistarkGate, type LedgerEvent, type StoragePort } from "@jarvistark/core";

const KEY = "jarvistark:v2:journal";

export class BrowserStorage implements StoragePort {
	async readEvents(): Promise<LedgerEvent[]> {
		const raw = localStorage.getItem(KEY);
		return raw ? JSON.parse(raw) : [];
	}

	async commitEvents(expectedHead: string, events: LedgerEvent[]): Promise<void> {
		if (!navigator.locks)
			throw new Error("This browser needs Web Locks support to safely save the workspace");
		await navigator.locks.request(KEY, async () => {
			const current = await this.readEvents();
			if ((current.at(-1)?.hash ?? "GENESIS") !== expectedHead)
				throw new Error("Workspace changed in another tab; reload before retrying");
			localStorage.setItem(KEY, JSON.stringify([...current, ...events]));
		});
	}

	clear(): void {
		localStorage.removeItem(KEY);
	}

	exportAll(): { schemaVersion: 1; events: LedgerEvent[] } {
		return { schemaVersion: 1, events: JSON.parse(localStorage.getItem(KEY) ?? "[]") };
	}

	async importAll(data: { schemaVersion?: number; events?: LedgerEvent[] }): Promise<void> {
		if (data.schemaVersion !== 1 || !Array.isArray(data.events))
			throw new Error("Expected a versioned journal export; legacy demo exports require migration");
		const events = data.events;
		await JarvistarkGate.create({
			readEvents: async () => events,
			commitEvents: async () => {
				throw new Error("Read-only import validation");
			},
		});
		if (!navigator.locks) throw new Error("Web Locks support is required");
		await navigator.locks.request(KEY, async () => {
			localStorage.setItem(KEY, JSON.stringify(events));
		});
	}
}
