import type { Claim, CompiledPrompt, Intake, JarvistarkGate, PromptHost } from "@jarvistark/core";

export function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

const e = escapeHtml;
const list = (items: string[]) => `<ul>${items.map((s) => `<li>${e(s)}</li>`).join("")}</ul>`;
const detail = (title: string, html: string) =>
	`<details><summary>${e(title)}</summary>${html}</details>`;
const exact = (value: unknown) =>
	detail("Full record", `<pre>${e(JSON.stringify(value, null, 2))}</pre>`);
const hidden = (name: string, value: string) =>
	`<input type="hidden" name="${name}" value="${e(value)}">`;
const button = (action: string, label: string, secondary = false) =>
	`<button type="submit" name="action" value="${action}"${secondary ? ' class="secondary"' : ""}>${label}</button>`;

function sourceText(claim: Claim, intake: Intake | null) {
	const s = claim.source;
	if (!s) return "";
	if (s.type === "input-span") return intake?.originalText.slice(s.start, s.end) ?? "";
	if (s.type === "observation") return `${s.file} — ${s.evidence}`;
	const question = intake?.clarifications
		.find((entry) => entry.id === s.sessionId)
		?.questions.find((q) => q.id === s.questionId);
	return question ? `${question.text} — ${question.answer}` : `${s.sessionId} / ${s.questionId}`;
}

function claimCard(
	claim: Claim,
	intake: Intake | null,
	links: ReturnType<JarvistarkGate["getWorkspace"]>["links"],
) {
	const source = sourceText(claim, intake);
	const check =
		claim.state === "proposed" ? `<input type="checkbox" name="claim" value="${e(claim.id)}">` : "";
	const relations = links
		.filter((link) => link.from === claim.id)
		.map((link) => `${link.rel} ${link.to}`);
	if (claim.supersedes) relations.push(`Replaces ${claim.supersedes}`);
	if (claim.retires) relations.push(`Retires ${claim.retires}`);
	return `<article><div class="meta">${e(claim.id)} · ${e(claim.kind)} · ${e(claim.origin)} · ${e(claim.state)}</div>
	<label class="item">${check}<span>${e(claim.text)}</span></label>
	${source ? `<blockquote>${e(source)}</blockquote>` : ""}${list(relations)}${exact(claim)}</article>`;
}

function taskCard(task: ReturnType<JarvistarkGate["getTasks"]>[number]) {
	const check = task.approval ? "" : `<input type="checkbox" name="task" value="${e(task.id)}">`;
	const execution = task.execution;
	const checks = task.checks
		.map((c) => `<li><code>${e(c.command)}</code><br>${e(c.expect)}</li>`)
		.join("");
	return `<article><div class="meta">${e(task.id)} · Revision ${task.revision} · ${task.approval ? e(task.state) : "awaiting approval"}</div>
	<label class="item">${check}<span>${e(task.title)}</span></label>
	${execution ? `<p>${e(execution.outcome)}</p>` : ""}
	<p class="meta">Requires ${e(task.needs.join(", "))} · Prerequisite tasks: ${e(task.dependsOn.join(", ") || "none")}</p>
	<h3>Acceptance checks</h3><ul>${checks}</ul>
	${
		execution
			? detail(
					"Design, environment and files",
					`<h3>Scope</h3>${list(execution.scope)}<h3>Design</h3>${list([...execution.design.userFlows, ...execution.design.interfaces.map((i) => `${i.name} — ${i.contract}`), ...execution.design.dataRules])}
		<h3>Environment</h3><p>${e(execution.environment.target)} · ${e(execution.environment.runtime)}</p>${list(execution.environment.prerequisites.map((p) => `${p.name} (${p.status}) — ${p.evidence}. Verify with ${p.verifyCommand}${p.setupCommand ? `. Setup: ${p.setupCommand}` : ""}`))}
		<h3>Files to read</h3>${list(execution.repository.map((f) => `${f.path} — ${f.purpose}`))}
		<h3>Deliverables</h3>${list(execution.deliverables.map((f) => `${f.path} — ${f.description}`))}`,
				)
			: ""
	}
	${list(task.blockedReasons)}${exact(task)}</article>`;
}

function buildControls(prompt: CompiledPrompt) {
	return `${hidden("buildTask", prompt.taskId ?? "")}${hidden("promptHash", prompt.contentHash)}
	<p>Send ${e(prompt.taskId ?? "")}, revision ${prompt.taskRevision}, to the active coding session.</p>
	${detail("Read the coding prompt", `<pre>${e(prompt.content)}</pre>`)}
	${button("build", "Start next task")}`;
}

export function renderReview(
	gate: JarvistarkGate,
	host: PromptHost,
	offerBuild: boolean,
	reviewer: string,
	notice: string,
) {
	const { intake, claims, links } = gate.getWorkspace();
	const plan = gate.getPlan();
	const pendingClaims = claims.some((c) => c.state === "proposed");
	const pendingTasks = plan.tasks.some((t) => !t.approval);
	let build = "";
	if (offerBuild && plan.complete) {
		try {
			const prompt = gate.getBuildPrompt(host);
			build = prompt
				? buildControls(prompt)
				: "<p>Check the task states above for work already started or completed.</p>";
		} catch (error) {
			build = `<p>${e(error instanceof Error ? error.message : String(error))}</p>`;
		}
	}
	const findings = plan.findings.map((f) => f.message);
	return `<h1>Review your plan</h1><p class="meta">Workspace <code>${e(host.workspace ?? "")}</code></p>
	${intake ? `<blockquote>${e(intake.originalText)}</blockquote>` : ""}
	${notice ? `<p role="status" class="notice">${e(notice)}</p>` : ""}
	<form method="post">${hidden("head", plan.ledgerHead)}
	<section><label>Your name <input type="text" name="by" autocomplete="name" required maxlength="120" value="${e(reviewer)}"></label>
	<p class="meta">Your name is recorded with each decision. Select the items you have reviewed.</p></section>
	<section><h2>Requirements and decisions</h2>${claims.map((c) => claimCard(c, intake, links)).join("") || "<p>No claims have been proposed.</p>"}
	${
		pendingClaims
			? `<div class="actions">${button("approve-claims", "Approve selected claims")}</div>
	<details><summary>Reject selected claims</summary><div class="actions"><label>Reason <input type="text" name="reason" maxlength="2000"></label>${button("reject-claims", "Record rejection", true)}</div></details>`
			: ""
	}</section>
	<section><h2>Implementation tasks</h2>${plan.tasks.map(taskCard).join("") || "<p>No tasks have been proposed.</p>"}
	${pendingTasks ? button("approve-tasks", "Approve selected tasks") : ""}</section>
	<section><h2>${plan.complete ? "Plan ready" : "Plan coverage"}</h2>
	${list(findings)}${list(plan.coverage.map((c) => `${c.claimId} → ${c.taskIds.join(", ") || "no task yet"}`))}
	${build}<div class="actions"><button class="secondary" name="action" value="return" formnovalidate>Return to Codex</button></div></section>
	</form><p class="meta">Reviewed version <code>${e(plan.ledgerHead)}</code></p>`;
}
