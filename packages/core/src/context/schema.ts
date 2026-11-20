import { z } from "zod";

// === Context Bundle ===
// The assembled context for a task, built by walking the graph

export const ContextBundle = z.object({
	taskId: z.string(),
	claims: z.array(z.any()), // Claim objects relevant to this task
	links: z.array(z.any()), // ClaimLink objects
	sizeBudget: z.number().int().positive(),
	actualSize: z.number().int().nonnegative(),
	truncated: z.boolean().default(false),
});
export type ContextBundle = z.infer<typeof ContextBundle>;
