import { describe, expect, it } from "vitest";
import {
	AddOp,
	Check,
	Claim,
	ClaimId,
	ClaimKind,
	ClaimLink,
	ClaimOrigin,
	ClaimState,
	type ClarificationSession,
	ContextBundle,
	DerivedArtifact,
	Intake,
	LedgerEvent,
	LinkOp,
	Profile,
	Proposal,
	ProposalResult,
	ProvisionalKey,
	RenderedDocument,
	RenderedPrompt,
	RetireOp,
	ReviseOp,
	Task,
	ValidationFinding,
	ValidationResult,
} from "../src/index.js";

describe("claims schema", () => {
	it("validates a claim with minimal required fields and applies defaults", () => {
		const raw = {
			id: "CLM-001",
			kind: "requirement",
			origin: "user-stated",
			state: "proposed",
			text: "Voice dictation on Linux desktop",
		};
		const parsed = Claim.parse(raw);
		expect(parsed.id).toBe("CLM-001");
		expect(parsed.supersedes).toBeNull();
		expect(parsed.supersededBy).toBeNull();
		expect(parsed.blocking).toBe(false);
	});

	it("validates a full claim with input-span source", () => {
		const raw = {
			id: "CLM-001",
			kind: "requirement",
			origin: "user-stated",
			state: "accepted",
			text: "Voice dictation app inspired by Wispr Flow",
			source: {
				type: "input-span",
				input: "input/original.md",
				start: 0,
				end: 45,
			},
			approval: "EVT-002",
			supersedes: null,
			supersededBy: null,
			blocking: false,
		};
		const result = Claim.safeParse(raw);
		expect(result.success).toBe(true);
	});

	it("validates a claim with clarification source (Gap #2 fix)", () => {
		const raw = {
			id: "CLM-002",
			kind: "requirement",
			origin: "user-stated",
			state: "accepted",
			text: "Audio is captured locally, streamed to backend server",
			source: {
				type: "clarification",
				sessionId: "SESS-001",
				questionId: "Q5",
			},
			blocking: false,
		};
		const result = Claim.safeParse(raw);
		expect(result.success).toBe(true);
	});

	it("validates a claim with observation source", () => {
		const raw = {
			id: "CLM-010",
			kind: "constraint",
			origin: "observed",
			state: "accepted",
			text: "System runs X11 display server",
			source: {
				type: "observation",
				file: "/etc/X11",
				evidence: "DISPLAY=:0 is present",
			},
		};
		const result = Claim.safeParse(raw);
		expect(result.success).toBe(true);
	});

	it("validates a claim with risk assessment (Gap #4 fix)", () => {
		const raw = {
			id: "CLM-014",
			kind: "requirement",
			origin: "user-stated",
			state: "accepted",
			text: "Context awareness from focused application",
			risk: {
				level: "high",
				category: "technical",
				note: "Reading text via AT-SPI is inconsistent across Linux desktop apps",
			},
		};
		const result = Claim.safeParse(raw);
		expect(result.success).toBe(true);
	});

	it("validates a question claim with blocking flag and impact", () => {
		const raw = {
			id: "CLM-028",
			kind: "question",
			origin: "inferred",
			state: "proposed",
			text: "How will API costs be managed at scale without auth?",
			blocking: true,
			impact: "high",
		};
		const parsed = Claim.parse(raw);
		expect(parsed.blocking).toBe(true);
		expect(parsed.impact).toBe("high");
	});

	it("rejects invalid ClaimId pattern", () => {
		const invalidIds = ["123", "CLM", "clm-001", "REQ-001", "CLM_001"];
		for (const id of invalidIds) {
			const res = ClaimId.safeParse(id);
			expect(res.success).toBe(false);
		}
	});

	it("accepts valid ClaimId pattern", () => {
		expect(ClaimId.safeParse("CLM-001").success).toBe(true);
		expect(ClaimId.safeParse("CLM-99999").success).toBe(true);
	});

	it("rejects empty text", () => {
		const res = Claim.safeParse({
			id: "CLM-001",
			kind: "requirement",
			origin: "user-stated",
			state: "proposed",
			text: "",
		});
		expect(res.success).toBe(false);
	});

	it("validates all ClaimKind enum values", () => {
		const kinds = ["requirement", "constraint", "assumption", "question", "decision"] as const;
		for (const kind of kinds) {
			expect(ClaimKind.safeParse(kind).success).toBe(true);
		}
		expect(ClaimKind.safeParse("unknown").success).toBe(false);
	});

	it("validates all ClaimOrigin enum values", () => {
		const origins = ["user-stated", "inferred", "recommended", "observed"] as const;
		for (const origin of origins) {
			expect(ClaimOrigin.safeParse(origin).success).toBe(true);
		}
		expect(ClaimOrigin.safeParse("external").success).toBe(false);
	});

	it("validates all ClaimState enum values", () => {
		const states = ["proposed", "accepted", "rejected", "superseded"] as const;
		for (const state of states) {
			expect(ClaimState.safeParse(state).success).toBe(true);
		}
		expect(ClaimState.safeParse("draft").success).toBe(false);
	});
});

