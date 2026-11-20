import {
	type Claim,
	type Intake,
	JarvistarkGate,
	type LedgerEvent,
	type Proposal,
	type Task,
	verifyLedgerChain,
} from "@jarvistark/core";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { ClaimsTab } from "./components/ClaimsTab.js";
import { ClarificationTab } from "./components/ClarificationTab.js";
import { ExportTab } from "./components/ExportTab.js";
import { IntakeTab } from "./components/IntakeTab.js";
import { LedgerTab } from "./components/LedgerTab.js";
import { type ActiveTab, Navbar } from "./components/Navbar.js";
import { TasksTab } from "./components/TasksTab.js";
import {
	type PlannerQuestion,
	generateClarificationQuestions,
	synthesizeProposal,
} from "./services/planner.js";
import { PRESETS } from "./services/presets.js";
import { BrowserStorage } from "./services/storage.js";

const storage = new BrowserStorage();

export const App: React.FC = () => {
	const [gate, setGate] = useState<JarvistarkGate | null>(null);
	const [activeTab, setActiveTab] = useState<ActiveTab>("intake");

	// Core State
	const [intake, setIntake] = useState<Intake | null>(null);
	const [claims, setClaims] = useState<Claim[]>([]);
	const [tasks, setTasks] = useState<ReturnType<JarvistarkGate["getTasks"]>>([]);
	const [actionError, setActionError] = useState<string | null>(null);
	const runAction = async (action: () => Promise<void>) => {
		setActionError(null);
		try {
			await action();
		} catch (error) {
			setActionError(error instanceof Error ? error.message : String(error));
		}
	};
	const [events, setEvents] = useState<LedgerEvent[]>([]);
	const [tamperedEvents, setTamperedEvents] = useState<LedgerEvent[] | null>(null);

	// Clarification Interview State
	const [questions, setQuestions] = useState<PlannerQuestion[]>([]);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [isSynthesizing, setIsSynthesizing] = useState(false);

	// Validation Findings
	const [validationErrors, setValidationErrors] = useState<string[]>([]);

	// Initialize gate from storage on mount
	const reloadState = useCallback(async (activeGate: JarvistarkGate) => {
		const currentIntake = activeGate.getIntake();
		const currentClaims = activeGate.getClaims();
		const currentEvents = activeGate.getEvents();
		const currentTasks = activeGate.getTasks();

		setIntake(currentIntake);
		setClaims(currentClaims);
		setEvents(currentEvents);
		setTasks(currentTasks);

		if (currentIntake) {
			const preset = PRESETS.find((p) => p.originalText === currentIntake.originalText);
			setQuestions(
				preset
					? preset.clarificationQuestions.map((q) => ({
							id: q.id,
							text: q.text,
							options: (q.options ?? []).map((o) => ({
								text: o.text,
								recommended: o.recommended ?? false,
							})),
							recommendation: q.recommendation ?? "",
						}))
					: generateClarificationQuestions(currentIntake.originalText),
			);
		}

		// Restore questions/answers if intake has clarifications
		if (currentIntake && currentIntake.clarifications.length > 0) {
			const sess = currentIntake.clarifications[0];
			const answerMap: Record<string, string> = {};
			for (const q of sess.questions) {
				answerMap[q.id] = q.answer;
			}
			setAnswers(answerMap);
		}

		// Run gate validation
		const valResult = await activeGate.validate();
		const errs = valResult.findings.map((f) => `[${f.severity.toUpperCase()}] ${f.message}`);
		setValidationErrors(errs);
	}, []);

	useEffect(() => {
		const init = async () => {
			const initialGate = await JarvistarkGate.create(storage);
			setGate(initialGate);
			await reloadState(initialGate);
		};
		init().catch((error) => setActionError(error instanceof Error ? error.message : String(error)));
	}, [reloadState]);

	// Apply a full preset to gate and storage
	const applyPreset = async (activeGate: JarvistarkGate, preset: (typeof PRESETS)[0]) => {
		// 1. Record Intake
		await activeGate.recordIntake(preset.originalText);

		// 2. Record clarifications
		const now = new Date().toISOString();
		for (const q of preset.clarificationQuestions) {
			const normalizedOptions = q.options?.map((opt) => ({
				text: opt.text,
				recommended: opt.recommended ?? false,
			}));

			await activeGate.recordClarification("SESS-001", {
				id: q.id,
				text: q.text,
				options: normalizedOptions,
				recommendation: q.recommendation,
				answer: q.answer,
				answeredAt: now,
			});
		}

		// 3. Propose claims
		const proposed = await activeGate.propose(preset.proposal);
		if (!proposed.ok) throw new Error(proposed.errors.map((e) => e.message).join("; "));

		// 4. Save tasks to storage
		for (const task of preset.tasks) {
			await activeGate.proposeTask({
				title: task.title,
				needs: task.needs,
				dependsOn: task.dependsOn,
				checks: task.checks.map(({ command, expect }) => ({ command, expect })),
			});
		}

		// Set interview questions
		setQuestions(
			preset.clarificationQuestions.map((q) => ({
				id: q.id,
				text: q.text,
				options: (q.options ?? []).map((opt) => ({
					text: opt.text,
					recommended: opt.recommended ?? false,
				})),
				recommendation: q.recommendation ?? "",
			})),
		);

		const ansMap: Record<string, string> = {};
		for (const q of preset.clarificationQuestions) {
			ansMap[q.id] = q.answer;
		}
		setAnswers(ansMap);

		await reloadState(activeGate);
	};

	// 1. Submit Idea (Intake)
	const handleSubmitIdea = async (text: string, _profileId: string, presetId?: string) => {
		if (!gate) return;

		if (
			intake &&
			!window.confirm("Start a new workspace? Export the current one first if you want to keep it.")
		)
			return;

		// Check if matches preset
		const preset = PRESETS.find((p) => p.id === presetId || p.originalText.trim() === text.trim());
		if (preset) {
			storage.clear();
			const freshGate = await JarvistarkGate.create(storage);
			setGate(freshGate);
			await applyPreset(freshGate, preset);
			setActiveTab("claims");
			return;
		}

		// Otherwise, fresh custom flow
		storage.clear();
		const freshGate = await JarvistarkGate.create(storage);
		setGate(freshGate);

		await freshGate.recordIntake(text);

		// Generate dynamic questions
		const qs = generateClarificationQuestions(text);
		setQuestions(qs);
		setAnswers({});

		await reloadState(freshGate);
		setActiveTab("clarify");
	};

	// 2. Answer Question (Interview)
	const handleAnswerQuestion = async (qId: string, answer: string) => {
		if (!gate) return;

		const qObj = questions.find((q) => q.id === qId);
		const questionText = qObj?.text ?? qId;

		await gate.recordClarification("SESS-001", {
			id: qId,
			text: questionText,
			answer,
			answeredAt: new Date().toISOString(),
		});

		setAnswers((prev) => ({ ...prev, [qId]: answer }));
		await reloadState(gate);
	};

	// 3. Synthesize Claims from Interview
	const handleSynthesizeProposal = async () => {
		if (!gate || !intake) return;
		setIsSynthesizing(true);
		try {
			const proposal = synthesizeProposal(intake.originalText, answers);
			const result = await gate.propose(proposal);
			if (!result.ok) throw new Error(result.errors.map((e) => e.message).join("; "));

			if (result.ok) {
				// Derive starter tasks from minted claims
				const mintedEntries = Object.entries(result.minted);
				const claimIds = mintedEntries.map(([, cid]) => cid);

				const derivedTasks: Task[] = [
					{
						id: "TSK-001",
						title: "Project Initialization & Schema Setup",
						needs: claimIds.slice(0, 2),
						dependsOn: [],
						state: "ready",
						checks: [
							{
								id: "CHK-INIT-1",
								command: "pnpm test",
								expect: "All test suites pass",
							},
						],
					},
					{
						id: "TSK-002",
						title: "Core Service Implementation",
						needs: claimIds.length > 2 ? claimIds.slice(2) : claimIds,
						dependsOn: ["TSK-001"],
						state: "blocked",
						checks: [
							{
								id: "CHK-CORE-1",
								command: "pnpm build",
								expect: "Zero compilation errors",
							},
						],
					},
				];

				for (const t of derivedTasks) {
					await gate.proposeTask({
						title: t.title,
						needs: t.needs,
						dependsOn: t.dependsOn,
						checks: t.checks.map(({ command, expect }) => ({ command, expect })),
					});
				}

				await reloadState(gate);
				setActiveTab("claims");
			}
		} finally {
			setIsSynthesizing(false);
		}
	};

	// 4. Claims Approval Gate
	const handleApproveClaim = async (claimId: string) => {
		if (!gate) return;
		await gate.approve([claimId], "reviewer");
		await reloadState(gate);
	};

	const handleApproveAll = async () => {
		if (!gate) return;
		const proposedIds = claims
			.filter((c) => c.state === "proposed" && c.kind !== "question")
			.map((c) => c.id);
		if (proposedIds.length === 0) return;
		await gate.approve(proposedIds, "reviewer");
		await reloadState(gate);
	};

	const handleRejectClaim = async (claimId: string) => {
		if (!gate) return;
		await gate.reject([claimId], "reviewer", "Rejected via web gate");
		await reloadState(gate);
	};

	const handleReviseClaim = async (targetClaimId: string, newText: string) => {
		if (!gate) return;
		const proposal: Proposal = {
			id: `PRP-${Date.now().toString().slice(-4)}`,
			planner: { role: "person", id: "web-reviewer" },
			ops: [
				{
					op: "revise",
					key: "$revised",
					target: targetClaimId,
					claim: { text: newText },
				},
			],
			createdAt: new Date().toISOString(),
		};

		const result = await gate.propose(proposal);
		if (!result.ok) throw new Error(result.errors.map((e) => e.message).join("; "));
		await reloadState(gate);
	};

	// 5. Tasks & Checks
	const handleUpdateTaskState = async (taskId: string, newState: Task["state"]) => {
		if (!gate) return;
		try {
			if (newState === "ready") await gate.approveTask(taskId, "web-reviewer");
			else if (newState === "in-progress") await gate.startTask(taskId);
			else if (newState === "done") await gate.done(taskId);
			await reloadState(gate);
		} catch (error) {
			window.alert(error instanceof Error ? error.message : String(error));
		}
	};

	const handleVerifyCheck = async (taskId: string, checkId: string, passed: boolean) => {
		if (!gate) return;
		const check = tasks.find((t) => t.id === taskId)?.checks.find((c) => c.id === checkId);
		if (!check) return;
		const output = window.prompt(
			"Paste the actual check output. This is a self-reported result; CLI runner verification is required for completion.",
		);
		if (output === null) return;
		try {
			await gate.recordEvidence(taskId, {
				checkId,
				command: check.command,
				executedBy: "web-reviewer",
				output,
				exitCode: passed ? 0 : 1,
				at: new Date().toISOString(),
			});
			await reloadState(gate);
		} catch (error) {
			window.alert(error instanceof Error ? error.message : String(error));
		}
	};

	// 6. Tamper Simulation for Cryptographic Ledger Verification
	const handleTamperTest = (tamper: boolean) => {
		if (tamper && events.length > 0) {
			const tampered = events.map((e, idx) => {
				if (idx === 1 || (idx === 0 && events.length === 1)) {
					return { ...e, hash: "tampered-hash-000000000000000000000000000000000000000000000000" };
				}
				return e;
			});
			setTamperedEvents(tampered);
		} else {
			setTamperedEvents(null);
		}
	};

	// 7. Workspace Export & Import
	const handleExportWorkspace = () => {
		const exported = storage.exportAll();
		const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `jarvistark-workspace-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handleImportWorkspace = async (jsonStr: string) => {
		try {
			const data = JSON.parse(jsonStr);
			await storage.importAll(data);
			const freshGate = await JarvistarkGate.create(storage);
			setGate(freshGate);
			await reloadState(freshGate);
			setActiveTab("claims");
		} catch (err) {
			window.alert(err instanceof Error ? err.message : String(err));
		}
	};

	const handleClearWorkspace = async () => {
		if (!window.confirm("Are you sure you want to reset and clear this workspace?")) return;
		storage.clear();
		const freshGate = await JarvistarkGate.create(storage);
		setGate(freshGate);
		setQuestions([]);
		setAnswers({});
		await reloadState(freshGate);
		setActiveTab("intake");
	};

	const displayedEvents = tamperedEvents ?? events;
	const chainIntegrity = verifyLedgerChain(displayedEvents);

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
			<Navbar
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				chainValid={chainIntegrity.valid}
				claimsCount={claims.length}
				tasksCount={tasks.length}
				eventsCount={displayedEvents.length}
			/>

			<main className="flex-1 pb-16">
				{actionError && (
					<p role="alert" className="mx-auto max-w-5xl p-4 text-rose-300">
						{actionError}
					</p>
				)}
				{activeTab === "intake" && (
					<IntakeTab
						onSubmitIdea={(...args) => runAction(() => handleSubmitIdea(...args))}
						existingText={intake?.originalText}
					/>
				)}

				{activeTab === "clarify" && (
					<ClarificationTab
						questions={questions}
						answers={answers}
						onAnswerQuestion={(...args) => runAction(() => handleAnswerQuestion(...args))}
						onSynthesizeProposal={() => runAction(handleSynthesizeProposal)}
						isSynthesizing={isSynthesizing}
					/>
				)}

				{activeTab === "claims" && (
					<ClaimsTab
						claims={claims}
						onApproveClaim={(id) => runAction(() => handleApproveClaim(id))}
						onApproveAll={() => runAction(handleApproveAll)}
						onRejectClaim={(id) => runAction(() => handleRejectClaim(id))}
						onReviseClaim={(...args) => runAction(() => handleReviseClaim(...args))}
						validationErrors={validationErrors}
					/>
				)}

				{activeTab === "tasks" && (
					<TasksTab
						tasks={tasks}
						getPrompt={(id) => {
							if (!gate) throw new Error("Workspace is loading");
							return gate.renderPrompt(id);
						}}
						claims={claims}
						onUpdateTaskState={handleUpdateTaskState}
						onVerifyCheck={handleVerifyCheck}
					/>
				)}

				{activeTab === "ledger" && (
					<LedgerTab events={displayedEvents} onTamperTest={handleTamperTest} />
				)}

				{activeTab === "export" && (
					<ExportTab
						intake={intake}
						claims={claims}
						tasks={tasks}
						events={events}
						onExportWorkspace={handleExportWorkspace}
						onImportWorkspace={handleImportWorkspace}
						onClearWorkspace={handleClearWorkspace}
					/>
				)}
			</main>
		</div>
	);
};
