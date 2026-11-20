import { z } from "zod";
import type { TaskState } from "./checks/schema.js";
import { ClarificationQuestion, Intake } from "./claims/intake.js";
import { type Claim, Claim as ClaimSchema } from "./claims/schema.js";
import { executionIssues } from "./context/execution.js";
import type { ClaimLink } from "./graph/schema.js";
import { canonicalJson, computeEventHash, verifyLedgerChain } from "./ledger/chain.js";
import { contentHash } from "./ledger/hasher.js";
import { IdMinter } from "./ledger/mint.js";
import { LedgerEvent } from "./ledger/schema.js";
import type { RunnerPort, StoragePort } from "./ports/storage.js";
import { WorkspaceChangedError } from "./ports/storage.js";
import { Proposal, type ProposalError, type ProposalResult } from "./proposals/schema.js";
import { finishPrompt, renderTaskPrompt } from "./render/prompts.js";
import { type PromptHost, PromptKind, type PromptOptions } from "./render/schema.js";
import { validateConsistency, validateProposal } from "./validate/rules.js";
import type { ValidationResult } from "./validate/schema.js";
import {
	CheckEvidence,
	TaskDraft,
	type WorkTask,
	WorkspaceData,
	clone,
	emptyWorkspace,
} from "./workspace.js";

type EventInput<T = LedgerEvent> = T extends LedgerEvent
	? Omit<T, "id" | "prev" | "hash" | "snapshot">
	: never;
