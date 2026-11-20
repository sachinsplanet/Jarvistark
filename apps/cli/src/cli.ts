import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { JarvistarkGate, PromptKind } from "@jarvistark/core";
import { runWorkspaceReview } from "./review.js";
import { LocalRunner } from "./runner.js";
import { FileStorage } from "./storage.js";

export interface CliIO {
	write(value: unknown): void;
	// Only the executable's human-facing terminal supplies this capability.
	confirm(action: string, review: unknown): Promise<boolean>;
	invocation?: string[];
}

const help = `Jarvistark — approved intent to verified implementation
Usage: jarvistark [--workspace DIR] COMMAND [arguments]
  init IDEA_FILE                 Record immutable original input
  clarify JSON_FILE              Record {sessionId, question}
  propose JSON_FILE              Validate a claim proposal
  task JSON_FILE                 Propose a task definition and checks
  revise-task TASK_ID JSON_FILE  Propose a replacement task definition
  review [--build]              Open the workspace review in your browser
                                --build offers the next task to the waiting host
  begin-build EVENT_ID          Claim a reviewed build request and begin its attempt
  approve ID... --by NAME        Review claims or tasks interactively
  reject CLAIM_ID... --by NAME --reason TEXT
  status                        Show claims, task readiness, and blockers
  plan                          Inspect execution context and requirement coverage
  next                          Return next task with approved context
  prompt TASK_ID [--mode MODE] [--format text|json]
                                Compile task, verification, repair, resume, or delivery
  prompt --mode project         Compile the project execution handoff
  start TASK_ID                 Begin a fresh attempt (also retries failures)
  check TASK_ID                 Execute approved checks in the workspace
  evidence TASK_ID JSON_FILE    Record explicitly self-reported evidence
  done TASK_ID                  Complete using passing runner evidence
  validate                      Verify ledger and consistency
  export                        Print the complete portable journal
Review decisions are entered in the browser or an interactive terminal.
`;

function commandPrefix(invocation: string[], workspace: string): string {
	const argv = [...invocation, "--workspace", workspace];
	if (process.platform === "win32")
		return `& ${argv.map((arg) => `'${arg.replaceAll("'", "''")}'`).join(" ")}`;
	return argv.map((arg) => `'${arg.replaceAll("'", "'\\''")}'`).join(" ");
}

