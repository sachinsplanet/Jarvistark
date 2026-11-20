import type { LedgerEvent } from "@jarvistark/core";
import { verifyLedgerChain } from "@jarvistark/core";
import {
	AlertOctagon,
	Check,
	Copy,
	FileCode,
	ListOrdered,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

interface LedgerTabProps {
	events: LedgerEvent[];
	onTamperTest?: (tamper: boolean) => void;
}

export const LedgerTab: React.FC<LedgerTabProps> = ({ events, onTamperTest }) => {
	const [showNdjson, setShowNdjson] = useState(false);
	const [copiedNdjson, setCopiedNdjson] = useState(false);
	const [tamperedState, setTamperedState] = useState(false);

	const verification = verifyLedgerChain(events);

	const ndjsonContent = events.map((e) => JSON.stringify(e)).join("\n");

	const handleCopyNdjson = () => {
		navigator.clipboard.writeText(ndjsonContent);
		setCopiedNdjson(true);
		setTimeout(() => setCopiedNdjson(false), 2000);
	};

	const toggleTamper = () => {
		const next = !tamperedState;
		setTamperedState(next);
		onTamperTest?.(next);
	};

	const renderEventPayload = (event: LedgerEvent) => {
		switch (event.type) {
			case "intake.recorded":
				return (
					<div className="text-xs font-mono text-slate-300">
						Input Hash: <span className="text-emerald-400">{event.inputHash.slice(0, 16)}...</span>
					</div>
				);
			case "clarification.recorded":
				return (
					<div className="text-xs text-slate-300 space-y-0.5">
						<div className="font-mono text-[11px] text-slate-400">
							Q: <span className="text-emerald-300">{event.questionId}</span> ({event.sessionId})
						</div>
						<div className="font-medium text-slate-200">A: {event.answer}</div>
					</div>
				);
			case "proposal.recorded":
				return (
					<div className="text-xs text-slate-300 space-y-1">
						<div className="font-mono text-[11px] text-slate-400">
							Proposal: <span className="text-amber-400">{event.proposal}</span>
						</div>
						<div className="flex flex-wrap gap-1 font-mono text-[10px]">
							{Object.entries(event.minted).map(([key, id]) => (
								<span
									key={key}
									className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300"
								>
									{key} → <strong className="text-emerald-400">{id}</strong>
								</span>
							))}
						</div>
					</div>
				);
			case "approval.recorded":
				return (
					<div className="text-xs text-slate-300 space-y-0.5">
						<div className="text-slate-400 text-[11px]">
							Approved by: <span className="text-white font-mono">{event.by}</span>
						</div>
						<div className="flex flex-wrap gap-1 font-mono text-[10px]">
							{event.claims.map((c) => (
								<span
									key={c}
									className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-900 text-emerald-300 font-bold"
								>
									{c}
								</span>
							))}
						</div>
					</div>
				);
			case "rejection.recorded":
				return (
					<div className="text-xs text-rose-300 space-y-0.5">
						<div>
							Rejected by: <span className="font-mono">{event.by}</span>
						</div>
						<div className="text-[11px] italic">{event.reason || "No reason given"}</div>
					</div>
				);
			case "claim.superseded":
				return (
					<div className="text-xs font-mono text-slate-300">
						<span className="line-through text-slate-500">{event.claim}</span> →{" "}
						<span className="text-emerald-400 font-bold">{event.by}</span>
					</div>
				);
			case "claim.retired":
				return (
					<div className="text-xs text-slate-400 space-y-0.5">
						<div>
							Retired: <span className="font-mono text-rose-400">{event.claim}</span>
						</div>
						<div className="italic text-[11px]">{event.reason}</div>
					</div>
				);
			case "link.recorded":
				return (
					<div className="text-xs font-mono text-slate-300">
						{event.from} <span className="text-slate-500">[{event.rel}]</span> → {event.to}
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
				<div>
					<div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full mb-1">
						<ListOrdered className="w-3.5 h-3.5" />
						<span>Stage 5: Canonical Ledger of Record</span>
					</div>
					<h2 className="text-2xl font-bold text-white tracking-tight">Append-Only Event Stream</h2>
					<p className="text-xs text-slate-400 mt-0.5">
						Cryptographically hash-chained event journal. Every intake, question answer, proposal,
						and approval is recorded with a content hash.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setShowNdjson(!showNdjson)}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700"
					>
						<FileCode className="w-3.5 h-3.5 text-emerald-400" />
						<span>{showNdjson ? "Hide NDJSON" : "View NDJSON"}</span>
					</button>

					{onTamperTest && (
						<button
							type="button"
							onClick={toggleTamper}
							className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
								tamperedState
									? "bg-rose-500/20 text-rose-300 border-rose-500/40"
									: "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
							}`}
							title="Simulate modifying a record in the ledger to test cryptographic break detection"
						>
							<AlertOctagon className="w-3.5 h-3.5" />
							<span>{tamperedState ? "Restore Chain" : "Simulate Tamper"}</span>
						</button>
					)}
				</div>
			</div>

			{/* Chain Status Card */}
			<div
				className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
					verification.valid
						? "bg-emerald-950/30 border-emerald-900/60"
						: "bg-rose-950/30 border-rose-900/60"
				}`}
			>
				<div className="flex items-center gap-3">
					<div
						className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
							verification.valid
								? "bg-emerald-500/20 text-emerald-400"
								: "bg-rose-500/20 text-rose-400"
						}`}
					>
						{verification.valid ? (
							<ShieldCheck className="w-6 h-6" />
						) : (
							<ShieldAlert className="w-6 h-6" />
						)}
					</div>
					<div>
						<h3 className="font-bold text-sm sm:text-base text-white">
							{verification.valid
								? "Cryptographic Hash-Chain Integrity: 100% Verified"
								: "Integrity Violation Detected!"}
						</h3>
						<p className="text-xs text-slate-400 mt-0.5">
							{verification.valid
								? `All ${events.length} events are linked with unbroken SHA-256 hashes rooted at GENESIS.`
								: verification.error}
						</p>
					</div>
				</div>

				<div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 shrink-0">
					Chain Height: <strong>{events.length}</strong>
				</div>
			</div>

			{/* Raw NDJSON Drawer */}
			{showNdjson && (
				<div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<span className="text-xs font-mono font-semibold text-slate-300">
							.jarvistark/ledger/events.ndjson
						</span>
						<button
							type="button"
							onClick={handleCopyNdjson}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
						>
							{copiedNdjson ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
							<span>{copiedNdjson ? "Copied" : "Copy"}</span>
						</button>
					</div>
					<pre className="overflow-x-auto p-3 rounded-xl bg-slate-950 text-xs font-mono text-emerald-300 max-h-60 whitespace-pre">
						{ndjsonContent || "// No events recorded yet"}
					</pre>
				</div>
			)}

			{/* Events Table */}
			{events.length === 0 ? (
				<div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
					<ListOrdered className="w-10 h-10 text-slate-600 mx-auto mb-3" />
					<h3 className="text-base font-semibold text-slate-300">No events in the ledger</h3>
					<p className="text-xs text-slate-500 mt-1">
						Actions taken across tabs will append verifiable events here.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{events.map((event, index) => {
						const isBroken = !verification.valid && verification.brokenIndex === index;

						return (
							<div
								key={event.id}
								className={`p-4 rounded-xl border transition-all ${
									isBroken
										? "bg-rose-950/60 border-rose-600 ring-2 ring-rose-500"
										: "bg-slate-900/70 border-slate-800 hover:border-slate-700"
								}`}
							>
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
									<div className="space-y-2 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200">
												{event.id}
											</span>
											<span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-semibold">
												{event.type}
											</span>
											<span className="text-[11px] font-mono text-slate-500">
												{new Date(event.at).toLocaleTimeString()}
											</span>
										</div>

										{/* Event specific details */}
										<div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
											{renderEventPayload(event)}
										</div>

										{/* Hash chain pointers */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono pt-1 text-slate-400">
											<div className="flex items-center gap-1.5 truncate">
												<span className="text-slate-500">prev:</span>
												<code className="text-slate-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-900 truncate">
													{event.prev === "GENESIS" ? "GENESIS" : `${event.prev.slice(0, 16)}...`}
												</code>
											</div>
											<div className="flex items-center gap-1.5 truncate">
												<span className="text-slate-500">hash:</span>
												<code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-900 truncate">
													{event.hash.slice(0, 16)}...
												</code>
											</div>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
