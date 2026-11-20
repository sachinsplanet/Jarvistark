import { z } from "zod";

// === Profile ===
// A profile tailors the generic core to a class of projects.
// Gap #5: Profiles are optional — the core works without one.

export const Profile = z.object({
	id: z.string(),
	version: z.string(),
	supports: z.array(z.string()),
	declines: z.array(z.string()),
	intake: z.string().optional(),
	rules: z.array(z.string()).default([]),
});
export type Profile = z.infer<typeof Profile>;
