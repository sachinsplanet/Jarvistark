import type { Claim } from "@jarvistark/core";
import {
	AlertTriangle,
	Check,
	Edit3,
	FileText,
	History,
	Layers,
	ShieldCheck,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

interface ClaimsTabProps {
	claims: Claim[];
	onApproveClaim: (claimId: string) => Promise<void>;
	onApproveAll: () => Promise<void>;
	onRejectClaim: (claimId: string) => Promise<void>;
	onReviseClaim: (targetClaimId: string, newText: string) => Promise<void>;
	validationErrors: string[];
}

export const ClaimsTab: React.FC<ClaimsTabProps> = ({
	claims,
	onApproveClaim,
	onApproveAll,
	onRejectClaim,
	onReviseClaim,
	validationErrors,
}) => {
	const [activeKindFilter, setActiveKindFilter] = useState<string>("all");
	const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
	const [reviseText, setReviseText] = useState<string>("");

	const proposedClaims = claims.filter((c) => c.state === "proposed");
	const acceptedClaims = claims.filter((c) => c.state === "accepted");
	const supersededClaims = claims.filter((c) => c.state === "superseded");

	const filteredClaims =
		activeKindFilter === "all" ? claims : claims.filter((c) => c.kind === activeKindFilter);

	const handleOpenRevise = (claim: Claim) => {
		setEditingClaim(claim);
		setReviseText(claim.text);
	};

	const handleConfirmRevise = async () => {
		if (!editingClaim || !reviseText.trim()) return;
		await onReviseClaim(editingClaim.id, reviseText.trim());
		setEditingClaim(null);
		setReviseText("");
	};

	return (
		<div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
				<div>
					<div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full mb-1">
						<ShieldCheck className="w-3.5 h-3.5" />
						<span>Stage 3: Review & Human Approval Gate</span>
					</div>
					<h2 className="text-2xl font-bold text-white tracking-tight">Claims Ledger & Approval</h2>
					<p className="text-xs text-slate-400 mt-0.5">
						Models propose, people accept, code verifies. No claim enters the accepted specification
						without explicit human approval.
					</p>
				</div>

				<div className="flex items-center gap-2">
					{proposedClaims.length > 0 && (
						<button
							type="button"
							onClick={onApproveAll}
							className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20"
						>
							<Check className="w-3.5 h-3.5" />
							<span>Approve All Proposed ({proposedClaims.length})</span>
						</button>
					)}
				</div>
			</div>

			{/* Validation summary banner */}
			{validationErrors.length > 0 && (
				<div className="p-4 rounded-xl bg-amber-950/40 border border-amber-900/80 text-amber-300 text-xs space-y-1">
					<div className="flex items-center gap-2 font-semibold text-amber-400">
						<AlertTriangle className="w-4 h-4 shrink-0" />
						<span>Gate Validation Warnings ({validationErrors.length})</span>
					</div>
					<ul className="list-disc pl-6 space-y-0.5 text-amber-200/90 text-[11px]">
						{validationErrors.map((err) => (
							<li key={err}>{err}</li>
						))}
					</ul>
				</div>
			)}

			{/* Filter Tabs & Stats Bar */}
			<div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-2 rounded-xl">
				<div className="flex items-center gap-1">
					{["all", "requirement", "constraint", "assumption", "question", "decision"].map(
						(kind) => (
							<button
								key={kind}
								type="button"
								onClick={() => setActiveKindFilter(kind)}
								className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
									activeKindFilter === kind
										? "bg-slate-800 text-white shadow-sm font-semibold"
										: "text-slate-400 hover:text-slate-200"
								}`}
							>
								{kind}
							</button>
						),
					)}
				</div>

				<div className="flex items-center gap-3 text-xs font-mono pr-2">
					<span className="text-amber-400">{proposedClaims.length} proposed</span>
					<span className="text-slate-600">|</span>
					<span className="text-emerald-400">{acceptedClaims.length} accepted</span>
					<span className="text-slate-600">|</span>
					<span className="text-slate-500">{supersededClaims.length} superseded</span>
				</div>
			</div>

			{/* Claims Cards */}
			{filteredClaims.length === 0 ? (
				<div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
					<Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
					<h3 className="text-base font-semibold text-slate-300">No claims recorded yet</h3>
					<p className="text-xs text-slate-500 mt-1">
						Complete the interview or load a preset in the Intake tab.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{filteredClaims.map((claim) => {
						const isProposed = claim.state === "proposed";
						const isAccepted = claim.state === "accepted";
						const isSuperseded = claim.state === "superseded";

						return (
							<div
								key={claim.id}
								className={`p-4 rounded-xl border transition-all ${
									isProposed
										? "bg-slate-900/90 border-amber-500/30"
										: isAccepted
											? "bg-slate-900/50 border-emerald-500/20"
											: "bg-slate-950/40 border-slate-800/80 opacity-60"
								}`}
							>
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
									<div className="space-y-1.5 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
												{claim.id}
											</span>

											{/* Kind badge */}
											<span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
												{claim.kind}
											</span>

											{/* State badge */}
											<span
												className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
													isAccepted
														? "bg-emerald-950 text-emerald-400 border border-emerald-800"
														: isProposed
															? "bg-amber-950 text-amber-300 border border-amber-800"
															: isSuperseded
																? "bg-slate-800 text-slate-400 line-through"
																: "bg-rose-950 text-rose-400"
												}`}
											>
												{claim.state}
											</span>

											{/* Origin / Source */}
											{claim.source && (
												<span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
													<FileText className="w-3 h-3 text-slate-500" />
													<span>{claim.source.type}</span>
												</span>
											)}

											{/* Risk assessment indicator */}
											{claim.risk && (
												<span
													className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
														claim.risk.level === "high"
															? "bg-rose-950/80 text-rose-400 border-rose-800"
															: "bg-amber-950/80 text-amber-400 border-amber-800"
													}`}
												>
													<AlertTriangle className="w-3 h-3" />
													<span>
														Risk: {claim.risk.level} ({claim.risk.category})
													</span>
												</span>
											)}

											{/* Blocking flag */}
											{claim.blocking && (
												<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
													Blocking
												</span>
											)}
										</div>

										{/* Text */}
										<p
											className={`text-sm text-slate-200 leading-relaxed font-sans ${
												isSuperseded ? "line-through text-slate-500" : ""
											}`}
										>
											{claim.text}
										</p>

										{/* Risk note / Superseded pointer */}
										{claim.risk?.note && (
											<p className="text-xs text-amber-300/80 italic">Note: {claim.risk.note}</p>
										)}
										{claim.supersededBy && (
											<div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
												<History className="w-3 h-3 text-slate-500" />
												<span>Superseded by {claim.supersededBy}</span>
											</div>
										)}
									</div>

									{/* Action buttons */}
									{isProposed && (
										<div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0">
											<button
												type="button"
												onClick={() => onApproveClaim(claim.id)}
												title="Accept claim"
												className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 transition-all"
											>
												<Check className="w-4 h-4" />
											</button>
											<button
												type="button"
												onClick={() => handleOpenRevise(claim)}
												title="Propose revision"
												className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
											>
												<Edit3 className="w-4 h-4" />
											</button>
											<button
												type="button"
												onClick={() => onRejectClaim(claim.id)}
												title="Reject claim"
												className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/30 transition-all"
											>
												<X className="w-4 h-4" />
											</button>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Revise Modal */}
			{editingClaim && (
				<div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
						<div className="flex items-center justify-between border-b border-slate-800 pb-3">
							<h3 className="font-bold text-base text-white flex items-center gap-2">
								<Edit3 className="w-4 h-4 text-emerald-400" />
								<span>Propose Revision for {editingClaim.id}</span>
							</h3>
							<button
								type="button"
								onClick={() => setEditingClaim(null)}
								className="text-slate-400 hover:text-slate-200"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<p className="text-xs text-slate-400">
							Revisions do not edit accepted claims in place. A new proposed claim will be submitted
							that supersedes {editingClaim.id} only when approved.
						</p>

						<div className="space-y-1">
							<label htmlFor="revise-text-input" className="text-xs font-semibold text-slate-300">
								Revised Claim Text
							</label>
							<textarea
								id="revise-text-input"
								rows={4}
								value={reviseText}
								onChange={(e) => setReviseText(e.target.value)}
								className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
							/>
						</div>

						<div className="flex justify-end gap-2 pt-2">
							<button
								type="button"
								onClick={() => setEditingClaim(null)}
								className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-all"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleConfirmRevise}
								disabled={!reviseText.trim()}
								className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 transition-all"
							>
								Submit Revision Proposal
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
