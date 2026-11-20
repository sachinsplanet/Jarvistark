import { ArrowRight, Check, HelpCircle, MessageSquare, Sparkles } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { PlannerQuestion } from "../services/planner.js";

interface ClarificationTabProps {
	questions: PlannerQuestion[];
	answers: Record<string, string>;
	onAnswerQuestion: (questionId: string, answer: string) => Promise<void>;
	onSynthesizeProposal: () => Promise<void>;
	isSynthesizing: boolean;
}

export const ClarificationTab: React.FC<ClarificationTabProps> = ({
	questions,
	answers,
	onAnswerQuestion,
	onSynthesizeProposal,
	isSynthesizing,
}) => {
	const [activeInputs, setActiveInputs] = useState<Record<string, string>>({});

	const handleOptionSelect = async (qId: string, optText: string) => {
		await onAnswerQuestion(qId, optText);
	};

	const handleCustomSubmit = async (qId: string) => {
		const val = activeInputs[qId];
		if (!val || !val.trim()) return;
		await onAnswerQuestion(qId, val.trim());
	};

	const answeredCount = Object.keys(answers).length;
	const _isComplete = questions.length > 0 && answeredCount >= questions.length;

	return (
		<div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
				<div>
					<div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full mb-1">
						<HelpCircle className="w-3.5 h-3.5" />
						<span>Stage 2: Clarification & Decision Gate</span>
					</div>
					<h2 className="text-2xl font-bold text-white tracking-tight">
						Structured Intent Interview
					</h2>
					<p className="text-xs text-slate-400 mt-0.5">
						Answer architecture-critical questions. Decisions are recorded in the ledger and guide
						claim extraction. Recorded answers are retained; revise the proposed claims to change
						decisions.
					</p>
				</div>

				<div className="flex items-center gap-3">
					<div className="text-right">
						<div className="text-xs text-slate-400">Progress</div>
						<div className="font-mono text-sm font-bold text-emerald-400">
							{answeredCount} / {questions.length} answered
						</div>
					</div>

					<button
						type="button"
						onClick={onSynthesizeProposal}
						disabled={answeredCount === 0 || isSynthesizing}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-500/20"
					>
						<Sparkles className="w-3.5 h-3.5" />
						<span>{isSynthesizing ? "Synthesizing..." : "Synthesize Claims"}</span>
						<ArrowRight className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			{questions.length === 0 ? (
				<div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
					<MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
					<h3 className="text-base font-semibold text-slate-300">No active interview questions</h3>
					<p className="text-xs text-slate-500 mt-1">
						Start by recording an idea in the Intake tab.
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{questions.map((q, _idx) => {
						const currentAnswer = answers[q.id];
						return (
							<div
								key={q.id}
								className={`p-6 rounded-2xl border transition-all ${
									currentAnswer
										? "bg-slate-900/90 border-emerald-500/30"
										: "bg-slate-900/50 border-slate-800"
								}`}
							>
								<div className="flex items-start justify-between gap-4 mb-3">
									<div className="flex items-center gap-2">
										<span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
											{q.id}
										</span>
										<h3 className="font-semibold text-sm sm:text-base text-slate-100">{q.text}</h3>
									</div>
									{currentAnswer && (
										<span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full shrink-0">
											<Check className="w-3 h-3" /> Answered
										</span>
									)}
								</div>

								{/* Recommendation pill */}
								{q.recommendation && (
									<div className="mb-4 text-xs text-slate-400 flex items-center gap-1.5">
										<span className="text-emerald-400 font-semibold">Recommended:</span>
										<span>{q.recommendation}</span>
									</div>
								)}

								{/* Selectable Options */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
									{q.options?.map((opt) => {
										const isSelected = currentAnswer === opt.text;
										return (
											<button
												key={opt.text}
												type="button"
												disabled={!!currentAnswer}
												onClick={() => handleOptionSelect(q.id, opt.text)}
												className={`text-left p-3 rounded-xl border text-xs transition-all flex items-start justify-between gap-2 ${
													isSelected
														? "bg-emerald-500/20 border-emerald-500 text-emerald-200 font-medium"
														: "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950"
												}`}
											>
												<span>{opt.text}</span>
												{opt.recommended && !isSelected && (
													<span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900 shrink-0">
														Rec
													</span>
												)}
												{isSelected && (
													<Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
												)}
											</button>
										);
									})}
								</div>

								{/* Custom write-in */}
								<div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
									<input
										type="text"
										aria-label={`Custom answer for ${q.text}`}
										disabled={!!currentAnswer}
										value={activeInputs[q.id] || ""}
										onChange={(e) => setActiveInputs({ ...activeInputs, [q.id]: e.target.value })}
										placeholder="Or specify custom answer..."
										className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
									/>
									<button
										type="button"
										onClick={() => handleCustomSubmit(q.id)}
										disabled={!!currentAnswer || !activeInputs[q.id]?.trim()}
										className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-all"
									>
										Set Answer
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
