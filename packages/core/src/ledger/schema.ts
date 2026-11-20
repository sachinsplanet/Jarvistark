import { z } from "zod";
import { WorkspaceData } from "../workspace.js";

// === Event IDs ===

export const EventId = z.string().regex(/^EVT-\d+$/);
export type EventId = z.infer<typeof EventId>;

// === Base Event ===
// All events are hash-chained: prev is the hash of the previous event

const BaseEvent = z.object({
	id: EventId,
	prev: z.string(), // hash of previous event ("GENESIS" for first)
	hash: z.string(), // hash of this event's content
	at: z.string().datetime(),
	snapshot: WorkspaceData.optional(),
});

// === Event Types ===

export const IntakeRecorded = BaseEvent.extend({
	type: z.literal("intake.recorded"),
	inputHash: z.string(),
});
export type IntakeRecorded = z.infer<typeof IntakeRecorded>;

export const ClarificationRecorded = BaseEvent.extend({
	type: z.literal("clarification.recorded"),
	sessionId: z.string(),
	questionId: z.string(),
	answer: z.string(),
});
export type ClarificationRecorded = z.infer<typeof ClarificationRecorded>;

export const ProposalRecorded = BaseEvent.extend({
	type: z.literal("proposal.recorded"),
	proposal: z.string(), // ProposalId
	minted: z.record(z.string(), z.string()), // provisional key -> ClaimId
});
export type ProposalRecorded = z.infer<typeof ProposalRecorded>;

export const ApprovalRecorded = BaseEvent.extend({
	type: z.literal("approval.recorded"),
	claims: z.array(z.string()), // ClaimIds accepted
	by: z.string(), // who approved
	claimHashes: z.record(z.string()).optional(),
	reviewedHead: z.string().optional(),
});
export type ApprovalRecorded = z.infer<typeof ApprovalRecorded>;

export const RejectionRecorded = BaseEvent.extend({
	type: z.literal("rejection.recorded"),
	claims: z.array(z.string()), // ClaimIds rejected
	by: z.string(),
	reason: z.string().optional(),
	reviewedHead: z.string().optional(),
});
export type RejectionRecorded = z.infer<typeof RejectionRecorded>;

export const ClaimSuperseded = BaseEvent.extend({
	type: z.literal("claim.superseded"),
	claim: z.string(), // old ClaimId
	by: z.string(), // new ClaimId
});
export type ClaimSuperseded = z.infer<typeof ClaimSuperseded>;

export const ClaimRetired = BaseEvent.extend({
	type: z.literal("claim.retired"),
	claim: z.string(), // ClaimId
	reason: z.string(),
});
export type ClaimRetired = z.infer<typeof ClaimRetired>;

export const LinkRecorded = BaseEvent.extend({
	type: z.literal("link.recorded"),
	from: z.string(),
	to: z.string(),
	rel: z.string(),
});
export type LinkRecorded = z.infer<typeof LinkRecorded>;

export const TaskRecorded = BaseEvent.extend({
	type: z.enum([
		"task.proposed",
		"task.approved",
		"task.started",
		"check.recorded",
		"task.completed",
	]),
	task: z.string(),
	by: z.string().optional(),
	reviewedHead: z.string().optional(),
	dispatchId: EventId.optional(),
});

export const BuildRequested = BaseEvent.extend({
	type: z.literal("build.requested"),
	task: z.string(),
	revision: z.number().int().positive(),
	by: z.string().trim().min(1),
	reviewedHead: z.string(),
	contextHash: z.string(),
	promptHash: z.string(),
});

// === Union of all events ===

export const LedgerEvent = z.discriminatedUnion("type", [
	IntakeRecorded,
	ClarificationRecorded,
	ProposalRecorded,
	ApprovalRecorded,
	RejectionRecorded,
	ClaimSuperseded,
	ClaimRetired,
	LinkRecorded,
	TaskRecorded,
	BuildRequested,
]);
export type LedgerEvent = z.infer<typeof LedgerEvent>;