describe("intake and clarification schema (Gap #3 fix)", () => {
	it("validates intake with original input text and sha256 hash", () => {
		const raw = {
			originalText: "linux version of app called wispr flow, basically a voice dictation app",
			hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			recordedAt: "2026-10-17T05:29:15.000Z",
		};
		const parsed = Intake.parse(raw);
		expect(parsed.originalText).toContain("wispr flow");
		expect(parsed.clarifications).toEqual([]);
	});

	it("validates intake containing clarification sessions", () => {
		const session: ClarificationSession = {
			id: "SESS-001",
			startedAt: "2026-10-17T05:30:00.000Z",
			questions: [
				{
					id: "Q1",
					text: "Where does speech-to-text happen?",
					options: [
						{ text: "Local model", recommended: false },
						{ text: "Cloud STT API", recommended: true },
					],
					recommendation: "Cloud STT API",
					answer: "Use a cloud speech-to-text API",
					rawAnswer: "Use a cloud speech-to-text API (Google, Deepgram, AssemblyAI, etc.)",
					answeredAt: "2026-10-17T05:46:32.000Z",
				},
				{
					id: "Q2",
					text: "Who provides the API keys?",
					answer: "i will provide api key, for every user will be billed from my api usage",
					answeredAt: "2026-10-17T05:51:10.000Z",
				},
			],
		};
		const raw = {
			originalText: "linux version of wispr flow",
			hash: "abc123hash",
			recordedAt: "2026-10-17T05:29:15.000Z",
			clarifications: [session],
		};
		const parsed = Intake.parse(raw);
		expect(parsed.clarifications.length).toBe(1);
		expect(parsed.clarifications[0].questions.length).toBe(2);
	});
});

