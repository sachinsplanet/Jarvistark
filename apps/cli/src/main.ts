#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { runCli } from "./cli.js";

try {
	process.exitCode = await runCli(process.argv.slice(2), {
		invocation: [process.execPath, fileURLToPath(import.meta.url)],
		write: (value) =>
			process.stdout.write(
				`${typeof value === "string" ? value : JSON.stringify(value, null, 2)}\n`,
			),
		confirm: async (action, review) => {
			if (!process.stdin.isTTY || !process.stderr.isTTY)
				throw new Error(
					"Human review requires an interactive terminal. Approval cannot be piped or auto-confirmed.",
				);
			process.stderr.write(
				`${JSON.stringify(review, null, 2)}\nReview the exact content and check commands above.\n`,
			);
			const terminal = createInterface({ input: process.stdin, output: process.stderr });
			try {
				return (await terminal.question(`Type '${action}' to confirm: `)).trim() === action;
			} finally {
				terminal.close();
			}
		},
	});
} catch (error) {
	process.stderr.write(
		`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`,
	);
	process.exitCode = 1;
}
