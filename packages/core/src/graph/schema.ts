import { z } from "zod";

// === Link between claims ===

export const ClaimLink = z.object({
	from: z.string(),
	to: z.string(),
	rel: z.string(),
});
export type ClaimLink = z.infer<typeof ClaimLink>;

// === Derived Artifact ===
// Records the hashes of claims it was built from, for staleness detection

export const DerivedArtifact = z.object({
	id: z.string(),
	type: z.enum(["document", "task-graph", "context-bundle", "prompt"]),
	inputHashes: z.record(z.string(), z.string()), // claimId -> hash at build time
	builtAt: z.string().datetime(),
	stale: z.boolean().default(false),
});
export type DerivedArtifact = z.infer<typeof DerivedArtifact>;