describe("proposals schema", () => {
	it("validates ProvisionalKey regex pattern ($prefix)", () => {
		expect(ProvisionalKey.safeParse("$a").success).toBe(true);
		expect(ProvisionalKey.safeParse("$new_claim").success).toBe(true);
		expect(ProvisionalKey.safeParse("a").success).toBe(false);
		expect(ProvisionalKey.safeParse("CLM-001").success).toBe(false);
	});

	it("validates AddOp", () => {
		const op = {
			op: "add" as const,
			key: "$a",
			claim: {
				kind: "requirement" as const,
				origin: "user-stated" as const,
				text: "Global shortcut to activate dictation",
			},
		};
		expect(AddOp.safeParse(op).success).toBe(true);
	});

	it("validates ReviseOp targeting an existing claim", () => {
		const op = {
			op: "revise" as const,
			key: "$b",
			target: "CLM-007",
			claim: {
				text: "X11 support first, Wayland support in v2",
			},
		};
		expect(ReviseOp.safeParse(op).success).toBe(true);
	});

	it("validates RetireOp", () => {
		const op = {
			op: "retire" as const,
			target: "CLM-003",
			reason: "Superseded by client-server architecture",
		};
		expect(RetireOp.safeParse(op).success).toBe(true);
	});

	it("validates LinkOp with allowed relationships", () => {
		const rels = ["constrains", "depends-on", "implements", "blocks", "derives-from"] as const;
		for (const rel of rels) {
			const op = {
				op: "link" as const,
				from: "$a",
				to: "CLM-001",
				rel,
			};
			expect(LinkOp.safeParse(op).success).toBe(true);
		}
	});

	it("validates a full proposal with multiple ops", () => {
		const proposal = {
			id: "PRP-001",
			planner: {
				role: "host-agent" as const,
				id: "antigravity-planner",
			},
			ops: [
				{
					op: "add" as const,
					key: "$a",
					claim: {
						kind: "requirement" as const,
						origin: "user-stated" as const,
						text: "Linux voice dictation app",
					},
				},
				{
					op: "add" as const,
					key: "$b",
					claim: {
						kind: "assumption" as const,
						origin: "inferred" as const,
						text: "No rate limiting in v1",
						risk: {
							level: "high" as const,
							category: "financial" as const,
							note: "Unbounded API cost risk",
						},
					},
				},
				{
					op: "link" as const,
					from: "$b",
					to: "$a",
					rel: "constrains" as const,
				},
			],
			createdAt: "2026-10-17T06:00:00.000Z",
		};
		expect(Proposal.safeParse(proposal).success).toBe(true);
	});

	it("rejects a proposal with empty ops array", () => {
		const invalid = {
			id: "PRP-001",
			planner: { role: "host-agent" as const },
			ops: [],
			createdAt: "2026-10-17T06:00:00.000Z",
		};
		expect(Proposal.safeParse(invalid).success).toBe(false);
	});

	it("validates proposal accepted result with minted IDs", () => {
		const res = {
			ok: true as const,
			minted: { $a: "CLM-001", $b: "CLM-002" },
			event: "EVT-003",
		};
		expect(ProposalResult.safeParse(res).success).toBe(true);
	});

	it("validates proposal rejected result with machine-readable errors", () => {
		const res = {
			ok: false as const,
			errors: [
				{
					path: "ops[0].claim",
					code: "SOURCE_REQUIRED",
					message: "User-stated claims must point to a source span or clarification",
				},
			],
		};
		expect(ProposalResult.safeParse(res).success).toBe(true);
	});
});

describe("ledger schema (hash-chained append-only events)", () => {
	it("validates intake.recorded event", () => {
		const event = {
			id: "EVT-001",
			type: "intake.recorded" as const,
			prev: "GENESIS",
			hash: "sha256:genesis_hash",
			at: "2026-10-17T05:29:15.000Z",
			inputHash: "sha256:input_text_hash",
		};
		expect(LedgerEvent.safeParse(event).success).toBe(true);
	});

	it("validates clarification.recorded event", () => {
		const event = {
			id: "EVT-002",
			type: "clarification.recorded" as const,
			prev: "sha256:genesis_hash",
			hash: "sha256:event2_hash",
			at: "2026-10-17T05:46:32.000Z",
			sessionId: "SESS-001",
			questionId: "Q1",
			answer: "Use cloud STT",
		};
		expect(LedgerEvent.safeParse(event).success).toBe(true);
	});

	it("validates proposal.recorded event with minted map", () => {
		const event = {
			id: "EVT-003",
			type: "proposal.recorded" as const,
			prev: "sha256:event2_hash",
			hash: "sha256:event3_hash",
			at: "2026-10-17T06:00:00.000Z",
			proposal: "PRP-001",
			minted: { $a: "CLM-001" },
		};
		expect(LedgerEvent.safeParse(event).success).toBe(true);
	});

	it("validates approval.recorded event", () => {
		const event = {
			id: "EVT-004",
			type: "approval.recorded" as const,
			prev: "sha256:event3_hash",
			hash: "sha256:event4_hash",
			at: "2026-10-17T06:05:00.000Z",
			claims: ["CLM-001", "CLM-002"],
			by: "founder",
		};
		expect(LedgerEvent.safeParse(event).success).toBe(true);
	});

	it("validates rejection.recorded event", () => {
		const event = {
			id: "EVT-005",
			type: "rejection.recorded" as const,
			prev: "sha256:event4_hash",
			hash: "sha256:event5_hash",
			at: "2026-10-17T06:06:00.000Z",
			claims: ["CLM-003"],
			by: "founder",
			reason: "Out of scope for v1",
		};
		expect(LedgerEvent.safeParse(event).success).toBe(true);
	});

	it("validates claim.superseded event", () => {
		const event = {
			id: "EVT-006",
			type: "claim.superseded" as const,
			prev: "sha256:event5_hash",
			hash: "sha256:event6_hash",
			at: "2026-10-17T06:07:00.000Z",
			claim: "CLM-001",
			by: "CLM-010",
		};
		expect(LedgerEvent.safeParse(event).success).toBe(true);
	});

	it("validates claim.retired event", () => {
		const event = {
			id: "EVT-007",
			type: "claim.retired" as const,
			prev: "sha256:event6_hash",
			hash: "sha256:event7_hash",
			at: "2026-10-17T06:08:00.000Z",
			claim: "CLM-003",
			reason: "No longer needed",
		};
		expect(LedgerEvent.safeParse(event).success).toBe(true);
	});

	it("validates link.recorded event", () => {
		const event = {
			id: "EVT-008",
			type: "link.recorded" as const,
			prev: "sha256:event7_hash",
			hash: "sha256:event8_hash",
			at: "2026-10-17T06:09:00.000Z",
			from: "CLM-002",
			to: "CLM-001",
			rel: "implements",
		};
		expect(LedgerEvent.safeParse(event).success).toBe(true);
	});
});

