import { z } from "zod";

// === ID Patterns ===
export const ClaimId = z.string().regex(/^CLM-\d+$/);
export type ClaimId = z.infer<typeof ClaimId>;

// === Enums ===
export const ClaimKind = z.enum([
	"requirement",
	"constraint",
	"assumption",
	"question",
	"decision",
]);
export type ClaimKind = z.infer<typeof ClaimKind>;

export const ClaimOrigin = z.enum(["user-stated", "inferred", "recommended", "observed"]);
export type ClaimOrigin = z.infer<typeof ClaimOrigin>;

export const ClaimState = z.enum(["proposed", "accepted", "rejected", "superseded"]);
export type ClaimState = z.infer<typeof ClaimState>;

// === Source Types ===
// Gap #2 from hand-run: Source spans must support clarification sessions, not just text ranges

export const InputSpanSource = z.object({
	type: z.literal("input-span"),
	input: z.string(),
	start: z.number().int().nonnegative(),
	end: z.number().int().nonnegative(),
});
export type InputSpanSource = z.infer<typeof InputSpanSource>;

export const ClarificationSource = z.object({
	type: z.literal("clarification"),
	sessionId: z.string(),
	questionId: z.string(),
});
export type ClarificationSource = z.infer<typeof ClarificationSource>;

export const ObservationSource = z.object({
	type: z.literal("observation"),
	file: z.string(),
	evidence: z.string(),
});
export type ObservationSource = z.infer<typeof ObservationSource>;

export const ClaimSource = z.discriminatedUnion("type", [
	InputSpanSource,
	ClarificationSource,
	ObservationSource,
]);
export type ClaimSource = z.infer<typeof ClaimSource>;

// === Risk Assessment ===
// Gap #4 from hand-run: Claims need risk/feasibility flags

export const RiskLevel = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const RiskCategory = z.enum(["technical", "financial", "scope", "dependency"]);
export type RiskCategory = z.infer<typeof RiskCategory>;

export const RiskAssessment = z.object({
	level: RiskLevel,
	category: RiskCategory,
	note: z.string(),
});
export type RiskAssessment = z.infer<typeof RiskAssessment>;

// === Derived Text ===
// Plain-language text accepted by a person; technical phrasing derived from it

export const DerivedText = z.object({
	technical: z.string(),
	fromTextHash: z.string(),
});
export type DerivedText = z.infer<typeof DerivedText>;

// === Impact (for questions) ===
export const Impact = z.enum(["low", "medium", "high"]);
export type Impact = z.infer<typeof Impact>;

// === The Claim ===

export const Claim = z.object({
	id: ClaimId,
	kind: ClaimKind,
	origin: ClaimOrigin,
	state: ClaimState,
	text: z.string().min(1),
	source: ClaimSource.optional(),
	approval: z.string().optional(),
	supersedes: ClaimId.nullable().default(null),
	supersededBy: ClaimId.nullable().default(null),
	risk: RiskAssessment.optional(),
	derived: DerivedText.optional(),
	blocking: z.boolean().default(false),
	impact: Impact.optional(),
	retires: ClaimId.optional(),
});
export type Claim = z.infer<typeof Claim>;
