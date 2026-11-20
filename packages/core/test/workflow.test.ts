import { describe, expect, it } from "vitest";
import {
	InMemoryStorage,
	JarvistarkGate,
	type RunnerPort,
	type StoragePort,
} from "../src/index.js";

const at = "2026-11-16T10:00:00.000Z";
const proposal = {
	id: "PRP-001",
	planner: { role: "host-agent" },
	createdAt: at,
	ops: [
		{
			op: "add",
			key: "$projects",
			claim: {
				kind: "requirement",
				origin: "user-stated",
				text: "Track projects",
				source: { type: "input-span", input: "input/original.md", start: 0, end: 14 },
			},
		},
	],
};
const draft = {
	title: "Implement projects",
	needs: ["CLM-001"],
	dependsOn: [],
	checks: [{ command: "node --test", expect: "Project tests pass" }],
};

async function setup(runner?: RunnerPort, storage: StoragePort = new InMemoryStorage()) {
	const gate = await JarvistarkGate.create(storage, runner);
	await gate.recordIntake("Track projects and hours");
	expect((await gate.propose(proposal)).ok).toBe(true);
	return { gate, storage };
}

describe("authoritative guided workflow", () => {
	it("blocks unapproved tasks, requires runner evidence, retries, unlocks dependencies and resumes", async () => {
		let exitCode = 1;
		const runner = {
			run: async () => ({
				exitCode,
				output: exitCode ? "assertion failed" : "2 tests passed",
				executedBy: "test-runner",
			}),
		};
		const { gate, storage } = await setup(runner);
		const first = await gate.proposeTask(draft);
		const second = await gate.proposeTask({ ...draft, title: "Earnings", dependsOn: [first.id] });
		expect(gate.next()).toBeNull();
		await expect(gate.startTask(first.id)).rejects.toThrow("not ready");
		expect(() => gate.renderPrompt(first.id)).toThrow();
		await expect(gate.approveTask(first.id, "founder")).rejects.toThrow("accepted");
		await gate.approve(["CLM-001"], "founder");
		await gate.approveTask(first.id, "founder");
		await gate.approveTask(second.id, "founder");
		expect(gate.next()?.task.id).toBe(first.id);
		await gate.startTask(first.id);
		await expect(gate.done(first.id)).rejects.toThrow("runner-verified");
		await gate.recordEvidence(first.id, {
			checkId: first.checks[0].id,
			command: "node --test",
			executedBy: "agent",
			output: "passes",
			exitCode: 0,
			at,
		});
		await expect(gate.done(first.id)).rejects.toThrow("runner-verified");
		await expect(
			gate.recordEvidence(first.id, {
				checkId: first.checks[0].id,
				command: "node --test",
				executedBy: "agent",
				output: "passes",
				exitCode: 0,
				at,
				attestation: "runner-verified",
			}),
		).rejects.toThrow();
		await gate.runChecks(first.id);
		expect(gate.getTasks()[0].state).toBe("failed");
		await expect(gate.done(first.id)).rejects.toThrow("runner-verified");
		await expect(gate.startTask(second.id)).rejects.toThrow("not ready");
		exitCode = 0;
		const resumed = await JarvistarkGate.create(storage, runner);
		await resumed.startTask(first.id);
		await resumed.runChecks(first.id);
		await resumed.done(first.id);
		expect(resumed.next()?.task.id).toBe(second.id);
		expect(resumed.getTasks()[0].attempts).toHaveLength(2);
		await resumed.startTask(second.id);
		await resumed.runChecks(second.id);
		await resumed.done(second.id);
		const final = await JarvistarkGate.create(storage);
		expect(final.next()).toBeNull();
		expect(final.getTasks().every((t) => t.state === "done")).toBe(true);
		expect((await final.validate()).valid).toBe(true);
	});

	it("rejects bad sources, duplicates, illegal transitions, and mutable intake without writing", async () => {
		const { gate } = await setup();
		const before = gate.getEvents();
		await expect(gate.recordIntake("Replacement")).rejects.toThrow("immutable");
		expect((await gate.propose(proposal)).ok).toBe(false);
		expect(
			(await gate.propose({ ...proposal, id: "PRP-002", ops: [proposal.ops[0], proposal.ops[0]] }))
				.ok,
		).toBe(false);
		expect(
			(
				await gate.propose({
					...proposal,
					id: "PRP-002",
					ops: [
						{
							...proposal.ops[0],
							claim: {
								...proposal.ops[0].claim,
								source: { type: "clarification", sessionId: "missing", questionId: "Q1" },
							},
						},
					],
				})
			).ok,
		).toBe(false);
		expect(gate.getEvents()).toEqual(before);
		await gate.approve(["CLM-001"], "founder");
		await expect(gate.reject(["CLM-001"], "agent")).rejects.toThrow("proposed");
		const claims = gate.getClaims();
		claims[0].text = "Overwritten";
		expect(gate.getClaim("CLM-001")?.text).toBe("Track projects");
	});

	it("rolls back failed persistence and rejects competing writers", async () => {
		const backing = new InMemoryStorage();
		let fail = false;
		const storage: StoragePort = {
			readEvents: () => backing.readEvents(),
			commitEvents: async (head, events) => {
				if (fail) throw new Error("disk full");
				await backing.commitEvents(head, events);
			},
		};
		const { gate } = await setup(undefined, storage);
		const before = gate.getWorkspace();
		fail = true;
		await expect(gate.approve(["CLM-001"], "founder")).rejects.toThrow("disk full");
		expect(gate.getWorkspace()).toEqual(before);
		fail = false;
		const competitor = await JarvistarkGate.create(storage);
		await gate.approve(["CLM-001"], "founder");
		await expect(competitor.reject(["CLM-001"], "founder")).rejects.toThrow("Workspace changed");
		expect(competitor.getClaim("CLM-001")?.state).toBe("proposed");
	});

	it("binds claim text and evidence to the journal across reloads", async () => {
		const { gate } = await setup();
		await gate.approve(["CLM-001"], "founder");
		const events = gate.getEvents();
		const snapshot = events.at(-1)?.snapshot;
		if (!snapshot) throw new Error("Missing snapshot");
		snapshot.claims[0].text = "Injected scope";
		const storage: StoragePort = { readEvents: async () => events, commitEvents: async () => {} };
		await expect(JarvistarkGate.create(storage)).rejects.toThrow("Tampered");
	});

	it("invalidates completed dependent work after a claim revision and retains evidence", async () => {
		const runner = {
			run: async () => ({ exitCode: 0, output: "pass", executedBy: "test-runner" }),
		};
		const { gate, storage } = await setup(runner);
		await gate.approve(["CLM-001"], "founder");
		const first = await gate.proposeTask(draft);
		await gate.approveTask(first.id, "founder");
		await gate.startTask(first.id);
		await gate.runChecks(first.id);
		await gate.done(first.id);
		await gate.propose({
			...proposal,
			id: "PRP-002",
			ops: [
				{
					op: "revise",
					key: "$v2",
					target: "CLM-001",
					claim: { text: "Track projects with hourly rates" },
				},
			],
		});
		expect(gate.getTasks()[0].state).toBe("done");
		await gate.approve(["CLM-002"], "founder");
		expect(gate.getTasks()[0].state).toBe("blocked");
		await gate.proposeTask({ ...draft, needs: ["CLM-002"] }, first.id);
		await gate.approveTask(first.id, "founder");
		expect(gate.getTasks()[0].state).toBe("ready");
		await gate.startTask(first.id);
		await expect(gate.done(first.id)).rejects.toThrow("runner-verified");
		await gate.runChecks(first.id);
		await gate.done(first.id);
		const resumed = await JarvistarkGate.create(storage);
		expect(resumed.getTasks()[0].attempts).toHaveLength(2);
		expect(resumed.getTasks()[0].state).toBe("done");
	});

	it("stops at blocking questions and only follows approved linked constraints", async () => {
		const { gate } = await setup();
		await gate.approve(["CLM-001"], "founder");
		const task = await gate.proposeTask(draft);
		await gate.approveTask(task.id, "founder");
		await gate.propose({
			...proposal,
			id: "PRP-002",
			ops: [
				{
					op: "add",
					key: "$q",
					claim: {
						kind: "question",
						origin: "inferred",
						text: "Who can read projects?",
						blocking: true,
					},
				},
			],
		});
		expect(gate.next()).toBeNull();
		await expect(gate.approve(["CLM-002"], "founder")).rejects.toThrow("Resolve");
		await gate.propose({
			...proposal,
			id: "PRP-003",
			ops: [
				{
					op: "revise",
					key: "$answer",
					target: "CLM-002",
					claim: { kind: "decision", text: "Only owners can read projects", blocking: false },
				},
				{ op: "link", from: "$answer", to: "CLM-001", rel: "constrains" },
			],
		});
		await gate.approve(["CLM-003"], "founder");
		expect(gate.next()?.prompt).toContain("Only owners");
	});
	it("keeps multi-task approval atomic and waits for approved retirement", async () => {
		const { gate } = await setup();
		await gate.approve(["CLM-001"], "founder");
		const task = await gate.proposeTask(draft);
		const before = gate.getEvents();
		await expect(gate.approveTasks([task.id, "TSK-999"], "founder")).rejects.toThrow();
		expect(gate.getEvents()).toEqual(before);
		await gate.approveTask(task.id, "founder");
		await gate.propose({
			...proposal,
			id: "PRP-002",
			ops: [{ op: "retire", target: "CLM-001", reason: "Project tracking is out of scope" }],
		});
		expect(gate.getTasks()[0].state).toBe("ready");
		await gate.approve(["CLM-002"], "founder");
		expect(gate.getClaim("CLM-001")?.state).toBe("rejected");
		expect(gate.getTasks()[0].state).toBe("blocked");
	});

	it("rejects late runner evidence after the approved task changes", async () => {
		let finish:
			| ((value: { exitCode: number; output: string; executedBy: string }) => void)
			| undefined;
		const runner = {
			run: () =>
				new Promise<{ exitCode: number; output: string; executedBy: string }>((resolve) => {
					finish = resolve;
				}),
		};
		const { gate } = await setup(runner);
		await gate.approve(["CLM-001"], "founder");
		const task = await gate.proposeTask(draft);
		await gate.approveTask(task.id, "founder");
		await gate.startTask(task.id);
		const running = gate.runChecks(task.id);
		await gate.proposeTask({ ...draft, title: "Revised task" }, task.id);
		if (!finish) throw new Error("Runner never started");
		finish({ exitCode: 0, output: "old test passed", executedBy: "test-runner" });
		await expect(running).rejects.toThrow("context changed");
		expect(gate.getTasks()[0].attempts[0].evidence).toHaveLength(0);
	});

	it("invalidates completed dependents when a prerequisite definition changes", async () => {
		const runner = {
			run: async () => ({ exitCode: 0, output: "passed", executedBy: "test-runner" }),
		};
		const { gate } = await setup(runner);
		await gate.approve(["CLM-001"], "founder");
		const first = await gate.proposeTask(draft);
		const second = await gate.proposeTask({ ...draft, dependsOn: [first.id] });
		await gate.approveTasks([first.id, second.id], "founder");
		for (const task of [first, second]) {
			await gate.startTask(task.id);
			await gate.runChecks(task.id);
			await gate.done(task.id);
		}
		await gate.proposeTask({ ...draft, title: "Improved project model" }, first.id);
		expect(gate.getTasks().find((t) => t.id === second.id)?.state).toBe("blocked");
		await gate.approveTask(first.id, "founder");
		await gate.startTask(first.id);
		await gate.runChecks(first.id);
		await gate.done(first.id);
		expect(gate.getTasks().find((t) => t.id === second.id)?.state).toBe("ready");
		await gate.startTask(second.id);
		await expect(gate.done(second.id)).rejects.toThrow("runner-verified");
	});
});