describe("checks and tasks schema (pull with evidence)", () => {
	it("validates Check without result (pending check)", () => {
		const check = {
			id: "CHK-001-1",
			command: "python -m pytest tests/test_audio.py",
			expect: "exit code 0",
		};
		const parsed = Check.parse(check);
		expect(parsed.result).toBeUndefined();
	});

	it("validates Check with self-reported result", () => {
		const check = {
			id: "CHK-001-1",
			command: "python -m pytest tests/test_audio.py",
			expect: "exit code 0",
			result: {
				status: "passed" as const,
				attestation: "self-reported" as const,
				evidence: "evidence/TSK-001/CHK-001-1.txt",
				at: "2026-10-17T07:00:00.000Z",
				output: "3 passed in 0.42s",
			},
		};
		expect(Check.safeParse(check).success).toBe(true);
	});

	it("validates Task with checks and dependencies", () => {
		const task = {
			id: "TSK-001",
			title: "Implement microphone audio capture with PortAudio",
			needs: ["CLM-002", "CLM-022"],
			dependsOn: [],
			checks: [
				{
					id: "CHK-001-1",
					command: "python -m pytest tests/test_capture.py",
					expect: "exit code 0",
				},
			],
			state: "ready" as const,
		};
		const parsed = Task.parse(task);
		expect(parsed.state).toBe("ready");
		expect(parsed.needs.length).toBe(2);
	});
});

describe("validate schema", () => {
	it("validates ValidationFinding with error severity", () => {
		const finding = {
			code: "CYCLE_DETECTED",
			severity: "error" as const,
			message: "Circular dependency detected between TSK-001 and TSK-002",
			path: "tasks[0].dependsOn",
		};
		expect(ValidationFinding.safeParse(finding).success).toBe(true);
	});

	it("validates ValidationResult", () => {
		const result = {
			valid: false,
			findings: [
				{
					code: "UNRESOLVED_BLOCKING_QUESTION",
					severity: "error" as const,
					message: "CLM-028 is a blocking question that has not been answered",
					claimId: "CLM-028",
				},
			],
		};
		expect(ValidationResult.safeParse(result).success).toBe(true);
	});
});

describe("profiles schema (Gap #5 fix: optional profiles)", () => {
	it("validates profile declaration", () => {
		const profile = {
			id: "accounts-database",
			version: "0.1.0",
			supports: ["email login", "social login", "file and image uploads"],
			declines: [
				"payments",
				"multiple user roles",
				"third-party API integrations",
				"real-time features and notifications",
			],
			intake: "intake.json",
			rules: ["Every protected resource must declare an auth requirement"],
		};
		expect(Profile.safeParse(profile).success).toBe(true);
	});
});

