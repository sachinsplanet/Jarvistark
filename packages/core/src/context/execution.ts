import { z } from "zod";

const text = z.string().trim().min(1);
const projectPath = text.refine(
	(path) => !/^(?:[\\/]|[a-zA-Z]:)/.test(path) && !path.split(/[\\/]/).includes(".."),
	"Use a path inside the app workspace",
);

// This context is reviewed and versioned with the task that consumes it.
export const TaskExecution = z
	.object({
		outcome: text,
		scope: z.array(text).min(1),
		design: z
			.object({
				userFlows: z.array(text),
				interfaces: z.array(z.object({ name: text, contract: text }).strict()),
				dataRules: z.array(text),
			})
			.strict(),
		environment: z
			.object({
				target: text,
				runtime: text,
				packageManager: text.optional(),
				prerequisites: z.array(
					z
						.object({
							name: text,
							status: z.enum(["installed", "missing", "incompatible", "unverified"]),
							evidence: text,
							verifyCommand: text,
							setupCommand: text.optional(),
							setupTask: z
								.string()
								.regex(/^TSK-\d+$/)
								.optional(),
						})
						.strict(),
				),
			})
			.strict(),
		repository: z.array(z.object({ path: projectPath, purpose: text }).strict()),
		deliverables: z.array(z.object({ path: projectPath, description: text }).strict()),
	})
	.strict();
export type TaskExecution = z.infer<typeof TaskExecution>;

export function executionIssues(execution?: TaskExecution): string[] {
	if (!execution)
		return [
			"Task execution context has not been recorded. Review it with revise-task before a complete handoff.",
		];
	return execution.environment.prerequisites
		.filter(
			(item) =>
				["missing", "incompatible"].includes(item.status) && !item.setupCommand && !item.setupTask,
		)
		.map((item) => `Prerequisite ${item.name} needs a setup command or a prerequisite task.`);
}
