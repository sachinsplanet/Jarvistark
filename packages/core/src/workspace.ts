import { z } from "zod";
import { Task } from "./checks/schema.js";
import { Intake } from "./claims/intake.js";
import { Claim } from "./claims/schema.js";
import { TaskExecution } from "./context/execution.js";
import { Proposal } from "./proposals/schema.js";

export const TaskDraft = z
	.object({
		title: z.string().trim().min(1),
		needs: z.array(z.string()).min(1),
		dependsOn: z.array(z.string()).default([]),
		execution: TaskExecution.optional(),
		checks: z
			.array(z.object({ command: z.string().trim().min(1), expect: z.string().trim().min(1) }))
			.min(1),
	})
	.strict();
export type TaskDraft = z.infer<typeof TaskDraft>;

export const CheckEvidence = z
	.object({
		checkId: z.string(),
		command: z.string().min(1),
		executedBy: z.string().trim().min(1),
		output: z.string(),
		exitCode: z.number().int(),
		at: z.string().datetime(),
		attestation: z.enum(["self-reported", "runner-verified"]),
	})
	.strict();
export type CheckEvidence = z.infer<typeof CheckEvidence>;

export const TaskAttempt = z.object({
	id: z.number().int().positive(),
	contextHash: z.string(),
	startedAt: z.string().datetime(),
	completedAt: z.string().datetime().optional(),
	evidence: z.array(CheckEvidence),
});

export const WorkTask = Task.omit({ state: true }).extend({
	revision: z.number().int().positive(),
	execution: TaskExecution.optional(),
	approval: z
		.object({ by: z.string().min(1), at: z.string().datetime(), hash: z.string() })
		.optional(),
	attempts: z.array(TaskAttempt),
});
export type WorkTask = z.infer<typeof WorkTask>;

// Every committed snapshot is covered by its event hash. There are no separately
// editable canonical claim/task files. Old snapshots preserve all prior versions.
export const WorkspaceData = z
	.object({
		schemaVersion: z.literal(1),
		intake: Intake.nullable(),
		claims: z.array(Claim),
		proposals: z.array(Proposal),
		tasks: z.array(WorkTask),
		links: z.array(z.object({ from: z.string(), to: z.string(), rel: z.string() })),
	})
	.strict();
export type WorkspaceData = z.infer<typeof WorkspaceData>;

export function emptyWorkspace(): WorkspaceData {
	return { schemaVersion: 1, intake: null, claims: [], proposals: [], tasks: [], links: [] };
}

// Persistence and hashing must agree on how optional undefined values are omitted.
export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
