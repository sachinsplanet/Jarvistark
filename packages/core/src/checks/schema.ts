import { z } from "zod";

// === Check IDs ===

export const CheckId = z.string().regex(/^CHK-[\w-]+$/);
export type CheckId = z.infer<typeof CheckId>;

export const TaskId = z.string().regex(/^TSK-\d+$/);
export type TaskId = z.infer<typeof TaskId>;

// === Check Result ===

export const CheckStatus = z.enum(["pending", "passed", "failed", "skipped"]);
export type CheckStatus = z.infer<typeof CheckStatus>;

export const Attestation = z.enum(["self-reported", "runner-verified"]);
export type Attestation = z.infer<typeof Attestation>;

export const CheckResult = z.object({
	status: CheckStatus,
	attestation: Attestation,
	evidence: z.string().optional(),
	at: z.string().datetime(),
	output: z.string().optional(),
});
export type CheckResult = z.infer<typeof CheckResult>;

// === Check ===

export const Check = z.object({
	id: CheckId,
	command: z.string(),
	expect: z.string(),
	result: CheckResult.optional(),
});
export type Check = z.infer<typeof Check>;

// === Task ===

export const TaskState = z.enum(["blocked", "ready", "in-progress", "done", "failed"]);
export type TaskState = z.infer<typeof TaskState>;

export const Task = z.object({
	id: TaskId,
	title: z.string().min(1),
	needs: z.array(z.string()), // ClaimIds this task implements
	dependsOn: z.array(z.string()), // TaskIds this depends on
	checks: z.array(Check),
	state: TaskState,
});
export type Task = z.infer<typeof Task>;
