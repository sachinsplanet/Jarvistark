import { z } from "zod";
import {
	ClaimId,
	ClaimKind,
	ClaimOrigin,
	ClaimSource,
	Impact,
	RiskAssessment,
} from "../claims/schema.js";

// === Provisional Keys ===
// Planners use $-prefixed keys; the engine mints real IDs

export const ProvisionalKey = z.string().regex(/^\$.+$/);
export type ProvisionalKey = z.infer<typeof ProvisionalKey>;

// A reference that can be either a real ClaimId or a ProvisionalKey
export const ClaimRef = z.string();
export type ClaimRef = z.infer<typeof ClaimRef>;

// === Proposal Operations ===

export const AddOp = z.object({
	op: z.literal("add"),
	key: ProvisionalKey,
	claim: z.object({
		kind: ClaimKind,
		origin: ClaimOrigin,
		text: z.string().min(1),
		source: ClaimSource.optional(),
		risk: RiskAssessment.optional(),
		blocking: z.boolean().optional(),
		impact: Impact.optional(),
	}),
});
export type AddOp = z.infer<typeof AddOp>;

export const ReviseOp = z.object({
	op: z.literal("revise"),
	key: ProvisionalKey,
	target: ClaimId,
	claim: z.object({
		origin: ClaimOrigin.optional(),
		source: ClaimSource.optional(),
		text: z.string().min(1).optional(),
		kind: ClaimKind.optional(),
		risk: RiskAssessment.optional(),
		blocking: z.boolean().optional(),
		impact: Impact.optional(),
	}),
});
export type ReviseOp = z.infer<typeof ReviseOp>;

export const RetireOp = z.object({
	op: z.literal("retire"),
	target: ClaimId,
	reason: z.string().min(1),
});
export type RetireOp = z.infer<typeof RetireOp>;

export const LinkRel = z.enum(["constrains", "depends-on", "implements", "blocks", "derives-from"]);
export type LinkRel = z.infer<typeof LinkRel>;

export const LinkOp = z.object({
	op: z.literal("link"),
	from: ClaimRef,
	to: ClaimRef,
	rel: LinkRel,
});
export type LinkOp = z.infer<typeof LinkOp>;

export const ProposalOp = z.discriminatedUnion("op", [AddOp, ReviseOp, RetireOp, LinkOp]);
export type ProposalOp = z.infer<typeof ProposalOp>;

// === Planner Identity ===

export const PlannerRole = z.enum(["host-agent", "model-adapter", "person"]);
export type PlannerRole = z.infer<typeof PlannerRole>;

export const Planner = z.object({
	role: PlannerRole,
	id: z.string().optional(),
});
export type Planner = z.infer<typeof Planner>;

// === The Proposal ===

export const ProposalId = z.string().regex(/^PRP-\d+$/);
export type ProposalId = z.infer<typeof ProposalId>;

export const Proposal = z.object({
	id: ProposalId,
	planner: Planner,
	ops: z.array(ProposalOp).min(1),
	createdAt: z.string().datetime(),
});
export type Proposal = z.infer<typeof Proposal>;

// === Engine Response ===

export const ProposalAccepted = z.object({
	ok: z.literal(true),
	minted: z.record(ProvisionalKey, ClaimId),
	event: z.string(),
});
export type ProposalAccepted = z.infer<typeof ProposalAccepted>;

export const ProposalError = z.object({
	path: z.string(),
	code: z.string(),
	message: z.string(),
});
export type ProposalError = z.infer<typeof ProposalError>;

export const ProposalRejected = z.object({
	ok: z.literal(false),
	errors: z.array(ProposalError).min(1),
});
export type ProposalRejected = z.infer<typeof ProposalRejected>;

export const ProposalResult = z.discriminatedUnion("ok", [ProposalAccepted, ProposalRejected]);
export type ProposalResult = z.infer<typeof ProposalResult>;