function required<T>(value: T | undefined | null): T {
	if (value === undefined || value === null)
		throw new Error("Required workspace record is missing");
	return value;
}
const now = () => new Date().toISOString();
const hash = (value: unknown) => contentHash(canonicalJson(clone(value)));
const unique = (ids: string[], label: string) => {
	if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label}`);
};
const identity = (by: string) => z.string().trim().min(1).parse(by);

export function claimContentHash(claim: Claim): string {
	const { state: _state, approval: _approval, supersededBy: _supersededBy, ...content } = claim;
	return hash(content);
}

function taskDefinition(task: WorkTask) {
	return {
		id: task.id,
		revision: task.revision,
		title: task.title,
		needs: task.needs,
		dependsOn: task.dependsOn,
		checks: task.checks.map(({ result: _result, ...check }) => check),
		...(task.execution ? { execution: task.execution } : {}),
	};
}

function unavailableInputs(claims: Claim[]): string[] {
	return claims
		.filter((claim) => claim.state !== "accepted" || claim.kind === "question")
		.map((claim) =>
			claim.supersededBy ? `${claim.id} (replaced by ${claim.supersededBy})` : claim.id,
		);
}

/** A single authoritative gate. Shells cannot write claims/tasks independently.
 * Transactions are prepared on a copy; memory changes only after atomic storage.
 * Approval identities are attestations supplied by a human-facing shell. The shell
 * must enforce its human approval boundary (the CLI uses interactive review). */
export class JarvistarkGate {
	private committing = false;
	private constructor(
		private storage: StoragePort,
		private data: WorkspaceData,
		private events: LedgerEvent[],
		private runner?: RunnerPort,
	) {}

	static async create(storage: StoragePort, runner?: RunnerPort): Promise<JarvistarkGate> {
		const events = z.array(LedgerEvent).parse(await storage.readEvents());
		const chain = verifyLedgerChain(events);
		if (!chain.valid) throw new Error(chain.error);
		unique(
			events.map((e) => e.id),
			"event ID",
		);
		if (events.some((e, i) => e.id !== `EVT-${String(i + 1).padStart(3, "0")}`)) {
			throw new Error("Event IDs must be sequential");
		}
		if (events.length && !events.at(-1)?.snapshot) {
			throw new Error(
				"Incomplete or legacy ledger: no committed snapshot; import requires migration",
			);
		}
		const data = WorkspaceData.parse(events.at(-1)?.snapshot ?? emptyWorkspace());
		const gate = new JarvistarkGate(storage, clone(data), clone(events), runner);
		gate.assertIntegrity();
		return gate;
	}

	private assertIntegrity() {
		unique(
			this.data.claims.map((c) => c.id),
			"claim ID",
		);
		unique(
			this.data.tasks.map((t) => t.id),
			"task ID",
		);
		unique(
			this.data.proposals.map((p) => p.id),
			"proposal ID",
		);
		const intake = this.data.intake;
		if (intake && intake.hash !== contentHash(intake.originalText))
			throw new Error("Original input hash mismatch");
		const intakeEvents = this.events.filter((e) => e.type === "intake.recorded");
		if (intake && (intakeEvents.length !== 1 || intakeEvents[0].inputHash !== intake.hash)) {
			throw new Error("Original input does not match its intake event");
		}
		for (const claim of this.data.claims) {
			if (claim.state === "accepted" || claim.state === "superseded") {
				const approval = this.events.find((e) => e.id === claim.approval);
				if (
					approval?.type !== "approval.recorded" ||
					!approval.claims.includes(claim.id) ||
					approval.claimHashes?.[claim.id] !== claimContentHash(claim)
				) {
					throw new Error(`Claim ${claim.id} does not match approved content`);
				}
			}
		}
		for (const task of this.data.tasks) {
			if (task.approval && task.approval.hash !== hash(taskDefinition(task))) {
				throw new Error(`Task ${task.id} does not match approved content`);
			}
		}
	}

	private minter() {
		return IdMinter.fromExisting({ ...this.data, events: this.events });
	}

	get ledgerHead() {
		return this.events.at(-1)?.hash ?? "GENESIS";
	}

	requireHead(reviewedHead: string) {
		if (reviewedHead !== this.ledgerHead) throw new WorkspaceChangedError();
	}

	private async commit(data: WorkspaceData, inputs: EventInput[]): Promise<LedgerEvent[]> {
		if (this.committing)
			throw new Error("Another operation is committing; retry after it completes");
		this.committing = true;
		try {
			const snapshot = WorkspaceData.parse(clone(data));
			const minter = this.minter();
			let prev = this.events.at(-1)?.hash ?? "GENESIS";
			const expectedHead = prev;
			const batch = inputs.map((input, index) => {
				const body = clone({
					...input,
					id: minter.mintEventId(),
					prev,
					...(index === inputs.length - 1 ? { snapshot } : {}),
				});
				const event = LedgerEvent.parse({ ...body, hash: computeEventHash(body) });
				prev = event.hash;
				return event;
			});
			if (!batch.length) throw new Error("Empty transaction");
			await this.storage.commitEvents(expectedHead, clone(batch));
			this.data = clone(snapshot);
			this.events.push(...clone(batch));
			return clone(batch);
		} finally {
			this.committing = false;
		}
	}

	async recordIntake(originalText: string, at = now()) {
		if (this.data.intake)
			throw new Error("Original input is immutable; use a proposal to change intent");
		const intake = Intake.parse({
			originalText,
			hash: contentHash(originalText),
			recordedAt: at,
			clarifications: [],
		});
		const data = clone(this.data);
		data.intake = intake;
		const [event] = await this.commit(data, [
			{ type: "intake.recorded", inputHash: intake.hash, at },
		]);
		return { intake: clone(intake), event };
	}

	async recordClarification(sessionId: string, raw: unknown, at = now()) {
		const question = ClarificationQuestion.parse(raw);
		const data = clone(this.data);
		if (!data.intake) throw new Error("Record intake before clarifications");
		identity(sessionId);
		let session = data.intake.clarifications.find((s) => s.id === sessionId);
		if (!session) {
			session = { id: sessionId, startedAt: at, questions: [] };
			data.intake.clarifications.push(session);
		}
		const existing = session.questions.find((q) => q.id === question.id);
		if (existing) {
			if (existing.answer === question.answer && existing.text === question.text) {
				return clone(
					required(
						this.events.findLast(
							(e) =>
								e.type === "clarification.recorded" &&
								e.sessionId === sessionId &&
								e.questionId === question.id,
						),
					),
				);
			}
			throw new Error(
				"Clarification answers are immutable; record the new answer under a new question ID",
			);
		}
		session.questions.push(question);
		return (
			await this.commit(data, [
				{
					type: "clarification.recorded",
					sessionId,
					questionId: question.id,
					answer: question.answer,
					at,
				},
			])
		)[0];
	}

	private sourceErrors(
		claim: { origin: string; source?: Claim["source"] },
		path: string,
	): ProposalError[] {
		const source = claim.source;
		if (!source) return [];
		let valid = true;
		if (source.type === "input-span") {
			valid =
				!!this.data.intake &&
				["input/original.md", ".jarvistark/input/original.md"].includes(source.input) &&
				source.start < source.end &&
				source.end <= this.data.intake.originalText.length;
		} else if (source.type === "clarification") {
			valid = !!this.data.intake?.clarifications
				.find((s) => s.id === source.sessionId)
				?.questions.find((q) => q.id === source.questionId);
		} else if (claim.origin === "user-stated") valid = false;
		return valid
			? []
			: [
					{
						path,
						code: "INVALID_SOURCE",
						message:
							"Source must reference recorded input or a recorded clarification; observations cannot substantiate user-stated claims",
					},
				];
	}

	async propose(raw: unknown, at = now()): Promise<ProposalResult> {
		const parsed = Proposal.safeParse(raw);
		if (!parsed.success)
			return {
				ok: false,
				errors: parsed.error.issues.map((i) => ({
					path: i.path.join("."),
					code: "INVALID_SCHEMA",
					message: i.message,
				})),
			};
		const proposal = parsed.data;
		const claims = new Map(this.data.claims.map((c) => [c.id, c]));
		const errors = validateProposal(proposal, claims);
		if (this.data.proposals.some((p) => p.id === proposal.id))
			errors.push({
				path: "id",
				code: "DUPLICATE_PROPOSAL",
				message: "Proposal ID already exists",
			});
		const keys = new Set<string>();
		const targets = new Set<string>();
		for (const [i, op] of proposal.ops.entries()) {
			if (op.op === "link" && !op.from.startsWith("$") && !op.to.startsWith("$"))
				errors.push({
					path: `ops.${i}`,
					code: "LINK_APPROVAL_REQUIRED",
					message: "A link must be anchored to a new proposed claim so its acceptance is reviewed",
				});
			if (op.op === "add" || op.op === "revise") {
				if (keys.has(op.key))
					errors.push({
						path: `ops.${i}.key`,
						code: "DUPLICATE_KEY",
						message: "Provisional keys must be unique",
					});
				keys.add(op.key);
				const origin = op.op === "add" ? op.claim.origin : (op.claim.origin ?? "recommended");
				errors.push(...this.sourceErrors({ ...op.claim, origin }, `ops.${i}.claim.source`));
				if (op.op === "revise" && origin === "user-stated" && !op.claim.source)
					errors.push({
						path: `ops.${i}`,
						code: "SOURCE_REQUIRED",
						message: "A user-stated revision needs its own source",
					});
			}
			if (op.op === "revise" || op.op === "retire") {
				if (targets.has(op.target))
					errors.push({
						path: `ops.${i}`,
						code: "DUPLICATE_TARGET",
						message: "Only one change per target in a proposal",
					});
				targets.add(op.target);
				const target = claims.get(op.target);
				if (target?.state === "rejected")
					errors.push({
						path: `ops.${i}`,
						code: "REJECTED_TARGET",
						message: "Cannot change a rejected claim",
					});
				if (op.op === "retire" && target?.state !== "accepted")
					errors.push({
						path: `ops.${i}`,
						code: "INVALID_RETIREMENT",
						message: "Only accepted claims can be retired",
					});
			}
		}
		if (errors.length) return { ok: false, errors };
		if (!this.data.intake)
			return {
				ok: false,
				errors: [{ path: "intake", code: "INTAKE_REQUIRED", message: "Record intake first" }],
			};
		const data = clone(this.data);
		const minted: Record<string, string> = {};
		const minter = this.minter();
		for (const [i, op] of proposal.ops.entries()) {
			if (op.op === "link") continue;
			const key = op.op === "retire" ? `$retire_${i}` : op.key;
			if (keys.has(key) && op.op === "retire")
				return {
					ok: false,
					errors: [
						{
							path: "ops",
							code: "RESERVED_KEY",
							message: "Retirement key conflicts with provisional key",
						},
					],
				};
			const id = minter.mintClaimId();
			minted[key] = id;
			if (op.op === "add")
				data.claims.push(ClaimSchema.parse({ ...op.claim, id, state: "proposed" }));
			if (op.op === "revise") {
				const target = required(claims.get(op.target));
				data.claims.push(
					ClaimSchema.parse({
						kind: target.kind,
						text: target.text,
						blocking: target.blocking,
						impact: target.impact,
						risk: target.risk,
						...op.claim,
						origin: op.claim.origin ?? "recommended",
						id,
						state: "proposed",
						supersedes: target.id,
					}),
				);
			}
			if (op.op === "retire")
				data.claims.push(
					ClaimSchema.parse({
						id,
						state: "proposed",
						kind: "decision",
						origin: "recommended",
						text: op.reason,
						retires: op.target,
					}),
				);
		}
		data.proposals.push(proposal);
		const inputs: EventInput[] = [{ type: "proposal.recorded", proposal: proposal.id, minted, at }];
		for (const op of proposal.ops) {
			if (op.op !== "link") continue;
			const link = { from: minted[op.from] ?? op.from, to: minted[op.to] ?? op.to, rel: op.rel };
			data.links.push(link);
			inputs.push({ type: "link.recorded", ...link, at });
		}
		const events = await this.commit(data, inputs);
		return { ok: true, minted, event: events[0].id };
	}

	async approve(claimIds: string[], by: string, at = now()): Promise<LedgerEvent[]> {
		identity(by);
		unique(claimIds, "claim ID");
		if (!claimIds.length) throw new Error("Select claims to approve");
		const data = clone(this.data);
		const selected = claimIds.map((id) => {
			const claim = data.claims.find((c) => c.id === id);
			if (!claim || claim.state !== "proposed")
				throw new Error(`Cannot approve ${id}: claim must be proposed`);
			if (claim.kind === "question")
				throw new Error(
					"Resolve a question by proposing an answer as a decision, or reject it with a reason",
				);
			return claim;
		});
		unique(
			selected.flatMap((c) => (c.supersedes ? [c.supersedes] : c.retires ? [c.retires] : [])),
			"revision target",
		);
		const approvalId = this.minter().mintEventId();
		const inputs: EventInput[] = [
			{
				type: "approval.recorded",
				reviewedHead: this.ledgerHead,
				claims: claimIds,
				by,
				at,
				claimHashes: Object.fromEntries(selected.map((c) => [c.id, claimContentHash(c)])),
			},
		];
		for (const claim of selected) {
			const targetId = claim.supersedes ?? claim.retires;
			if (targetId) {
				const target = required(data.claims.find((c) => c.id === targetId));
				if (!["proposed", "accepted"].includes(target.state) || claimIds.includes(targetId))
					throw new Error("Revision target has changed; propose a new revision");
				if (claim.retires) {
					target.state = "rejected";
					inputs.push({ type: "claim.retired", claim: target.id, reason: claim.text, at });
				} else {
					// A superseded unaccepted question has no approval; keep it rejected.
					target.state = target.approval ? "superseded" : "rejected";
					target.supersededBy = claim.id;
					inputs.push({ type: "claim.superseded", claim: target.id, by: claim.id, at });
				}
			}
			claim.state = "accepted";
			claim.approval = approvalId;
		}
		return this.commit(data, inputs);
	}

	async reject(claimIds: string[], by: string, reason = "Rejected by reviewer", at = now()) {
		identity(by);
		identity(reason);
		unique(claimIds, "claim ID");
		if (!claimIds.length) throw new Error("Select claims to reject");
		const data = clone(this.data);
		for (const id of claimIds) {
			const claim = data.claims.find((c) => c.id === id);
			if (!claim || claim.state !== "proposed")
				throw new Error(`Cannot reject ${id}: claim must be proposed`);
			claim.state = "rejected";
		}
		return (
			await this.commit(data, [
				{
					type: "rejection.recorded",
					claims: claimIds,
					by,
					reason,
					at,
					reviewedHead: this.ledgerHead,
				},
			])
		)[0];
	}

	async proposeTask(raw: unknown, reviseId?: string, at = now()): Promise<WorkTask> {
		const draft = TaskDraft.parse(raw);
		unique(draft.needs, "task claim");
		unique(draft.dependsOn, "dependency");
		for (const item of draft.execution?.environment.prerequisites ?? []) {
			if (item.setupTask && !draft.dependsOn.includes(item.setupTask))
				throw new Error(`Setup task ${item.setupTask} must appear in dependsOn`);
		}
		const data = clone(this.data);
		const old = reviseId ? data.tasks.find((t) => t.id === reviseId) : undefined;
		if (reviseId && !old) throw new Error(`Missing task ${reviseId}`);
		const id = old?.id ?? this.minter().mintTaskId();
		const revision = (old?.revision ?? 0) + 1;
		const task: WorkTask = {
			...draft,
			id,
			revision,
			attempts: old?.attempts ?? [],
			checks: draft.checks.map((c, i) => ({ ...c, id: `CHK-${id.slice(4)}-${revision}-${i + 1}` })),
		};
		data.tasks = [...data.tasks.filter((t) => t.id !== id), task];
		const result = validateConsistency(
			new Map(data.claims.map((c) => [c.id, c])),
			data.tasks.map((t) => ({ ...t, state: "blocked" as const })),
		);
		const invalid = result.findings.filter((f) => f.code.startsWith("TASK_"));
		if (invalid.length) throw new Error(invalid.map((f) => f.message).join("; "));
		await this.commit(data, [{ type: "task.proposed", task: id, at }]);
		return clone(task);
	}

	async approveTask(id: string, by: string, at = now()) {
		return (await this.approveTasks([id], by, at))[0];
	}

	async approveTasks(ids: string[], by: string, at = now()) {
		identity(by);
		unique(ids, "task ID");
		if (!ids.length) throw new Error("Select tasks to approve");
		const data = clone(this.data);
		const inputs: EventInput[] = [];
		for (const id of ids) {
			const task = data.tasks.find((t) => t.id === id);
			if (!task || task.approval) throw new Error("Task must exist and await approval");
			const unavailable = unavailableInputs(this.taskClaims(task));
			if (unavailable.length)
				throw new Error(
					`Task inputs must be accepted before task approval: ${unavailable.join(", ")}`,
				);
			task.approval = { by, at, hash: hash(taskDefinition(task)) };
			inputs.push({ type: "task.approved", task: id, by, at, reviewedHead: this.ledgerHead });
		}
		return this.commit(data, inputs);
	}

	private linkExistedAtApproval(link: ClaimLink, approvalId: string | undefined): boolean {
		for (const event of this.events) {
			if (event.id === approvalId) break;
			if (
				event.type === "link.recorded" &&
				event.from === link.from &&
				event.to === link.to &&
				event.rel === link.rel
			)
				return true;
		}
		return false;
	}

	private taskClaims(task: WorkTask): Claim[] {
		const claims = new Map(this.data.claims.map((claim) => [claim.id, claim]));
		const ids = new Set(task.needs);
		// Dependency/derivation edges point to inputs; constraints point at their subject.
		let changed = true;
		while (changed) {
			changed = false;
			for (const link of this.data.links) {
				const source = claims.get(link.from);
				const target = claims.get(link.to);
				if (source?.state !== "accepted" || !target) continue;
				let add: string | undefined;
				if (
					target.state === "accepted" &&
					["constrains", "blocks"].includes(link.rel) &&
					ids.has(link.to)
				)
					add = link.from;
				// Keep reviewed dependencies visible even after their input is superseded or retired.
				// A later proposed link to a new draft takes effect when that draft is accepted.
				if (
					["depends-on", "derives-from", "implements"].includes(link.rel) &&
					ids.has(link.from) &&
					(target.approval || this.linkExistedAtApproval(link, source.approval))
				)
					add = link.to;
				if (add && !ids.has(add)) {
					ids.add(add);
					changed = true;
				}
			}
		}
		return [...ids].sort().map((id) => {
			const claim = claims.get(id);
			if (!claim) throw new Error(`Missing claim ${id}`);
			return claim;
		});
	}

	private contextHash(task: WorkTask): string {
		return hash({
			definition: taskDefinition(task),
			claims: this.taskClaims(task).map((c) => ({
				id: c.id,
				hash: claimContentHash(c),
				state: c.state,
			})),
			dependencies: task.dependsOn.map((id) => {
				const dep = required(this.data.tasks.find((t) => t.id === id));
				return { id, revision: dep.revision, attempt: dep.attempts.at(-1) };
			}),
		});
	}

	private blockers(task: WorkTask, visiting = new Set<string>()): string[] {
		if (visiting.has(task.id)) return ["Task dependency cycle"];
		visiting.add(task.id);
		const reasons: string[] = [];
		if (!task.approval) reasons.push("Task awaits approval");
		const unavailable = unavailableInputs(this.taskClaims(task));
		if (unavailable.length)
			reasons.push(`Required claims are not all accepted/current: ${unavailable.join(", ")}`);
		if (
			this.data.claims.some(
				(c) => c.kind === "question" && c.blocking && ["proposed", "accepted"].includes(c.state),
			)
		)
			reasons.push("Blocking questions remain unresolved");
		for (const id of task.dependsOn) {
			const dep = this.data.tasks.find((t) => t.id === id);
			if (
				!dep ||
				this.blockers(dep, new Set(visiting)).length ||
				!dep.attempts.at(-1)?.completedAt ||
				dep.attempts.at(-1)?.contextHash !== this.contextHash(dep)
			)
				reasons.push(`Dependency ${id} is not complete/current`);
		}
		return reasons;
	}

	getTasks() {
		return this.data.tasks.map((t) => {
			const task = clone(t);
			let state: TaskState;
			const blockedReasons = this.blockers(t);
			const attempt = t.attempts.at(-1);
			const stale = !!attempt && attempt.contextHash !== this.contextHash(t);
			if (stale)
				blockedReasons.push(
					"Previous attempt used an older specification; start a new attempt when ready",
				);
			if (this.blockers(t).length) state = "blocked";
			else if (!attempt || stale) state = "ready";
			else if (attempt.completedAt) state = "done";
			else if (
				task.checks.some(
					(c) => (attempt.evidence.findLast((e) => e.checkId === c.id)?.exitCode ?? 0) !== 0,
				)
			)
				state = "failed";
			else state = "in-progress";
			for (const check of task.checks) {
				const evidence = !stale
					? attempt?.evidence.findLast((e) => e.checkId === check.id)
					: undefined;
				check.result = evidence
					? {
							status: evidence.exitCode === 0 ? "passed" : "failed",
							attestation: evidence.attestation,
							at: evidence.at,
							evidence: evidence.executedBy,
							output: evidence.output,
						}
					: undefined;
			}
			return { ...task, state, blockedReasons, stale };
		});
	}

	private nextTask(tasks = this.getTasks()) {
		return (
			tasks.find((t) => t.state === "in-progress") ??
			tasks.find((t) => ["ready", "failed"].includes(t.state))
		);
	}

	next(options: PromptOptions = {}) {
		const task = this.nextTask();
		return task ? { task, prompt: this.compilePrompt(task.id, options).content } : null;
	}

	renderPrompt(id: string, sizeBudget = 32000): string {
		return this.compilePrompt(id, { sizeBudget }).content;
	}

	compilePrompt(id: string, options: PromptOptions = {}) {
		return this.taskPrompt(id, options);
	}

	private taskPrompt(id: string, options: PromptOptions, dispatchId?: string) {
		if (options.kind) PromptKind.parse(options.kind);
		const task = this.data.tasks.find((t) => t.id === id);
		if (!task) throw new Error(`Missing task ${id}`);
		const reasons = this.blockers(task);
		if (reasons.length) throw new Error(reasons.join("; "));
		return renderTaskPrompt(
			clone(task),
			this.taskClaims(task),
			task.dependsOn.map((dependency) =>
				required(this.data.tasks.find((t) => t.id === dependency)),
			),
			required(this.getTasks().find((t) => t.id === id)).state,
			this.contextHash(task),
			options,
			dispatchId,
		);
	}

	getPlan() {
		const claims = this.getClaims().filter((claim) => claim.state === "accepted");
		const tasks = this.getTasks();
		const taskInputs = tasks.map((task) => ({ task, inputs: this.taskClaims(task) }));
		const coverage = claims
			.filter((claim) => ["requirement", "constraint"].includes(claim.kind))
			.map((claim) => ({
				claimId: claim.id,
				taskIds: taskInputs
					.filter(({ inputs }) => inputs.some((input) => input.id === claim.id))
					.map(({ task }) => task.id),
			}));
		const findings: { code: string; message: string; taskId?: string; claimId?: string }[] = [];
		if (!claims.some((claim) => claim.kind === "requirement"))
			findings.push({
				code: "REQUIREMENTS_MISSING",
				message: "Review requirements before compiling an executable plan.",
			});
		if (!tasks.length)
			findings.push({ code: "TASKS_MISSING", message: "Propose tasks for the approved scope." });
		for (const item of coverage) {
			if (!item.taskIds.length)
				findings.push({
					code: "UNCOVERED_CLAIM",
					claimId: item.claimId,
					message: `${item.claimId} has no implementation task.`,
				});
		}
		for (const claim of this.data.claims) {
			if (
				claim.kind === "question" &&
				claim.blocking &&
				["proposed", "accepted"].includes(claim.state)
			)
				findings.push({ code: "BLOCKING_QUESTION", claimId: claim.id, message: claim.text });
		}
		for (const { task, inputs } of taskInputs) {
			if (!task.approval)
				findings.push({
					code: "TASK_UNAPPROVED",
					taskId: task.id,
					message: `${task.id} awaits review.`,
				});
			for (const message of executionIssues(task.execution))
				findings.push({ code: "EXECUTION_INCOMPLETE", taskId: task.id, message });
			const unavailable = unavailableInputs(inputs);
			if (unavailable.length)
				findings.push({
					code: "TASK_INPUTS_STALE",
					taskId: task.id,
					message: `${task.id} needs current approved inputs: ${unavailable.join(", ")}`,
				});
		}
		return {
			schemaVersion: 1 as const,
			ledgerHead: this.ledgerHead,
			complete: findings.length === 0,
			claims,
			tasks,
			coverage,
			findings,
		};
	}

	compileProjectPrompt(options: PromptOptions = {}) {
		const plan = this.getPlan();
		const cli = options.commandPrefix ?? "jarvistark";
		return finishPrompt(
			{
				schemaVersion: 1,
				kind: "project",
				contextHash: plan.ledgerHead,
				missing: plan.findings.map((finding) => finding.message),
			},
			[
				"# Jarvistark project execution plan",
				`Ledger head: ${plan.ledgerHead}`,
				`App workspace: ${options.workspace ?? "Use the app workspace selected by the caller."}`,
				"## Approved scope",
				...plan.claims.map((claim) => `- [${claim.id}] ${claim.kind}: ${claim.text}`),
				"## Task graph",
				...plan.tasks.map(
					(task) =>
						`- ${task.id} revision ${task.revision} (${task.state}): ${task.title}\n  Requires: ${task.dependsOn.join(", ") || "none"}\n  Claims: ${task.needs.join(", ")}\n  Outcome: ${task.execution?.outcome ?? task.title}`,
				),
				"## Planning findings",
				...plan.findings.map((finding) => `- ${finding.message}`),
				"## Execution",
				`Reload ${cli} plan and resolve its findings before starting the complete build.`,
				`Use ${cli} next to obtain the next eligible task and its compiled prompt. Follow that prompt, record check evidence, then reload next.`,
				"Review material changes through proposals and preserve previous attempts. Report progress from recorded task state and evidence.",
			],
			options.sizeBudget,
		);
	}

	/** Only a fully covered plan and an available attempt can be dispatched. */
	getBuildPrompt(host: PromptHost) {
		const plan = this.getPlan();
		const task = this.nextTask(plan.tasks);
		if (!plan.complete || !task || task.state === "in-progress") return null;
		const last = this.events.at(-1);
		if (last?.type === "build.requested" && last.task === task.id) {
			const existing = this.taskPrompt(task.id, host, last.id);
			if (existing.contentHash === last.promptHash) return existing;
		}
		return this.taskPrompt(task.id, host, this.minter().mintEventId());
	}

	async requestBuild(
		review: { reviewedHead: string; taskId: string; promptHash: string; by: string },
		host: PromptHost,
		at = now(),
	) {
		this.requireHead(review.reviewedHead);
		const by = identity(review.by);
		const prompt = this.getBuildPrompt(host);
		if (!prompt?.complete || !prompt.taskId || !prompt.taskRevision)
			throw new Error("There is no approved task available to dispatch.");
		if (prompt.taskId !== review.taskId || prompt.contentHash !== review.promptHash)
			throw new WorkspaceChangedError();
		const last = this.events.at(-1);
		// A disconnected host can receive the same unclaimed request again.
		if (
			last?.type === "build.requested" &&
			last.task === prompt.taskId &&
			last.promptHash === prompt.contentHash
		)
			return { dispatchId: last.id, reviewedHead: last.reviewedHead, prompt };
		const [event] = await this.commit(this.data, [
			{
				type: "build.requested",
				by,
				at,
				task: prompt.taskId,
				revision: prompt.taskRevision,
				reviewedHead: review.reviewedHead,
				promptHash: prompt.contentHash,
				contextHash: prompt.contextHash,
			},
		]);
		return { dispatchId: event.id, reviewedHead: review.reviewedHead, prompt };
	}

	/** Claim the human-selected handoff exactly once, using the same CAS as CLI starts. */
	async beginBuild(dispatchId: string, host: PromptHost, at = now()) {
		const request = this.events.at(-1);
		if (request?.type !== "build.requested" || request.id !== dispatchId)
			throw new Error(
				"This build request was already claimed or the workspace changed. Reload status.",
			);
		const prompt = this.getBuildPrompt(host);
		if (
			!prompt?.complete ||
			prompt.taskId !== request.task ||
			prompt.taskRevision !== request.revision ||
			prompt.contextHash !== request.contextHash ||
			prompt.contentHash !== request.promptHash
		)
			throw new WorkspaceChangedError();
		const task = await this.beginAttempt(request.task, at, dispatchId);
		return { dispatchId, taskId: task.id, attemptId: required(task.attempts.at(-1)).id, prompt };
	}

	startTask(id: string, at = now()) {
		return this.beginAttempt(id, at);
	}

	private async beginAttempt(id: string, at: string, dispatchId?: string) {
		const view = this.getTasks().find((t) => t.id === id);
		if (!view || !["ready", "failed"].includes(view.state))
			throw new Error(`Task ${id} is not ready to start`);
		const data = clone(this.data);
		const task = required(data.tasks.find((t) => t.id === id));
		task.attempts.push({
			id: task.attempts.length + 1,
			contextHash: this.contextHash(task),
			startedAt: at,
			evidence: [],
		});
		await this.commit(data, [{ type: "task.started", task: id, at, dispatchId }]);
		return required(this.getTasks().find((t) => t.id === id));
	}

	private activeTask(id: string) {
		const task = this.data.tasks.find((t) => t.id === id);
		const attempt = task?.attempts.at(-1);
		if (!task || !attempt || attempt.completedAt)
			throw new Error("Start an attempt before recording evidence or completing work");
		if (this.blockers(task).length || attempt.contextHash !== this.contextHash(task))
			throw new Error(
				"Task context changed or is blocked; start a new attempt against approved inputs",
			);
		return task;
	}

	private async saveEvidence(id: string, evidence: CheckEvidence, attemptId: number) {
		const current = this.activeTask(id);
		if (required(current.attempts.at(-1)).id !== attemptId)
			throw new Error("Attempt changed while check was running");
		const check = current.checks.find((c) => c.id === evidence.checkId);
		if (!check || check.command !== evidence.command)
			throw new Error("Evidence command must match its approved check");
		const data = clone(this.data);
		required(required(data.tasks.find((t) => t.id === id)).attempts.at(-1)).evidence.push(
			CheckEvidence.parse(evidence),
		);
		await this.commit(data, [
			{ type: "check.recorded", task: id, by: evidence.executedBy, at: evidence.at },
		]);
	}

	async recordEvidence(id: string, raw: unknown) {
		// Callers cannot promote their own report to runner-verified.
		const input = CheckEvidence.omit({ attestation: true }).strict().parse(raw);
		const task = this.activeTask(id);
		await this.saveEvidence(
			id,
			{ ...input, attestation: "self-reported" },
			required(task.attempts.at(-1)).id,
		);
	}

	async runChecks(id: string) {
		if (!this.runner) throw new Error("No trusted runner is configured");
		const task = this.activeTask(id);
		const attemptId = required(task.attempts.at(-1)).id;
		for (const check of task.checks) {
			this.activeTask(id);
			const result = await this.runner.run(check.command);
			await this.saveEvidence(
				id,
				{
					...result,
					checkId: check.id,
					command: check.command,
					at: now(),
					attestation: "runner-verified",
				},
				attemptId,
			);
		}
		return required(this.getTasks().find((t) => t.id === id));
	}

	async done(id: string, at = now()) {
		const current = this.activeTask(id);
		const evidence = required(current.attempts.at(-1)).evidence;
		for (const check of current.checks) {
			const result = evidence.findLast((e) => e.checkId === check.id);
			if (!result || result.exitCode !== 0 || result.attestation !== "runner-verified")
				throw new Error(
					`Check ${check.id} needs passing runner-verified evidence from this attempt`,
				);
		}
		const data = clone(this.data);
		required(required(data.tasks.find((t) => t.id === id)).attempts.at(-1)).completedAt = at;
		await this.commit(data, [{ type: "task.completed", task: id, at }]);
		return required(this.getTasks().find((t) => t.id === id));
	}

	async validate(): Promise<ValidationResult> {
		this.assertIntegrity();
		const persisted = await this.storage.readEvents();
		if (canonicalJson(persisted) !== canonicalJson(this.events))
			throw new Error("Stored ledger changed; reload and validate");
		return validateConsistency(new Map(this.data.claims.map((c) => [c.id, c])), this.getTasks());
	}

	getClaims(): Claim[] {
		return clone(this.data.claims);
	}
	getClaim(id: string): Claim | undefined {
		const c = this.data.claims.find((c) => c.id === id);
		return c ? clone(c) : undefined;
	}
	getIntake(): Intake | null {
		return clone(this.data.intake);
	}
	getEvents(): LedgerEvent[] {
		return clone(this.events);
	}
	getWorkspace(): WorkspaceData {
		return clone(this.data);
	}
}
