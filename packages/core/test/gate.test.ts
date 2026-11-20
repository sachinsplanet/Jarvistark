import { describe, expect, it } from "vitest";
import {
	InMemoryStorage,
	JarvistarkGate,
	type Proposal,
	canonicalJson,
	contentHash,
	sha256,
	verifyLedgerChain,
} from "../src/index.js";

describe("pure SHA-256 hasher and canonical JSON", () => {
	it("hashes empty string matching standard SHA-256", () => {
		expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
		expect(contentHash("")).toBe(
			"sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
	});

	it("hashes sample text correctly", () => {
		expect(sha256("hello world")).toBe(
			"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
		);
	});

	it("sorts object keys canonically regardless of insertion order", () => {
		const objA = { z: 1, a: 2, m: { y: "test", b: true } };
		const objB = { a: 2, m: { b: true, y: "test" }, z: 1 };
		expect(canonicalJson(objA)).toBe(canonicalJson(objB));
		expect(canonicalJson(objA)).toBe('{"a":2,"m":{"b":true,"y":"test"},"z":1}');
	});
});

describe("JarvistarkGate in-memory lifecycle", () => {
	it("records original intake and establishes hash chain genesis", async () => {
		const storage = new InMemoryStorage();
		const gate = await JarvistarkGate.create(storage);

		const { intake, event } = await gate.recordIntake("linux version of app called wispr flow");

		expect(intake.originalText).toBe("linux version of app called wispr flow");
		expect(intake.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
		expect(event.type).toBe("intake.recorded");
		expect(event.prev).toBe("GENESIS");
		expect(event.hash).toMatch(/^sha256:[a-f0-9]{64}$/);

		const events = gate.getEvents();
		expect(events.length).toBe(1);
		expect(verifyLedgerChain(events).valid).toBe(true);
	});

	it("records clarification sessions and chains events", async () => {
		const storage = new InMemoryStorage();
		const gate = await JarvistarkGate.create(storage);

		await gate.recordIntake("dictation app");
		const event = await gate.recordClarification("SESS-001", {
			id: "Q1",
			text: "Where does speech-to-text happen?",
			answer: "Use cloud STT",
			answeredAt: "2026-10-17T05:46:00.000Z",
		});

		expect(event.type).toBe("clarification.recorded");
		const events = gate.getEvents();
		expect(events.length).toBe(2);
		expect(events[1].prev).toBe(events[0].hash);
		expect(verifyLedgerChain(events).valid).toBe(true);

		const intake = gate.getIntake();
		expect(intake?.clarifications.length).toBe(1);
		expect(intake?.clarifications[0].questions[0].answer).toBe("Use cloud STT");
	});

	it("rejects proposal when user-stated claim has no source", async () => {
		const storage = new InMemoryStorage();
		const gate = await JarvistarkGate.create(storage);

		const proposal: Proposal = {
			id: "PRP-001",
			planner: { role: "host-agent" },
			ops: [
				{
					op: "add",
					key: "$claim1",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Voice dictation on Linux",
						// Missing source!
					},
				},
			],
			createdAt: "2026-10-17T06:00:00.000Z",
		};

		const result = await gate.propose(proposal);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.length).toBe(1);
			expect(result.errors[0].code).toBe("SOURCE_REQUIRED");
		}
	});

	it("accepts valid proposal, mints sequential IDs, and appends to ledger", async () => {
		const storage = new InMemoryStorage();
		const gate = await JarvistarkGate.create(storage);

		await gate.recordIntake("linux voice dictation app");
		await gate.recordClarification("SESS-001", {
			id: "Q4",
			text: "Application shape?",
			answer: "Background daemon and tray",
			answeredAt: "2026-10-17T05:46:00.000Z",
		});

		const proposal: Proposal = {
			id: "PRP-001",
			planner: { role: "host-agent", id: "planner-agent" },
			ops: [
				{
					op: "add",
					key: "$a",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "App runs as background daemon with system tray icon",
						source: {
							type: "clarification",
							sessionId: "SESS-001",
							questionId: "Q4",
						},
					},
				},
				{
					op: "add",
					key: "$b",
					claim: {
						kind: "assumption",
						origin: "inferred",
						text: "V1 has no rate limiting or cost controls",
						risk: {
							level: "high",
							category: "financial",
							note: "Unbounded API cost risk",
						},
					},
				},
				{
					op: "link",
					from: "$b",
					to: "$a",
					rel: "constrains",
				},
			],
			createdAt: "2026-10-17T06:00:00.000Z",
		};

		const result = await gate.propose(proposal);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.minted.$a).toBe("CLM-001");
			expect(result.minted.$b).toBe("CLM-002");
			expect(result.event).toBe("EVT-003");
		}

		// Claims are in 'proposed' state
		const claims = gate.getClaims();
		expect(claims.length).toBe(2);
		expect(claims[0].state).toBe("proposed");
		expect(claims[1].state).toBe("proposed");

		// Ledger chain is unbroken
		expect(verifyLedgerChain(gate.getEvents()).valid).toBe(true);
	});

	it("approves claims, updates state, and handles supersession when revising", async () => {
		const storage = new InMemoryStorage();
		const gate = await JarvistarkGate.create(storage);

		await gate.recordIntake("dictation app");

		// 1. Propose CLM-001
		await gate.propose({
			id: "PRP-001",
			planner: { role: "host-agent" },
			ops: [
				{
					op: "add",
					key: "$a",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Use Deepgram cloud STT",
						source: {
							type: "input-span",
							input: "input/original.md",
							start: 0,
							end: 10,
						},
					},
				},
			],
			createdAt: "2026-10-17T06:00:00.000Z",
		});

		// 2. Approve CLM-001
		const approvalEvents = await gate.approve(["CLM-001"], "founder");
		expect(approvalEvents.length).toBe(1);
		expect(approvalEvents[0].type).toBe("approval.recorded");

		let clm1 = gate.getClaim("CLM-001");
		expect(clm1?.state).toBe("accepted");
		expect(clm1?.approval).toBe("EVT-003");

		// 3. Propose revision of CLM-001 (pluggable STT)
		const reviseResult = await gate.propose({
			id: "PRP-002",
			planner: { role: "host-agent" },
			ops: [
				{
					op: "revise",
					key: "$revised",
					target: "CLM-001",
					claim: {
						text: "Pluggable STT provider architecture with Deepgram as first implementation",
					},
				},
			],
			createdAt: "2026-10-17T06:10:00.000Z",
		});

		expect(reviseResult.ok).toBe(true);
		if (reviseResult.ok) {
			expect(reviseResult.minted.$revised).toBe("CLM-002");
		}

		const clm2 = gate.getClaim("CLM-002");
		expect(clm2?.state).toBe("proposed");
		expect(clm2?.supersedes).toBe("CLM-001");

		// 4. Approve CLM-002 -> CLM-001 becomes superseded
		const revApproval = await gate.approve(["CLM-002"], "founder");
		expect(revApproval.length).toBe(2); // approval.recorded + claim.superseded
		expect(revApproval[1].type).toBe("claim.superseded");

		clm1 = gate.getClaim("CLM-001");
		expect(clm1?.state).toBe("superseded");
		expect(clm1?.supersededBy).toBe("CLM-002");

		const clm2Accepted = gate.getClaim("CLM-002");
		expect(clm2Accepted?.state).toBe("accepted");

		// 5. Ledger chain remains unbroken through supersession
		expect(verifyLedgerChain(gate.getEvents()).valid).toBe(true);
	});

	it("rejects attempt to revise an already superseded claim", async () => {
		const storage = new InMemoryStorage();
		const gate = await JarvistarkGate.create(storage);

		await gate.recordIntake("app");
		await gate.propose({
			id: "PRP-001",
			planner: { role: "host-agent" },
			ops: [
				{
					op: "add",
					key: "$a",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "V1 requirement",
						source: { type: "input-span", input: "input/original.md", start: 0, end: 1 },
					},
				},
			],
			createdAt: "2026-10-17T06:00:00.000Z",
		});
		await gate.approve(["CLM-001"], "founder");

		// Supersede CLM-001 with CLM-002
		await gate.propose({
			id: "PRP-002",
			planner: { role: "host-agent" },
			ops: [{ op: "revise", key: "$b", target: "CLM-001", claim: { text: "V2" } }],
			createdAt: "2026-10-17T06:01:00.000Z",
		});
		await gate.approve(["CLM-002"], "founder");

		// Attempt to revise CLM-001 again
		const badRevise = await gate.propose({
			id: "PRP-003",
			planner: { role: "host-agent" },
			ops: [{ op: "revise", key: "$c", target: "CLM-001", claim: { text: "V3" } }],
			createdAt: "2026-10-17T06:02:00.000Z",
		});

		expect(badRevise.ok).toBe(false);
		if (!badRevise.ok) {
			expect(badRevise.errors[0].code).toBe("CANNOT_REVISE_SUPERSEDED");
		}
	});

	it("detects ledger tampering when an event is modified out-of-band", async () => {
		const storage = new InMemoryStorage();
		const gate = await JarvistarkGate.create(storage);

		await gate.recordIntake("original app idea");
		await gate.propose({
			id: "PRP-001",
			planner: { role: "host-agent" },
			ops: [
				{
					op: "add",
					key: "$a",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Core feature",
						source: { type: "input-span", input: "input/original.md", start: 0, end: 1 },
					},
				},
			],
			createdAt: "2026-10-17T06:00:00.000Z",
		});

		// Tamper with event 0
		const events = gate.getEvents();
		// Modify the inputHash
		(events[0] as unknown as { inputHash: string }).inputHash =
			"sha256:tampered_hash_value_that_breaks_chain";

		const verifyResult = verifyLedgerChain(events);
		expect(verifyResult.valid).toBe(false);
		expect(verifyResult.error).toContain("Tampered event content");
	});

	it("runs deterministic validation: flags blocking questions and task cycles", async () => {
		const storage = new InMemoryStorage();
		const gate = await JarvistarkGate.create(storage);

		await gate.recordIntake("app");

		// Add a proposed blocking question
		await gate.propose({
			id: "PRP-001",
			planner: { role: "host-agent" },
			ops: [
				{
					op: "add",
					key: "$q",
					claim: {
						kind: "question",
						origin: "inferred",
						text: "How to manage API costs at scale?",
						blocking: true,
						impact: "high",
					},
				},
				{
					op: "add",
					key: "$req",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Audio capture",
						source: { type: "input-span", input: "input/original.md", start: 0, end: 1 },
					},
				},
			],
			createdAt: "2026-10-17T06:00:00.000Z",
		});

		const task = await gate.proposeTask({
			title: "Task 1",
			needs: ["CLM-002"],
			dependsOn: [],
			checks: [{ command: "node --test", expect: "passes" }],
		});
		const second = await gate.proposeTask({
			title: "Task 2",
			needs: ["CLM-002"],
			dependsOn: [task.id],
			checks: [{ command: "node --test", expect: "passes" }],
		});
		await expect(
			gate.proposeTask(
				{
					title: "Task 1",
					needs: ["CLM-002"],
					dependsOn: [second.id],
					checks: [{ command: "node --test", expect: "passes" }],
				},
				task.id,
			),
		).rejects.toThrow("Cycle");
		const validation = await gate.validate();
		expect(validation.valid).toBe(false);
		expect(validation.findings.map((f) => f.code)).toContain("UNRESOLVED_BLOCKING_QUESTION");
	});
});
