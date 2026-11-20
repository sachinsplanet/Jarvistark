import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JarvistarkGate } from "@jarvistark/core";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { LocalRunner } from "../src/runner.js";
import { FileStorage } from "../src/storage.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const fixture = resolve(root, "fixtures/freelancer-tracker");
const executable = resolve(root, "apps/cli/dist/main.js");
const temporary: string[] = [];
afterEach(async () => {
	await Promise.all(temporary.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function workspace() {
	const dir = await mkdtemp(resolve(tmpdir(), "jarvistark-freelancer-"));
	temporary.push(dir);
	return dir;
}

describe("freelancer tracker CLI journey", () => {
	it("reviews, builds, fails, repairs, resumes, revises, and verifies real commands", async () => {
		const dir = await workspace();
		const reviews: string[] = [];
		// A synthetic human review adapter is injected only in this test. The public
		// executable has no flag/environment variable enabling automatic approval.
		const invoke = async (...args: string[]) => {
			const output: unknown[] = [];
			const code = await runCli(["--workspace", dir, ...args], {
				write: (value) => output.push(value),
				confirm: async (action, review) => {
					reviews.push(action);
					expect(JSON.stringify(review)).toContain("fixture-reviewer");
					return true;
				},
			});
			return { code, output };
		};
		const command = (...args: string[]) =>
			spawnSync(process.execPath, [executable, "--workspace", dir, ...args], { encoding: "utf8" });
		const status = () => JSON.parse(command("status").stdout);
		await invoke("init", resolve(fixture, "idea.txt"));
		await invoke("propose", resolve(fixture, "claims.json"));
		await invoke("task", resolve(fixture, "projects.task.json"));
		await invoke("task", resolve(fixture, "earnings.task.json"));
		expect(status().tasks.every((t: { state: string }) => t.state === "blocked")).toBe(true);
		expect(command("approve", "CLM-001", "--by", "agent").status).toBe(1);
		expect(command("start", "TSK-001").status).toBe(1);
		await invoke("approve", "CLM-001", "CLM-002", "CLM-003", "--by", "fixture-reviewer");
		await invoke("approve", "TSK-001", "TSK-002", "--by", "fixture-reviewer");
		for (const name of ["projects.test.mjs", "earnings.test.mjs", "rounding.test.mjs"])
			await copyFile(resolve(fixture, name), resolve(dir, name));
		await copyFile(resolve(fixture, "tracker.initial.mjs"), resolve(dir, "tracker.mjs"));
		expect(command("next").stdout).toContain("TSK-001");
		expect(command("start", "TSK-001").status).toBe(0);
		expect(command("done", "TSK-001").status).toBe(1);
		expect(command("check", "TSK-001").status).toBe(0);
		expect(command("done", "TSK-001").status).toBe(0);
		expect(command("start", "TSK-002").status).toBe(0);
		expect(command("check", "TSK-002").status).toBe(1);
		expect(command("done", "TSK-002").status).toBe(1);
		expect(status().tasks[1].state).toBe("failed");
		await copyFile(resolve(fixture, "tracker.complete.mjs"), resolve(dir, "tracker.mjs"));
		expect(command("start", "TSK-002").status).toBe(0);
		expect(command("check", "TSK-002").status).toBe(0);
		expect(command("done", "TSK-002").status).toBe(0);
		expect(status().tasks.every((t: { state: string }) => t.state === "done")).toBe(true);
		expect(status().tasks[1].attempts[0].evidence[0].output).toContain("Not implemented");
		await invoke("propose", resolve(fixture, "revision.json"));
		await invoke("approve", "CLM-004", "--by", "fixture-reviewer");
		expect(status().tasks[1].state).toBe("blocked");
		await invoke("revise-task", "TSK-002", resolve(fixture, "earnings.revised.task.json"));
		await invoke("approve", "TSK-002", "--by", "fixture-reviewer");
		expect(command("start", "TSK-002").status).toBe(0);
		expect(command("check", "TSK-002").status).toBe(1);
		await copyFile(resolve(fixture, "tracker.revised.mjs"), resolve(dir, "tracker.mjs"));
		expect(command("start", "TSK-002").status).toBe(0);
		expect(command("check", "TSK-002").status).toBe(0);
		expect(command("done", "TSK-002").status).toBe(0);
		expect(command("validate").status).toBe(0);
		expect(status().tasks[1].attempts).toHaveLength(4);
		expect(reviews).toHaveLength(4);
		const exported = JSON.parse(command("export").stdout);
		expect(exported.events.at(-1).snapshot.proposals).toHaveLength(2);
		const journal = resolve(dir, ".jarvistark/ledger/events.ndjson");
		const before = await readFile(journal, "utf8");
		await writeFile(journal, before.replace('"text":"Each project', '"text":"Injected project'));
		expect(command("validate").status).toBe(1);
	}, 60000);

	it("does not change state when approval is declined", async () => {
		const dir = await workspace();
		const io = { write: () => {}, confirm: async () => false };
		await runCli(["--workspace", dir, "init", resolve(fixture, "idea.txt")], io);
		await runCli(["--workspace", dir, "propose", resolve(fixture, "claims.json")], io);
		const storage = await FileStorage.open(dir);
		const before = await storage.readEvents();
		await expect(
			runCli(["--workspace", dir, "approve", "CLM-001", "--by", "founder"], io),
		).rejects.toThrow("cancelled");
		expect(await storage.readEvents()).toEqual(before);
	});

	it("compiles a reviewed seed library plan through the public CLI and records failures for repair", async () => {
		const dir = await workspace();
		const seedFixture = resolve(root, "fixtures/community-seed-library");
		const io = { write: () => {}, confirm: async () => true };
		const invoke = (...args: string[]) => runCli(["--workspace", dir, ...args], io);
		const command = (...args: string[]) =>
			spawnSync(process.execPath, [executable, "--workspace", dir, ...args], { encoding: "utf8" });
		await invoke("init", resolve(seedFixture, "idea.txt"));
		await invoke("propose", resolve(seedFixture, "claims.json"));
		await invoke("approve", "CLM-001", "CLM-002", "CLM-003", "CLM-004", "--by", "fixture-reviewer");
		await invoke("task", resolve(seedFixture, "inventory.task.json"));
		expect(command("plan").status).toBe(1);
		expect(command("prompt", "TSK-001").status).toBe(1);
		await invoke("approve", "TSK-001", "--by", "fixture-reviewer");
		expect(command("plan").status).toBe(0);
		const result = command("prompt", "TSK-001", "--format", "json");
		expect(result.status, result.stderr).toBe(0);
		const prompt = JSON.parse(result.stdout);
		expect(prompt.complete).toBe(true);
		expect(prompt.content).toContain(executable);
		expect(prompt.content).toContain(process.execPath);
		expect(prompt.content).toContain(dir);
		expect(JSON.parse(command("next").stdout).prompt).toBe(prompt.content);
		expect(command("prompt", "--mode", "project").stdout).toContain("CLM-004");
		await copyFile(resolve(seedFixture, "inventory.test.mjs"), resolve(dir, "inventory.test.mjs"));
		expect(command("start", "TSK-001").status).toBe(0);
		expect(JSON.parse(command("prompt", "TSK-001", "--format", "json").stdout).kind).toBe("resume");
		expect(command("check", "TSK-001").status).toBe(1);
		const repair = JSON.parse(
			command("prompt", "TSK-001", "--mode", "repair", "--format", "json").stdout,
		);
		expect(repair.content).toContain("inventory.mjs");
		expect(repair.content).toContain("ERR_MODULE_NOT_FOUND");
		expect(command("done", "TSK-001").status).toBe(1);
		expect(command("validate").status).toBe(0);
	}, 30000);

	it("rejects stale file writers and incomplete journals", async () => {
		const dir = await workspace();
		const storage = await FileStorage.open(dir, true);
		const first = await JarvistarkGate.create(storage);
		const second = await JarvistarkGate.create(storage);
		await first.recordIntake("Tracker");
		await expect(second.recordIntake("Other tracker")).rejects.toThrow("Workspace changed");
		const journal = resolve(dir, ".jarvistark/ledger/events.ndjson");
		const before = await readFile(journal, "utf8");
		await writeFile(journal, before.trimEnd());
		await expect(JarvistarkGate.create(storage)).rejects.toThrow("Incomplete ledger");
	});

	it("records command launch failures, timeouts, and excessive output as failures", async () => {
		const dir = await workspace();
		expect(
			(await new LocalRunner(dir).run("jarvistark_nonexistent_command_12345")).exitCode,
		).not.toBe(0);
		expect(
			(await new LocalRunner(dir, 100).run('node -e "setTimeout(() => {}, 10000)"')).output,
		).toContain("timed out");
		expect(
			(await new LocalRunner(dir, 5000, 10).run("node -e \"console.log('x'.repeat(100))\""))
				.exitCode,
		).not.toBe(0);
	});
});
