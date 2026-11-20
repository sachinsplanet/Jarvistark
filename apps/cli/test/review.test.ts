import { mkdtemp, readFile, rm } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { JarvistarkGate } from "@jarvistark/core";
import { afterEach, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { runWorkspaceReview } from "../src/review.js";
import { FileStorage } from "../src/storage.js";

const fixture = fileURLToPath(
	new URL("../../../fixtures/community-seed-library/", import.meta.url),
);
const template = await readFile(
	new URL("../../web/workspace-review.html", import.meta.url),
	"utf8",
);
const workspaces: string[] = [];
afterEach(async () => {
	await Promise.all(workspaces.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function project() {
	const workspace = await mkdtemp(join(tmpdir(), "jarvistark-review-"));
	workspaces.push(workspace);
	const cli = async (...args: string[]) => {
		let output: unknown;
		expect(
			await runCli(["--workspace", workspace, ...args], {
				write: (value) => {
					output = value;
				},
				confirm: async () => {
					throw new Error("Decisions belong to the review window");
				},
			}),
		).toBe(0);
		return output;
	};
	await cli("init", join(fixture, "idea.txt"));
	await cli("propose", join(fixture, "claims.json"));
	const storage = await FileStorage.open(workspace);
	const host = { workspace, commandPrefix: `'jarvistark' '--workspace' '${workspace}'` };
	return { cli, storage, host, load: () => JarvistarkGate.create(storage) };
}

// Synthetic reviewer for disposable fixtures. The executable opens the OS browser.
function submit(
	url: string,
	fields: Record<string, string | string[]>,
	headers: Record<string, string> = {},
) {
	const data = new URLSearchParams();
	for (const [name, values] of Object.entries(fields)) {
		for (const value of Array.isArray(values) ? values : [values]) data.append(name, value);
	}
	return new Promise<number | undefined>((resolve, reject) => {
		const req = request(
			url,
			{
				method: "POST",
				headers: {
					origin: new URL(url).origin,
					"sec-fetch-site": "same-origin",
					"sec-fetch-mode": "navigate",
					"sec-fetch-dest": "document",
					"sec-fetch-user": "?1",
					"content-type": "application/x-www-form-urlencoded",
					...headers,
				},
			},
			(res) => {
				res.resume();
				res.on("end", () => resolve(res.statusCode));
			},
		);
		req.on("error", reject);
		req.end(data.toString());
	});
}

function field(html: string, name: string) {
	const value = html.match(new RegExp(`name="${name}" value="([^"]+)"`))?.[1];
	if (!value) throw new Error(`Missing review field ${name}`);
	return value;
}

it("reviews the live Seed Library workspace and hands the exact displayed prompt to the CLI consumer", async () => {
	const { host, storage, load, cli } = await project();
	let displayedHash: string | undefined;
	const by = "Seed Library fixture reviewer";
	const result = await runWorkspaceReview(storage, host, true, template, async (url) => {
		const page = async () => (await fetch(url)).text();
		let html = await page();
		const first = field(html, "head");
		expect(html).toContain("Packet counts must be nonnegative integers.");
		const claims = ["CLM-001", "CLM-002", "CLM-003", "CLM-004"];
		const approve = { action: "approve-claims", by, head: first, claim: claims };
		expect(await submit(url, approve, { "sec-fetch-mode": "cors" })).toBe(403);
		expect(await submit(url, approve, { origin: "https://example.invalid" })).toBe(403);
		expect(await submit(url, { ...approve, by: "" })).toBe(400);
		expect((await load()).ledgerHead).toBe(first);
		await cli("task", join(fixture, "inventory.task.json"));
		expect(await submit(url, approve)).toBe(409);
		expect((await load()).getClaims().every((c) => c.state === "proposed")).toBe(true);
		html = await page();
		const claimsHead = field(html, "head");
		expect(
			await submit(url, { action: "approve-tasks", by, head: claimsHead, task: "TSK-001" }),
		).toBe(400);
		expect(await submit(url, { ...approve, head: claimsHead })).toBe(303);
		const taskHead = field(await page(), "head");
		expect(
			await submit(url, { action: "approve-tasks", by, head: taskHead, task: "TSK-001" }),
		).toBe(303);
		html = await page();
		displayedHash = field(html, "promptHash");
		const gate = await load();
		expect(gate.getEvents().find((e) => e.type === "approval.recorded")).toMatchObject({
			by,
			reviewedHead: claimsHead,
		});
		expect(gate.getEvents().at(-1)).toMatchObject({ by, reviewedHead: taskHead });
		expect(html).toContain("node --test inventory.test.mjs");
		expect(
			await submit(url, {
				action: "build",
				by,
				head: field(html, "head"),
				buildTask: field(html, "buildTask"),
				promptHash: displayedHash,
			}),
		).toBe(200);
	});
	expect(result.action).toBe("build");
	if (result.action !== "build") throw new Error("Expected host dispatch");
	expect(result.prompt.contentHash).toBe(displayedHash);
	expect(await cli("begin-build", result.dispatchId)).toMatchObject({
		taskId: "TSK-001",
		attemptId: 1,
		prompt: result.prompt,
	});
	expect((await load()).getTasks()[0].state).toBe("in-progress");
	await expect(cli("begin-build", result.dispatchId)).rejects.toThrow("already claimed");
	expect(await cli("validate")).toMatchObject({ valid: true });
});

it("records a partial rejection and returns to planning without requesting a build", async () => {
	const { host, storage, load } = await project();
	const result = await runWorkspaceReview(storage, host, false, template, async (url) => {
		const head = field(await (await fetch(url)).text(), "head");
		const form = { head, by: "Fixture reviewer", claim: "CLM-004", action: "reject-claims" };
		expect(await submit(url, form)).toBe(400);
		expect(await submit(url, { ...form, action: "build" })).toBe(400);
		expect(await submit(url, { ...form, reason: "Choose storage after deployment review" })).toBe(
			303,
		);
		expect(await submit(url, { action: "return", head: (await load()).ledgerHead })).toBe(200);
	});
	const gate = await load();
	expect(result).toEqual({
		action: "reviewed",
		workspace: host.workspace,
		ledgerHead: gate.ledgerHead,
	});
	expect(gate.getClaim("CLM-004")?.state).toBe("rejected");
	expect(gate.getClaim("CLM-001")?.state).toBe("proposed");
	expect(gate.getEvents().at(-1)).toMatchObject({
		type: "rejection.recorded",
		reason: "Choose storage after deployment review",
	});
	await expect(
		runWorkspaceReview(storage, host, true, template, async () => {
			throw new Error("Browser unavailable");
		}),
	).rejects.toThrow("Browser unavailable");
});
