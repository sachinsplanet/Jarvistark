import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import { join } from "node:path";
import {
	JarvistarkGate,
	type PromptHost,
	type StoragePort,
	WorkspaceChangedError,
} from "@jarvistark/core";
import { escapeHtml, renderReview } from "./review-page.js";

export type ReviewHost = PromptHost & { workspace: string };
type ReviewOutcome =
	| { action: "reviewed"; workspace: string; ledgerHead: string }
	| ({ action: "build"; workspace: string } & Awaited<ReturnType<JarvistarkGate["requestBuild"]>>);

// The OS opens the reviewer-only address. Keep it out of tool output and the app workspace.
export function openReviewBrowser(url: string): Promise<void> {
	const [command, ...args] =
		process.platform === "darwin"
			? ["/usr/bin/open", url]
			: process.platform === "win32"
				? [
						join(process.env.SystemRoot ?? "C:\\Windows", "System32", "rundll32.exe"),
						"url.dll,FileProtocolHandler",
						url,
					]
				: ["/usr/bin/xdg-open", url];
	const child = spawn(command, args, {
		stdio: "ignore",
		windowsHide: true,
		env: { ...process.env, BROWSER: undefined },
	});
	child.unref();
	return new Promise((resolve, reject) => {
		const failed = () =>
			reject(
				new Error(
					"Could not open the review browser. Use a local desktop browser or the interactive approve command.",
				),
			);
		child.once("error", failed);
		child.once("exit", (code) => (code === 0 ? resolve() : failed()));
	});
}

async function readForm(request: IncomingMessage) {
	const chunks: Buffer[] = [];
	let size = 0;
	for await (const part of request) {
		const chunk = Buffer.from(part);
		size += chunk.length;
		if (size > 65536) throw new Error("Review form is too large.");
		chunks.push(chunk);
	}
	return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

export async function runWorkspaceReview(
	storage: StoragePort,
	host: ReviewHost,
	offerBuild: boolean,
	template: string,
	openBrowser: (url: string) => Promise<void> = openReviewBrowser,
): Promise<ReviewOutcome> {
	const path = `/review/${randomBytes(32).toString("base64url")}`;
	let origin = "";
	let by = "";
	let notice = "";
	let submitting = false;
	let finished = false;
	const server = createServer({ requestTimeout: 15000, headersTimeout: 10000 });
	const page = (res: ServerResponse, code: number, body: string) => {
		res.writeHead(code, { "Content-Type": "text/html; charset=utf-8" });
		res.end(template.replace("<!-- workspace review -->", () => body));
	};
	let idle: NodeJS.Timeout | undefined;
	try {
		return await new Promise<ReviewOutcome>((resolve, reject) => {
			const resetTimeout = () => {
				clearTimeout(idle);
				idle = setTimeout(
					() =>
						reject(
							new Error("Review expired. Reopen review to continue from the recorded decisions."),
						),
					30 * 60 * 1000,
				);
			};
			const finish = (res: ServerResponse, result: ReviewOutcome, message: string) => {
				finished = true;
				page(
					res,
					200,
					`<h1>${message}</h1><p>Continue in your Codex conversation. You can close this tab.</p>`,
				);
				resolve(result);
			};
			const handle = async (req: IncomingMessage, res: ServerResponse) => {
				res.setHeader("Cache-Control", "no-store");
				res.setHeader("Referrer-Policy", "same-origin");
				res.setHeader("X-Content-Type-Options", "nosniff");
				res.setHeader(
					"Content-Security-Policy",
					"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
				);
				if (req.url !== path || `http://${req.headers.host}` !== origin || finished) {
					page(res, 404, "<h1>Review unavailable</h1>");
					return;
				}
				if (req.method === "GET") {
					resetTimeout();
					const gate = await JarvistarkGate.create(storage);
					page(res, 200, renderReview(gate, host, offerBuild, by, notice));
					return;
				}
				// Accept a browser's user-activated, same-origin HTML form navigation.
				if (
					req.method !== "POST" ||
					req.headers.origin !== origin ||
					req.headers["sec-fetch-site"] !== "same-origin" ||
					req.headers["sec-fetch-mode"] !== "navigate" ||
					req.headers["sec-fetch-dest"] !== "document" ||
					req.headers["sec-fetch-user"] !== "?1" ||
					req.headers["content-type"]?.split(";")[0] !== "application/x-www-form-urlencoded"
				) {
					page(res, 403, "<h1>Use the review form in your local browser</h1>");
					return;
				}
				if (submitting) {
					page(
						res,
						409,
						`<h1>A decision is being recorded</h1><a href="${path}">Reload review</a>`,
					);
					return;
				}
				submitting = true;
				resetTimeout();
				try {
					const form = await readForm(req);
					const gate = await JarvistarkGate.create(storage);
					const reviewedHead = form.get("head") ?? "";
					gate.requireHead(reviewedHead);
					const action = form.get("action");
					if (action === "return") {
						finish(
							res,
							{ action: "reviewed", workspace: host.workspace, ledgerHead: reviewedHead },
							"Review closed",
						);
						return;
					}
					const reviewer = (form.get("by") ?? "").trim();
					if (!reviewer || reviewer.length > 120)
						throw new Error("Enter your name before recording a decision.");
					const claims = form.getAll("claim");
					switch (action) {
						case "approve-claims":
							await gate.approve(claims, reviewer);
							notice = `Approved ${claims.join(", ")}.`;
							break;
						case "reject-claims": {
							const reason = form.get("reason")?.trim();
							if (!reason) throw new Error("Enter a reason for rejecting the selected claims.");
							await gate.reject(claims, reviewer, reason);
							notice = `Rejected ${claims.join(", ")}.`;
							break;
						}
						case "approve-tasks": {
							const tasks = form.getAll("task");
							await gate.approveTasks(tasks, reviewer);
							notice = `Approved ${tasks.join(", ")}.`;
							break;
						}
						case "build": {
							if (!offerBuild) throw new Error("This session is for plan review.");
							const handoff = await gate.requestBuild(
								{
									by: reviewer,
									reviewedHead,
									taskId: form.get("buildTask") ?? "",
									promptHash: form.get("promptHash") ?? "",
								},
								host,
							);
							finish(
								res,
								{ action: "build", workspace: host.workspace, ...handoff },
								"Build request recorded",
							);
							return;
						}
						default:
							throw new Error("Choose a review action.");
					}
					by = reviewer;
					res.writeHead(303, { Location: path });
					res.end();
				} finally {
					submitting = false;
				}
			};
			server.on("request", (req, res) => {
				handle(req, res).catch((error: unknown) => {
					page(
						res,
						error instanceof WorkspaceChangedError ? 409 : 400,
						`<h1>Review needs attention</h1><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p><a class="button" href="${path}">Review current version</a>`,
					);
				});
			});
			server.once("error", reject);
			server.listen(0, "127.0.0.1", () => {
				const address = server.address();
				if (!address || typeof address === "string")
					return reject(new Error("Local review could not start."));
				origin = `http://127.0.0.1:${address.port}`;
				resetTimeout();
				openBrowser(origin + path).catch(reject);
			});
		});
	} finally {
		clearTimeout(idle);
		server.close();
	}
}
