import type { Claim, JarvistarkGate, Task } from "@jarvistark/core";
import {
	Check,
	CheckCircle2,
	CheckSquare,
	Clock,
	Code2,
	Copy,
	Layers,
	Play,
	Terminal,
	XCircle,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

interface TasksTabProps {
	tasks: ReturnType<JarvistarkGate["getTasks"]>;
	claims: Claim[];
	getPrompt: (id: string) => string;
	onUpdateTaskState: (taskId: string, newState: Task["state"]) => Promise<void>;
	onVerifyCheck: (taskId: string, checkId: string, passed: boolean) => Promise<void>;
}

export const TasksTab: React.FC<TasksTabProps> = ({
	tasks,
	getPrompt,
	onUpdateTaskState,
	onVerifyCheck,
}) => {
	const [activeFilter, setActiveFilter] = useState<string>("all");
	const [selectedTaskForPrompt, setSelectedTaskForPrompt] = useState<Task | null>(null);
	const [copied, setCopied] = useState(false);

	const filteredTasks =
		activeFilter === "all" ? tasks : tasks.filter((t) => t.state === activeFilter);

	const readyTasks = tasks.filter((t) => t.state === "ready");
	const doneTasks = tasks.filter((t) => t.state === "done");
	const blockedTasks = tasks.filter((t) => t.state === "blocked");

	const generateAgentPrompt = (task: Task): string => {
		try {
			return getPrompt(task.id);
		} catch (error) {
			return `Task is blocked: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const handleCopyPrompt = (task: Task) => {
		const prompt = generateAgentPrompt(task);
		navigator.clipboard.writeText(prompt);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
				<div>
					<div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full mb-1">
						<CheckSquare className="w-3.5 h-3.5" />
						<span>Stage 4: Implementation Task Graph</span>
					</div>
					<h2 className="text-2xl font-bold text-white tracking-tight">
						Derived Tasks & Coding Prompts
					</h2>
					<p className="text-xs text-slate-400 mt-0.5">
						Review task commands before approval. Browser results are self-reported; use the CLI to
						run checks. Each task includes acceptance checks and assembled agent prompt context.
					</p>
				</div>

				<div className="flex items-center gap-3 text-xs font-mono">
					<span className="text-emerald-400 font-bold">{readyTasks.length} Ready</span>
					<span className="text-slate-600">|</span>
					<span className="text-amber-400 font-bold">{blockedTasks.length} Blocked</span>
					<span className="text-slate-600">|</span>
					<span className="text-slate-400 font-bold">{doneTasks.length} Done</span>
				</div>
			</div>

			{/* Filter Controls */}
			<div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 p-1.5 rounded-xl">
				{["all", "ready", "blocked", "in-progress", "done"].map((filter) => (
					<button
						key={filter}
						type="button"
						onClick={() => setActiveFilter(filter)}
						className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
							activeFilter === filter
								? "bg-slate-800 text-white font-semibold shadow-sm"
								: "text-slate-400 hover:text-slate-200"
						}`}
					>
						{filter}
					</button>
				))}
			</div>

			{/* Task Cards */}
			{filteredTasks.length === 0 ? (
				<div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
					<Terminal className="w-10 h-10 text-slate-600 mx-auto mb-3" />
					<h3 className="text-base font-semibold text-slate-300">No tasks in this category</h3>
					<p className="text-xs text-slate-500 mt-1">
						Approve proposed claims to synthesize and unlock tasks.
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{filteredTasks.map((task) => {
						const isReady = task.state === "ready";
						const isDone = task.state === "done";
						const isBlocked = task.state === "blocked";
						const isInProgress = task.state === "in-progress";

						return (
							<div
								key={task.id}
								className={`p-5 rounded-2xl border transition-all ${
									isReady
										? "bg-slate-900/90 border-emerald-500/30 shadow-sm"
										: isDone
											? "bg-slate-900/40 border-slate-800 opacity-80"
											: isBlocked
												? "bg-slate-950/60 border-amber-900/40"
												: "bg-slate-900/70 border-sky-500/30"
								}`}
							>
								{/* Task Header */}
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200">
												{task.id}
											</span>
											<span
												className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
													isReady
														? "bg-emerald-950 text-emerald-400 border border-emerald-800"
														: isDone
															? "bg-slate-800 text-slate-400 line-through"
															: isBlocked
																? "bg-amber-950 text-amber-300 border border-amber-800"
																: "bg-sky-950 text-sky-400 border border-sky-800"
												}`}
											>
												{task.state}
											</span>
										</div>
										<h3 className="text-base font-bold text-white">{task.title}</h3>
									</div>

									{/* Action buttons */}
									<div className="flex items-center gap-2 shrink-0">
										<button
											type="button"
											onClick={() => setSelectedTaskForPrompt(task)}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700"
										>
											<Code2 className="w-3.5 h-3.5 text-emerald-400" />
											<span>Agent Prompt</span>
										</button>

										{task.approval === undefined && (
											<button
												type="button"
												onClick={() => onUpdateTaskState(task.id, "ready")}
												className="text-xs text-amber-300"
											>
												Approve task & checks
											</button>
										)}

										{(isReady || task.state === "failed") && (
											<button
												type="button"
												onClick={() => onUpdateTaskState(task.id, "in-progress")}
												className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 transition-all"
											>
												<Play className="w-3.5 h-3.5" />
												<span>{task.state === "failed" ? "Retry" : "Start"}</span>
											</button>
										)}

										{isInProgress &&
											task.checks.every(
												(c) =>
													c.result?.status === "passed" &&
													c.result.attestation === "runner-verified",
											) && (
												<button
													type="button"
													onClick={() => onUpdateTaskState(task.id, "done")}
													className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all"
												>
													<Check className="w-3.5 h-3.5" />
													<span>Complete</span>
												</button>
											)}
									</div>
								</div>

								{/* Implements & Dependencies */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs font-mono">
									<div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
										<div className="text-slate-500 text-[11px] mb-1 flex items-center gap-1">
											<Layers className="w-3 h-3 text-emerald-400" />
											<span>Implements Claims:</span>
										</div>
										<div className="flex flex-wrap gap-1">
											{task.needs.map((cid) => (
												<span
													key={cid}
													className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px]"
												>
													{cid}
												</span>
											))}
										</div>
									</div>

									<div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
										<div className="text-slate-500 text-[11px] mb-1 flex items-center gap-1">
											<Clock className="w-3 h-3 text-sky-400" />
											<span>Prerequisites:</span>
										</div>
										<div className="flex flex-wrap gap-1">
											{task.dependsOn.length > 0 ? (
												task.dependsOn.map((tid) => (
													<span
														key={tid}
														className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px]"
													>
														{tid}
													</span>
												))
											) : (
												<span className="text-slate-500 italic text-[11px]">None (Root task)</span>
											)}
										</div>
									</div>
								</div>

								{task.blockedReasons.length > 0 && (
									<p className="mb-3 text-xs text-amber-300">{task.blockedReasons.join(". ")}</p>
								)}
								{/* Acceptance Checks */}
								<div className="space-y-2">
									<div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
										<Terminal className="w-3.5 h-3.5 text-emerald-400" />
										<span>Acceptance Checks ({task.checks.length})</span>
									</div>

									<div className="space-y-2">
										{task.checks.map((chk) => {
											const status = chk.result?.status ?? "pending";
											const isPassed = status === "passed";
											const isFailed = status === "failed";

											return (
												<div
													key={chk.id}
													className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
												>
													<div className="space-y-1">
														<div className="flex items-center gap-2">
															<span className="font-mono text-[11px] font-bold text-slate-400">
																{chk.id}
															</span>
															<span
																className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${
																	isPassed
																		? "bg-emerald-950 text-emerald-400 border border-emerald-900"
																		: isFailed
																			? "bg-rose-950 text-rose-400 border border-rose-900"
																			: "bg-slate-900 text-slate-400 border border-slate-800"
																}`}
															>
																{isPassed ? (
																	<CheckCircle2 className="w-2.5 h-2.5" />
																) : isFailed ? (
																	<XCircle className="w-2.5 h-2.5" />
																) : (
																	<Clock className="w-2.5 h-2.5" />
																)}
																<span>{status}</span>
															</span>
														</div>
														<div className="font-mono text-xs text-emerald-300 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
															$ {chk.command}
														</div>
														<div className="text-xs text-slate-400">
															Expect:{" "}
															<span className="text-slate-300 font-medium">{chk.expect}</span>
														</div>
													</div>

													{/* Verification trigger */}
													<div className="flex items-center gap-1.5 shrink-0">
														<button
															type="button"
															onClick={() => onVerifyCheck(task.id, chk.id, true)}
															className={`p-1.5 rounded-lg border text-xs transition-all ${
																isPassed
																	? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
																	: "bg-slate-900 hover:bg-emerald-950 hover:text-emerald-300 text-slate-400 border-slate-800"
															}`}
															title="Report a passed check (self-reported)"
														>
															<Check className="w-3.5 h-3.5" />
														</button>
														<button
															type="button"
															onClick={() => onVerifyCheck(task.id, chk.id, false)}
															className={`p-1.5 rounded-lg border text-xs transition-all ${
																isFailed
																	? "bg-rose-500 text-slate-950 border-rose-400 font-bold"
																	: "bg-slate-900 hover:bg-rose-950 hover:text-rose-300 text-slate-400 border-slate-800"
															}`}
															title="Report a failed check (self-reported)"
														>
															<XCircle className="w-3.5 h-3.5" />
														</button>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Agent Prompt Modal */}
			{selectedTaskForPrompt && (
				<div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
						<div className="flex items-center justify-between border-b border-slate-800 pb-3">
							<div className="flex items-center gap-2">
								<Terminal className="w-5 h-5 text-emerald-400" />
								<h3 className="font-bold text-base text-white">
									Compiled Agent Prompt ({selectedTaskForPrompt.id})
								</h3>
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => handleCopyPrompt(selectedTaskForPrompt)}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-sm"
								>
									{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
									<span>{copied ? "Copied!" : "Copy Prompt"}</span>
								</button>
								<button
									type="button"
									onClick={() => setSelectedTaskForPrompt(null)}
									className="text-slate-400 hover:text-slate-200 text-lg px-2"
								>
									✕
								</button>
							</div>
						</div>

						<p className="text-xs text-slate-400">
							This is the fully assembled context packet for coding agents (e.g. Claude Code,
							Cursor, Aider, Antigravity) via{" "}
							<code className="font-mono text-emerald-400">jarvistark next</code>.
						</p>

						<pre className="flex-1 overflow-auto bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
							{generateAgentPrompt(selectedTaskForPrompt)}
						</pre>

						<div className="flex justify-end pt-2 border-t border-slate-800">
							<button
								type="button"
								onClick={() => setSelectedTaskForPrompt(null)}
								className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
