import { z } from "zod";

// === Clarification Session ===
// Gap #3: Model clarification sessions as first-class ledger data

export const ClarificationOption = z.object({
	text: z.string(),
	recommended: z.boolean().default(false),
});
export type ClarificationOption = z.infer<typeof ClarificationOption>;

export const ClarificationQuestion = z.object({
	id: z.string(),
	text: z.string(),
	options: z.array(ClarificationOption).optional(),
	recommendation: z.string().optional(),
	answer: z.string(),
	rawAnswer: z.string().optional(), // exact user input before normalization
	answeredAt: z.string().datetime(),
});
export type ClarificationQuestion = z.infer<typeof ClarificationQuestion>;

export const ClarificationSession = z.object({
	id: z.string(),
	startedAt: z.string().datetime(),
	questions: z.array(ClarificationQuestion),
});
export type ClarificationSession = z.infer<typeof ClarificationSession>;

// === Intake ===

export const Intake = z.object({
	originalText: z.string().min(1),
	hash: z.string(), // SHA-256 hex of originalText, computed by adapter
	recordedAt: z.string().datetime(),
	clarifications: z.array(ClarificationSession).default([]),
});
export type Intake = z.infer<typeof Intake>;
