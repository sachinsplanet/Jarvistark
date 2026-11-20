import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	InMemoryStorage,
	JarvistarkGate,
	type RunnerPort,
	TaskDraft,
	canonicalJson,
	contentHash,
} from "../src/index.js";

const fixture = new URL("../../../fixtures/community-seed-library/", import.meta.url);
const idea = readFileSync(new URL("idea.txt", fixture), "utf8");
const proposal = JSON.parse(readFileSync(new URL("claims.json", fixture), "utf8"));
const draft = JSON.parse(readFileSync(new URL("inventory.task.json", fixture), "utf8"));

async function setup(runner?: RunnerPort, taskDraft = draft) {
	const storage = new InMemoryStorage();
	const gate = await JarvistarkGate.create(storage, runner);
	await gate.recordIntake(idea);
	expect((await gate.propose(proposal)).ok).toBe(true);
	await gate.approve(["CLM-001", "CLM-002", "CLM-003", "CLM-004"], "fixture-reviewer");
	const task = await gate.proposeTask(taskDraft);
	await gate.approveTask(task.id, "fixture-reviewer");
	return { gate, storage, task };
}

describe("executable plan and prompt contract", () => {
	it("records the displayed build prompt, recovers an unclaimed request and starts one attempt", async () => {
		const { gate, storage, task } = await setup();
		const host = { workspace: "/work/seed library" };
		const prompt = gate.getBuildPrompt(host);
		if (!prompt) throw new Error("Expected an available build");
		const review = {
			reviewedHead: gate.ledgerHead,
			taskId: task.id,
			promptHash: prompt.contentHash,
			by: "fixture-reviewer",
		};
		await expect(
			gate.requestBuild({ ...review, promptHash: "different prompt" }, host),
		).rejects.toThrow("Workspace changed");
		const receipt = await gate.requestBuild(review, host);
		expect(receipt.prompt).toEqual(prompt);
		expect(prompt.content).toContain(`begin-build ${receipt.dispatchId}`);
		expect(gate.getEvents().at(-1)).toMatchObject({
			type: "build.requested",
			prev: review.reviewedHead,
			reviewedHead: review.reviewedHead,
			task: task.id,
			by: review.by,
			promptHash: prompt.contentHash,
		});
		await expect(gate.requestBuild(review, host)).rejects.toThrow("Workspace changed");
		const reopened = await JarvistarkGate.create(storage);
		expect(
			await reopened.requestBuild({ ...review, reviewedHead: reopened.ledgerHead }, host),
		).toEqual(receipt);
		await expect(
			reopened.beginBuild(receipt.dispatchId, { workspace: "/another app" }),
		).rejects.toThrow("Workspace changed");
		const claims = await Promise.allSettled([
			reopened.beginBuild(receipt.dispatchId, host),
			gate.beginBuild(receipt.dispatchId, host),
		]);
		expect(claims.filter((r) => r.status === "fulfilled")).toHaveLength(1);
		expect(claims.find((r) => r.status === "fulfilled")).toMatchObject({
			value: { prompt, attemptId: 1 },
		});
		const after = await JarvistarkGate.create(storage);
		expect(after.getBuildPrompt(host)).toBeNull();
		expect(after.getEvents().at(-1)).toMatchObject({
			type: "task.started",
			dispatchId: receipt.dispatchId,
		});
		expect(after.getTasks()[0].attempts).toHaveLength(1);
		await expect(after.beginBuild(receipt.dispatchId, host)).rejects.toThrow("already claimed");
		await expect(after.done(task.id)).rejects.toThrow();
	});

	it("declines incomplete plans and invalidates an unclaimed handoff when the plan changes", async () => {
		const { gate, task } = await setup();
		const host = { workspace: "/work/library" };
		const review = {
			reviewedHead: gate.ledgerHead,
			taskId: task.id,
			by: "fixture-reviewer",
			promptHash: gate.getBuildPrompt(host)?.contentHash ?? "",
		};
		const receipt = await gate.requestBuild(review, host);
		await gate.proposeTask(
			{ ...draft, checks: [{ command: "node --test revised.mjs", expect: "Revised tests pass." }] },
			task.id,
		);
		expect(gate.getBuildPrompt(host)).toBeNull();
		await expect(gate.beginBuild(receipt.dispatchId, host)).rejects.toThrow("workspace changed");
		await expect(
			gate.requestBuild({ ...review, reviewedHead: gate.ledgerHead }, host),
		).rejects.toThrow("no approved task");
		expect(gate.getTasks()[0].attempts).toHaveLength(0);
	});

	it("preserves reviewed context across restarts and traces coverage through architecture", async () => {
		const { gate, storage, task } = await setup();
		const host = {
			workspace: "/work/seed library",
			commandPrefix: "node '/plugin/bin/jarvistark.mjs' --workspace '/work/seed library'",
		};
		const prompt = gate.compilePrompt(task.id, host);
		expect(prompt.complete).toBe(true);
		expect(prompt.contentHash).toBe(contentHash(prompt.content));
		for (const item of draft.execution.design.interfaces)
			expect(prompt.content).toContain(item.contract);
		for (const item of draft.execution.deliverables)
			expect(prompt.content).toContain(item.description);
		expect(prompt.content).toContain(`${host.commandPrefix} check ${task.id}`);
		expect(gate.getPlan().coverage).toEqual(
			["CLM-001", "CLM-002", "CLM-003"].map((claimId) => ({ claimId, taskIds: [task.id] })),
		);
		expect(gate.getPlan().complete).toBe(true);
		const reopened = await JarvistarkGate.create(storage);
		expect(reopened.compilePrompt(task.id, host)).toEqual(prompt);
		expect(reopened.next(host)?.prompt).toBe(prompt.content);
		expect(reopened.compileProjectPrompt(host).complete).toBe(true);
		expect(() => reopened.compilePrompt(task.id, { sizeBudget: 50 })).toThrow("budget");
		expect(() => reopened.compilePrompt(task.id, { sizeBudget: Number.NaN })).toThrow(
			"positive integer",
		);
	});

	it("keeps legacy approvals and completion fingerprints valid", async () => {
		const { execution: _execution, ...legacyDraft } = draft;
		const { gate, storage, task } = await setup(
			{ run: async () => ({ exitCode: 0, output: "ok", executedBy: "fixture" }) },
			legacyDraft,
		);
		const definition = {
			id: task.id,
			revision: task.revision,
			title: task.title,
			needs: task.needs,
			dependsOn: task.dependsOn,
			checks: task.checks,
		};
		expect(gate.getTasks()[0].approval?.hash).toBe(contentHash(canonicalJson(definition)));
		await gate.startTask(task.id);
		await gate.runChecks(task.id);
		await gate.done(task.id);
		const reopened = await JarvistarkGate.create(storage);
		expect(reopened.getTasks()[0].state).toBe("done");
		expect(reopened.compilePrompt(task.id).complete).toBe(false);
		expect((await reopened.validate()).valid).toBe(true);
	});

	it("blocks a handoff when a requirement behind its architecture decision is replaced", async () => {
		const { gate, storage, task } = await setup();
		const beforeReview = gate.compilePrompt(task.id);
		await gate.propose({
			...proposal,
			id: "PRP-002",
			ops: [
				{
					op: "revise",
					key: "$retention",
					target: "CLM-003",
					claim: {
						text: "Restore packet balances after restart and preserve any unreadable inventory file.",
					},
				},
			],
		});
		expect(gate.compilePrompt(task.id)).toEqual(beforeReview);
		await gate.approve(["CLM-005"], "fixture-reviewer");
		const reopened = await JarvistarkGate.create(storage);
		expect(reopened.getPlan().findings).toContainEqual(
			expect.objectContaining({ taskId: task.id, code: "TASK_INPUTS_STALE" }),
		);
		expect(reopened.next()).toBeNull();
		expect(() => reopened.compilePrompt(task.id)).toThrow("CLM-003");
		await expect(reopened.startTask(task.id)).rejects.toThrow("not ready");

		const revised = await reopened.propose({
			...proposal,
			id: "PRP-003",
			ops: [
				{
					op: "revise",
					key: "$store",
					target: "CLM-004",
					claim: {
						text: "Load the stored JSON array on startup. Report malformed inventory without rewriting the file.",
					},
				},
				{ op: "link", from: "$store", to: "CLM-001", rel: "derives-from" },
				{ op: "link", from: "$store", to: "CLM-002", rel: "derives-from" },
				{ op: "link", from: "$store", to: "CLM-005", rel: "derives-from" },
			],
		});
		expect(revised.ok).toBe(true);
		await reopened.approve(["CLM-006"], "fixture-reviewer");
		await reopened.proposeTask({ ...draft, needs: ["CLM-006"] }, task.id);
		await reopened.approveTask(task.id, "fixture-reviewer");
		expect(reopened.getPlan().complete).toBe(true);
		expect(reopened.next()?.prompt).toContain("CLM-005");
	});

	it("distinguishes an unapproved input of a reviewed decision from a later draft link", async () => {
		const gate = await JarvistarkGate.create(new InMemoryStorage());
		await gate.recordIntake(idea);
		await gate.propose(proposal);
		await gate.approve(["CLM-001", "CLM-002", "CLM-004"], "fixture-reviewer");
		const task = await gate.proposeTask(draft);
		await expect(gate.approveTask(task.id, "fixture-reviewer")).rejects.toThrow("CLM-003");
		await gate.approve(["CLM-003"], "fixture-reviewer");
		await gate.approveTask(task.id, "fixture-reviewer");
		const original = gate.compilePrompt(task.id);
		const additional = await gate.propose({
			...proposal,
			id: "PRP-002",
			ops: [
				{
					op: "add",
					key: "$extra",
					claim: { kind: "constraint", origin: "recommended", text: "Keep an inventory backup." },
				},
				{ op: "link", from: "CLM-004", to: "$extra", rel: "depends-on" },
			],
		});
		expect(additional.ok).toBe(true);
		expect(gate.compilePrompt(task.id)).toEqual(original);
		await gate.approve(["CLM-005"], "fixture-reviewer");
		expect(gate.compilePrompt(task.id).content).toContain("Keep an inventory backup.");
	});

	it("invalidates approval and old evidence after execution context is revised", async () => {
		const { gate, storage, task } = await setup({
			run: async () => ({ exitCode: 0, output: "ok", executedBy: "fixture" }),
		});
		const old = gate.compilePrompt(task.id);
		await gate.startTask(task.id);
		await gate.runChecks(task.id);
		await gate.done(task.id);
		await gate.proposeTask(
			{ ...draft, execution: { ...draft.execution, outcome: "Revised inventory outcome" } },
			task.id,
		);
		expect(() => gate.compilePrompt(task.id)).toThrow("approval");
		expect(gate.getPlan().complete).toBe(false);
		await gate.approveTask(task.id, "fixture-reviewer");
		const reopened = await JarvistarkGate.create(storage);
		expect(reopened.compilePrompt(task.id).contextHash).not.toBe(old.contextHash);
		expect(reopened.getTasks()[0].state).toBe("ready");
		await reopened.startTask(task.id);
		await expect(reopened.done(task.id)).rejects.toThrow("runner-verified");
	});

	it("uses recorded failures for repair and the current attempt for resume", async () => {
		const output = `${"x".repeat(40000)}\nError: insufficient stock`;
		const { gate, task } = await setup({
			run: async () => ({ exitCode: 1, output, executedBy: "fixture" }),
		});
		expect(() => gate.compilePrompt(task.id, { kind: "repair" })).toThrow("failed attempt");
		await gate.startTask(task.id);
		expect(gate.compilePrompt(task.id).kind).toBe("resume");
		await gate.runChecks(task.id);
		const repair = gate.compilePrompt(task.id);
		expect(repair.kind).toBe("repair");
		expect(repair.content).toContain("Error: insufficient stock");
		expect(repair.content).toContain(contentHash(output));
		expect(repair.content.length).toBeLessThan(32000);
		expect(gate.getTasks()[0].attempts[0].evidence[0].output).toBe(output);
		expect(() => gate.compilePrompt(task.id, { kind: "resume" })).toThrow("in-progress");
	});

	it("reports uncovered scope and unresolved setup without treating planned dependencies as failures", async () => {
		const execution = structuredClone(draft.execution);
		execution.environment.prerequisites[0].status = "missing";
		const { gate, task } = await setup(undefined, { ...draft, needs: ["CLM-001"], execution });
		expect(gate.getPlan().findings.map((finding) => finding.code)).toContain("UNCOVERED_CLAIM");
		expect(gate.compilePrompt(task.id).complete).toBe(false);
		await expect(
			gate.proposeTask({
				...draft,
				execution: {
					...execution,
					environment: {
						...execution.environment,
						prerequisites: [{ ...execution.environment.prerequisites[0], setupTask: "TSK-999" }],
					},
				},
			}),
		).rejects.toThrow("dependsOn");
		const second = await gate.proposeTask({ ...draft, dependsOn: [task.id] });
		await gate.approveTask(second.id, "fixture-reviewer");
		await gate.proposeTask(draft, task.id);
		await gate.approveTask(task.id, "fixture-reviewer");
		expect(gate.getPlan().complete).toBe(true);
		expect(() => gate.compilePrompt(second.id)).toThrow("Dependency");
	});

	it("validates the execution contract instead of silently dropping misspelled fields", () => {
		expect(
			TaskDraft.safeParse({ ...draft, execution: { ...draft.execution, typo: true } }).success,
		).toBe(false);
		expect(
			TaskDraft.safeParse({
				...draft,
				execution: {
					...draft.execution,
					deliverables: [{ path: "../other-project/file", description: "Outside workspace" }],
				},
			}).success,
		).toBe(false);
	});
});
