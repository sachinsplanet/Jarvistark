import { z } from "zod";

export const ValidationSeverity = z.enum(["error", "warning", "info"]);
export type ValidationSeverity = z.infer<typeof ValidationSeverity>;

export const ValidationFinding = z.object({
	code: z.string(),
	severity: ValidationSeverity,
	message: z.string(),
	path: z.string().optional(),
	claimId: z.string().optional(),
	eventId: z.string().optional(),
});
export type ValidationFinding = z.infer<typeof ValidationFinding>;

export const ValidationResult = z.object({
	valid: z.boolean(),
	findings: z.array(ValidationFinding),
});
export type ValidationResult = z.infer<typeof ValidationResult>;