export async function runCli(rawArgs: string[], io: CliIO): Promise<number> {
	const args = [...rawArgs];
	const option = (name: string) => {
		const index = args.indexOf(name);
		if (index < 0) return undefined;
		const value = args[index + 1];
		if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
		args.splice(index, 2);
		return value;
	};
	const workspace = resolve(option("--workspace") ?? process.cwd());
	const by = option("--by");
	const reason = option("--reason");
	const mode = option("--mode");
	const format = option("--format");
	const buildIndex = args.indexOf("--build");
	const offerBuild = buildIndex >= 0;
	if (offerBuild) args.splice(buildIndex, 1);
	const [command, ...rest] = args;
	if (!command || command === "help" || command === "--help") {
		io.write(help);
		return 0;
	}
	if (rest.some((a) => a.startsWith("--"))) throw new Error("Unknown option");
	if (offerBuild && command !== "review") throw new Error("--build applies to review");
	if ((mode || format) && command !== "prompt")
		throw new Error("--mode and --format apply to prompt");
	if (format && !["text", "json"].includes(format)) throw new Error("Use --format text or json");
	const arity = (count: number) => {
		if (rest.length !== count) throw new Error(`${command} expects ${count} argument(s)`);
	};
	const json = async (path: string) => JSON.parse(await readFile(resolve(path), "utf8"));
	const storage = await FileStorage.open(workspace, command === "init");
	const gate = await JarvistarkGate.create(storage, new LocalRunner(workspace));
	const host = {
		workspace,
		commandPrefix: commandPrefix(io.invocation ?? ["jarvistark"], workspace),
	};
	switch (command) {
		case "init":
			arity(1);
			io.write(await gate.recordIntake(await readFile(resolve(rest[0]), "utf8")));
			break;
		case "clarify": {
			arity(1);
			const input = await json(rest[0]);
			io.write(await gate.recordClarification(input.sessionId, input.question));
			break;
		}
		case "propose": {
			arity(1);
			const result = await gate.propose(await json(rest[0]));
			io.write(result);
			return result.ok ? 0 : 1;
		}
		case "task":
			arity(1);
			io.write(await gate.proposeTask(await json(rest[0])));
			break;
		case "revise-task":
			arity(2);
			io.write(await gate.proposeTask(await json(rest[1]), rest[0]));
			break;
		case "review": {
			arity(0);
			if (by || reason) throw new Error("Enter the reviewer and decision in the review window.");
			const template = await readFile(new URL("./workspace-review.html", import.meta.url), "utf8");
			io.write(await runWorkspaceReview(storage, host, offerBuild, template));
			break;
		}
		case "begin-build":
			arity(1);
			io.write(await gate.beginBuild(rest[0], host));
			break;
		case "approve": {
			if (!by || !rest.length) throw new Error("approve requires IDs and --by NAME");
			if (new Set(rest).size !== rest.length) throw new Error("Duplicate approval ID");
			const claims = gate.getClaims().filter((c) => rest.includes(c.id));
			const tasks = gate.getTasks().filter((t) => rest.includes(t.id));
			if (claims.length + tasks.length !== rest.length) throw new Error("Unknown approval ID");
			if (claims.length && tasks.length)
				throw new Error("Approve claims first, then review tasks separately");
			if (!(await io.confirm(`approve ${rest.join(" ")}`, { by, claims, tasks })))
				throw new Error("Approval cancelled");
			if (claims.length) io.write(await gate.approve(rest, by));
			if (tasks.length) io.write(await gate.approveTasks(rest, by));
			break;
		}
		case "reject": {
			if (!by || !reason || !rest.length)
				throw new Error("reject requires IDs, --by NAME and --reason TEXT");
			const claims = gate.getClaims().filter((c) => rest.includes(c.id));
			if (!(await io.confirm(`reject ${rest.join(" ")}`, { by, reason, claims })))
				throw new Error("Rejection cancelled");
			io.write(await gate.reject(rest, by, reason));
			break;
		}
		case "status":
			arity(0);
			io.write({ intake: gate.getIntake(), claims: gate.getClaims(), tasks: gate.getTasks() });
			break;
		case "next":
			arity(0);
			io.write(gate.next(host) ?? { next: null, tasks: gate.getTasks() });
			break;
		case "plan": {
			arity(0);
			const plan = gate.getPlan();
			io.write(plan);
			return plan.complete ? 0 : 1;
		}
		case "prompt": {
			arity(mode === "project" ? 0 : 1);
			const prompt =
				mode === "project"
					? gate.compileProjectPrompt(host)
					: gate.compilePrompt(rest[0], {
							...host,
							kind: mode ? PromptKind.parse(mode) : undefined,
						});
			io.write(format === "json" ? prompt : prompt.content);
			return prompt.complete ? 0 : 1;
		}
		case "start":
			arity(1);
			io.write(await gate.startTask(rest[0]));
			break;
		case "check": {
			arity(1);
			const task = await gate.runChecks(rest[0]);
			io.write(task);
			return task.checks.every((c) => c.result?.status === "passed") ? 0 : 1;
		}
		case "evidence":
			arity(2);
			await gate.recordEvidence(rest[0], await json(rest[1]));
			io.write({ recorded: true, attestation: "self-reported" });
			break;
		case "done":
			arity(1);
			io.write(await gate.done(rest[0]));
			break;
		case "validate": {
			arity(0);
			const result = await gate.validate();
			io.write(result);
			return result.valid ? 0 : 1;
		}
		case "export":
			arity(0);
			io.write({ schemaVersion: 1, events: gate.getEvents() });
			break;
		default:
			throw new Error(`Unknown command: ${command}`);
	}
	return 0;
}
