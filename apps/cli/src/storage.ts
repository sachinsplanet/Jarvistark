import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
	type LedgerEvent,
	type StoragePort,
	WorkspaceChangedError,
	canonicalJson,
	verifyLedgerChain,
} from "@jarvistark/core";

const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

/** One canonical journal, logically append-only. Atomic rename commits a batch so
 * crashes cannot expose half a proposal/approval. A lock + head comparison prevent
 * concurrent writers from losing updates. No independently writable projections. */
export class FileStorage implements StoragePort {
	private constructor(
		readonly root: string,
		readonly directory: string,
	) {}

	static async open(workspace: string, initialize = false) {
		const root = await realpath(resolve(workspace));
		let directory = root;
		for (const component of [".jarvistark", "ledger"]) {
			directory = join(directory, component);
			if (initialize) await mkdir(directory, { recursive: true });
			const stat = await lstat(directory);
			if (!stat.isDirectory() || stat.isSymbolicLink())
				throw new Error(`Expected a real workspace directory: ${directory}`);
		}
		return new FileStorage(root, directory);
	}

	private async assertRegular(path: string) {
		try {
			const stat = await lstat(path);
			if (!stat.isFile() || stat.isSymbolicLink())
				throw new Error(`Refusing non-regular ledger file: ${path}`);
		} catch (error) {
			if (!missing(error)) throw error;
		}
	}

	async readEvents(): Promise<LedgerEvent[]> {
		const path = join(this.directory, "events.ndjson");
		await this.assertRegular(path);
		let text: string;
		try {
			text = await readFile(path, "utf8");
		} catch (error) {
			if (missing(error)) return [];
			throw error;
		}
		if (!text) return [];
		if (!text.endsWith("\n")) throw new Error("Incomplete ledger: final newline is missing");
		return text
			.trimEnd()
			.split("\n")
			.map((line) => JSON.parse(line) as LedgerEvent);
	}

	async commitEvents(expectedHead: string, events: LedgerEvent[]): Promise<void> {
		const lockPath = join(this.directory, "write.lock");
		let lock: Awaited<ReturnType<typeof open>>;
		try {
			lock = await open(lockPath, "wx", 0o600);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "EEXIST")
				throw new Error(
					"Workspace is locked by another writer. If it crashed, inspect write.lock and recover it before retrying.",
				);
			throw error;
		}
		const temporary = join(this.directory, `.events-${randomUUID()}.tmp`);
		try {
			await lock.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
			const prior = await this.readEvents();
			if ((prior.at(-1)?.hash ?? "GENESIS") !== expectedHead) throw new WorkspaceChangedError();
			const combined = [...prior, ...events];
			const chain = verifyLedgerChain(combined);
			if (!events.length || !chain.valid || !events.at(-1)?.snapshot)
				throw new Error(chain.error ?? "Incomplete event transaction");
			const file = await open(temporary, "wx", 0o600);
			try {
				await file.writeFile(`${combined.map((e) => canonicalJson(e)).join("\n")}\n`);
				await file.sync();
			} finally {
				await file.close();
			}
			await rename(temporary, join(this.directory, "events.ndjson"));
		} finally {
			await unlink(temporary).catch((error) => {
				if (!missing(error)) throw error;
			});
			await lock.close();
			await unlink(lockPath);
		}
	}
}
