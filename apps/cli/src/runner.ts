import { spawn } from "node:child_process";
import type { RunnerPort } from "@jarvistark/core";

/** Checks are commands reviewed as part of task approval, executed in the workspace.
 * This is a local runner, not a sandbox. CLI invocation is an explicit execution action. */
export class LocalRunner implements RunnerPort {
	constructor(
		private cwd: string,
		private timeoutMs = 120000,
		private maxBytes = 1024 * 1024,
	) {}

	run(command: string): Promise<{ exitCode: number; output: string; executedBy: string }> {
		return new Promise((resolve) => {
			const child = spawn(command, {
				cwd: this.cwd,
				shell: true,
				detached: process.platform !== "win32",
				stdio: ["ignore", "pipe", "pipe"],
			});
			let output = "";
			let bytes = 0;
			let stopped: string | undefined;
			const stop = (reason: string) => {
				if (stopped) return;
				stopped = reason;
				try {
					if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL");
					else child.kill("SIGKILL");
				} catch {
					/* Process may already have exited. */
				}
			};
			const capture = (chunk: Buffer) => {
				bytes += chunk.length;
				if (bytes > this.maxBytes) {
					stop("Output limit exceeded");
					return;
				}
				output += chunk.toString("utf8");
			};
			child.stdout.on("data", capture);
			child.stderr.on("data", capture);
			const timer = setTimeout(() => stop("Check timed out"), this.timeoutMs);
			child.on("error", (error) => {
				stopped = `Runner error: ${error.message}`;
			});
			child.on("close", (code, signal) => {
				clearTimeout(timer);
				if (stopped) output += `\n${stopped}\n`;
				else if (signal) output += `\nTerminated by ${signal}\n`;
				resolve({
					exitCode: stopped || signal ? 1 : (code ?? 1),
					output,
					executedBy: "jarvistark:local-runner",
				});
			});
		});
	}
}
