import { z } from "zod";

// === Rendered Document ===

export const RenderedDocument = z.object({
	path: z.string(),
	content: z.string(),
	contentHash: z.string(),
	sourceClaimIds: z.array(z.string()),
	renderedAt: z.string().datetime(),
});
export type RenderedDocument = z.infer<typeof RenderedDocument>;

// === Rendered Prompt ===

export const RenderedPrompt = z.object({
	taskId: z.string(),
	content: z.string(),
	contentHash: z.string(),
	renderedAt: z.string().datetime(),
});
export type RenderedPrompt = z.infer<typeof RenderedPrompt>;

export const PromptKind = z.enum(["task", "verification", "repair", "resume", "delivery"]);
export type PromptKind = z.infer<typeof PromptKind>;

// Shells provide local paths and invocation syntax. These never enter the ledger.
export interface PromptHost {
	workspace?: string;
	commandPrefix?: string;
}

export interface PromptOptions extends PromptHost {
	kind?: PromptKind;
	sizeBudget?: number;
}

export interface CompiledPrompt {
	schemaVersion: 1;
	kind: PromptKind | "project";
	taskId?: string;
	taskRevision?: number;
	contextHash: string;
	contentHash: string;
	complete: boolean;
	missing: string[];
	content: string;
}
