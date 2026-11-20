import type { Claim, Intake, LedgerEvent, Task } from "@jarvistark/core";
import { contentHash } from "@jarvistark/core";

export interface ExportedFile {
	path: string;
	content: string;
}

export function generateMarkdownPlan(
	intake: Intake | null,
	claims: Claim[],
	tasks: Task[],
): ExportedFile[] {
	const files: ExportedFile[] = [];

	// 1. Brief.md
	const briefBody = `# Project Brief\n\n## Original Input\n\n> ${intake?.originalText ?? "No input specified"}\n\n**Recorded:** ${intake?.recordedAt ?? new Date().toISOString()}\n**Hash:** \`${intake?.hash ?? "N/A"}\`\n\n## Overview\n\nThis specification was derived using Jarvistark's system of record for intent.\n`;
	const briefHash = contentHash(briefBody);
	files.push({
		path: "docs/plan/brief.md",
		content: `<!-- content-hash: ${briefHash} -->\n${briefBody}`,
	});

	// 2. Requirements.md
	const reqClaims = claims.filter((c) => c.kind === "requirement");
	let reqBody =
		"# Requirements\n\n| ID | Requirement | Origin | State | Source |\n|---|---|---|---|---|\n";
	for (const r of reqClaims) {
		const sourceStr = r.source ? `${r.source.type}` : "none";
		reqBody += `| \`${r.id}\` | ${r.text} | ${r.origin} | ${r.state} | ${sourceStr} |\n`;
	}
	const reqHash = contentHash(reqBody);
	files.push({
		path: "docs/plan/requirements.md",
		content: `<!-- content-hash: ${reqHash} -->\n${reqBody}`,
	});

	// 3. Assumptions and Questions
	const assumptions = claims.filter((c) => c.kind === "assumption" || c.kind === "question");
	let assumpBody =
		"# Assumptions & Open Questions\n\n| ID | Kind | Text | State | Risk / Blocking |\n|---|---|---|---|---|\n";
	for (const a of assumptions) {
		const riskOrBlock = a.risk
			? `Risk: ${a.risk.level} (${a.risk.category})`
			: a.blocking
				? "Blocking: YES"
				: "Normal";
		assumpBody += `| \`${a.id}\` | ${a.kind} | ${a.text} | ${a.state} | ${riskOrBlock} |\n`;
	}
	const assumpHash = contentHash(assumpBody);
	files.push({
		path: "docs/plan/assumptions.md",
		content: `<!-- content-hash: ${assumpHash} -->\n${assumpBody}`,
	});

	// 4. Tasks.md
	let tasksBody =
		"# Implementation Task Graph\n\n| Task ID | Title | State | Needs | Depends On |\n|---|---|---|---|---|\n";
	for (const t of tasks) {
		tasksBody += `| \`${t.id}\` | ${t.title} | **${t.state}** | ${t.needs.join(", ") || "-"} | ${t.dependsOn.join(", ") || "-"} |\n`;
	}
	const tasksHash = contentHash(tasksBody);
	files.push({
		path: "docs/plan/tasks.md",
		content: `<!-- content-hash: ${tasksHash} -->\n${tasksBody}`,
	});

	return files;
}

export function generateCanonicalLedgerFiles(
	intake: Intake | null,
	_claims: Claim[],
	events: LedgerEvent[],
	_tasks: Task[],
): ExportedFile[] {
	const files: ExportedFile[] = [];

	// .jarvistark/input/original.md
	if (intake) {
		files.push({
			path: ".jarvistark/input/original.md",
			content: intake.originalText,
		});
	}

	// .jarvistark/ledger/events.ndjson
	const ndjson = `${events.map((e) => JSON.stringify(e)).join("\n")}\n`;
	files.push({
		path: ".jarvistark/ledger/events.ndjson",
		content: ndjson,
	});

	return files;
}

/**
 * Trigger in-browser download of text content as a file.
 */
export function downloadFile(filename: string, content: string, mimeType = "text/plain"): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