describe("graph, context, and render schemas", () => {
	it("validates ClaimLink", () => {
		const link = {
			from: "CLM-002",
			to: "CLM-001",
			rel: "implements",
		};
		expect(ClaimLink.safeParse(link).success).toBe(true);
	});

	it("validates DerivedArtifact tracking staleness via input claim hashes", () => {
		const artifact = {
			id: "ART-DOC-001",
			type: "document" as const,
			inputHashes: {
				"CLM-001": "sha256:hash1",
				"CLM-002": "sha256:hash2",
			},
			builtAt: "2026-10-17T06:15:00.000Z",
			stale: false,
		};
		expect(DerivedArtifact.safeParse(artifact).success).toBe(true);
	});

	it("validates ContextBundle for task prompt generation", () => {
		const bundle = {
			taskId: "TSK-001",
			claims: [{ id: "CLM-001", text: "sample" }],
			links: [],
			sizeBudget: 4000,
			actualSize: 1250,
			truncated: false,
		};
		expect(ContextBundle.safeParse(bundle).success).toBe(true);
	});

	it("validates RenderedDocument with content-hash", () => {
		const doc = {
			path: "docs/plan/brief.md",
			content: "# Project Brief\nVoice dictation on Linux",
			contentHash: "sha256:content_hash_123",
			sourceClaimIds: ["CLM-001", "CLM-002"],
			renderedAt: "2026-10-17T06:20:00.000Z",
		};
		expect(RenderedDocument.safeParse(doc).success).toBe(true);
	});

	it("validates RenderedPrompt with content-hash", () => {
		const prompt = {
			taskId: "TSK-001",
			content: "Implement audio capture...",
			contentHash: "sha256:prompt_hash_456",
			renderedAt: "2026-10-17T06:20:00.000Z",
		};
		expect(RenderedPrompt.safeParse(prompt).success).toBe(true);
	});
});

describe("hand-run experiment verification (E2E claim synthesis)", () => {
	it("successfully models the Wispr Flow Linux hand-run claims and proposal", () => {
		// 1. CLM-001 from original input
		const clm001 = Claim.parse({
			id: "CLM-001",
			kind: "requirement",
			origin: "user-stated",
			state: "accepted",
			text: "The app is a Linux desktop voice dictation tool inspired by Wispr Flow",
			source: {
				type: "input-span",
				input: "input/original.md",
				start: 0,
				end: 72,
			},
			approval: "EVT-004",
		});

		// 2. CLM-002 from clarification question Q5
		const clm002 = Claim.parse({
			id: "CLM-002",
			kind: "requirement",
			origin: "user-stated",
			state: "accepted",
			text: "Audio is captured locally, streamed to backend server for STT + LLM processing",
			source: {
				type: "clarification",
				sessionId: "SESS-001",
				questionId: "Q5",
			},
			approval: "EVT-004",
		});

		// 3. CLM-014 with technical risk assessment
		const clm014 = Claim.parse({
			id: "CLM-014",
			kind: "requirement",
			origin: "user-stated",
			state: "accepted",
			text: "Context awareness (before_text, after_text, app name) is required in v1",
			source: {
				type: "clarification",
				sessionId: "SESS-001",
				questionId: "Q15",
			},
			risk: {
				level: "high",
				category: "technical",
				note: "Context capture on Linux via AT-SPI/X11 is unreliable across apps",
			},
			approval: "EVT-004",
		});

		// 4. CLM-024 assumption with financial risk
		const clm024 = Claim.parse({
			id: "CLM-024",
			kind: "assumption",
			origin: "inferred",
			state: "proposed",
			text: "V1 has no usage-based billing, rate limiting, or cost controls for end users",
			risk: {
				level: "high",
				category: "financial",
				note: "Unbounded API cost risk because developer pays for all usage",
			},
		});

		// 5. CLM-028 blocking question
		const clm028 = Claim.parse({
			id: "CLM-028",
			kind: "question",
			origin: "inferred",
			state: "proposed",
			text: "How will API costs be managed at scale without user auth or rate limits?",
			blocking: true,
			impact: "high",
		});

		expect(clm001.id).toBe("CLM-001");
		expect(clm002.source?.type).toBe("clarification");
		expect(clm014.risk?.level).toBe("high");
		expect(clm024.state).toBe("proposed");
		expect(clm028.blocking).toBe(true);

		// Proposal that encapsulates the planner's patch
		const proposal = Proposal.parse({
			id: "PRP-001",
			planner: { role: "host-agent", id: "antigravity" },
			ops: [
				{
					op: "add",
					key: "$a",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: clm001.text,
						source: clm001.source,
					},
				},
				{
					op: "add",
					key: "$b",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: clm002.text,
						source: clm002.source,
					},
				},
				{
					op: "link",
					from: "$b",
					to: "$a",
					rel: "implements",
				},
			],
			createdAt: "2026-10-17T06:00:00.000Z",
		});

		expect(proposal.ops.length).toBe(3);
	});
});
