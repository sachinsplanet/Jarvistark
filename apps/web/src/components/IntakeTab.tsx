import { AlertTriangle, ArrowRight, CheckCircle, Flame, Sparkles } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { checkProfileBoundary } from "../services/planner.js";
import { PRESETS } from "../services/presets.js";

interface IntakeTabProps {
	onSubmitIdea: (text: string, profileId: string, presetId?: string) => Promise<void>;
	existingText?: string;
}

export const IntakeTab: React.FC<IntakeTabProps> = ({ onSubmitIdea, existingText = "" }) => {
	const [text, setText] = useState(existingText);
	const [selectedProfile, setSelectedProfile] = useState("accounts-database");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const boundary = checkProfileBoundary(text, selectedProfile);

	const handlePresetClick = (presetId: string) => {
		const preset = PRESETS.find((p) => p.id === presetId);
		if (preset) {
			setText(preset.originalText);
			if (preset.profileId) setSelectedProfile(preset.profileId);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!text.trim() || isSubmitting) return;
		setIsSubmitting(true);
		try {
			await onSubmitIdea(text.trim(), selectedProfile);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
			{/* Intro Hero */}
			<div className="text-center space-y-3">
				<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
					<Sparkles className="w-3.5 h-3.5" />
					<span>Stage 1: Intent & Intake Capture</span>
				</div>
				<h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
					Turn Rough Software Ideas into Verified Plans
				</h1>
				<p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
					Describe what you want to build in everyday language. Jarvistark preserves your original
					intent, asks focused clarification questions, models claims, and derives prompt packages.
				</p>
			</div>

			{/* Presets Cards */}
			<div className="space-y-3">
				<div className="flex items-center justify-between text-xs text-slate-400">
					<span className="font-semibold uppercase tracking-wider text-slate-300">
						Quick Test Presets (From Hand-Runs)
					</span>
					<span>Click to load instant demo</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{PRESETS.map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => handlePresetClick(preset.id)}
							className="text-left p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 hover:bg-slate-900 transition-all group"
						>
							<div className="flex items-center justify-between">
								<h3 className="font-semibold text-sm text-slate-200 group-hover:text-emerald-300 flex items-center gap-1.5">
									<Flame className="w-3.5 h-3.5 text-emerald-400" />
									{preset.title}
								</h3>
								<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
									{preset.profileId ?? "generic"}
								</span>
							</div>
							<p className="text-xs text-slate-400 mt-1 line-clamp-2">{preset.subtitle}</p>
						</button>
					))}
				</div>
			</div>

			{/* Intake Input Form */}
			<form
				onSubmit={handleSubmit}
				className="space-y-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-6"
			>
				<div className="space-y-2">
					<label htmlFor="idea-input" className="block text-sm font-semibold text-slate-200">
						Rough Software Description
					</label>
					<textarea
						id="idea-input"
						rows={5}
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Example: linux version of app called wispr flow, basically a voice dictation app with audio capture, AI cleanup, and paste into active window..."
						className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
					/>
				</div>

				{/* Profile selection & boundary detection */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
					<div>
						<label
							htmlFor="profile-select"
							className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider"
						>
							Target Project Profile
						</label>
						<select
							id="profile-select"
							value={selectedProfile}
							onChange={(e) => setSelectedProfile(e.target.value)}
							className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
						>
							<option value="accounts-database">accounts-database (SaaS, Auth, DB)</option>
							<option value="desktop-app-with-backend">
								desktop-app-with-backend (Linux daemon, audio)
							</option>
							<option value="generic">generic (Profile-less / Core only)</option>
						</select>
					</div>

					{/* Boundary check status */}
					<div>
						<span className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
							Profile Boundary Check
						</span>
						{boundary.allowed ? (
							<div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs">
								<CheckCircle className="w-4 h-4 shrink-0" />
								<span>Matches profile constraints</span>
							</div>
						) : (
							<div className="space-y-1 p-2.5 rounded-lg bg-amber-950/40 border border-amber-900 text-amber-300 text-xs">
								<div className="flex items-center gap-1.5 font-semibold text-amber-400">
									<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
									<span>Profile Boundary Warning:</span>
								</div>
								<ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-200/80">
									{boundary.reasons.map((r) => (
										<li key={r}>{r}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>

				<div className="flex justify-end pt-2">
					<button
						type="submit"
						disabled={!text.trim() || isSubmitting}
						className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
					>
						<span>{isSubmitting ? "Processing..." : "Record Intake & Start Interview"}</span>
						<ArrowRight className="w-4 h-4" />
					</button>
				</div>
			</form>
		</div>
	);
};
