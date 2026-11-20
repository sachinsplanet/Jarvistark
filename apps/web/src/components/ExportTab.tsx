import type { Claim, Intake, LedgerEvent, Task } from "@jarvistark/core";
import {
	Check,
	Copy,
	Download,
	FileCheck,
	FileText,
	FolderArchive,
	HardDrive,
	Trash2,
	Upload,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	type ExportedFile,
	downloadFile,
	generateCanonicalLedgerFiles,
	generateMarkdownPlan,
} from "../services/exporter.js";

interface ExportTabProps {
	intake: Intake | null;
	claims: Claim[];
	tasks: Task[];
	events: LedgerEvent[];
	onExportWorkspace: () => void;
	onImportWorkspace: (jsonStr: string) => void;
	onClearWorkspace: () => void;
}

export const ExportTab: React.FC<ExportTabProps> = ({
	intake,
	claims,
	tasks,
	events,
	onExportWorkspace,
	onImportWorkspace,
	onClearWorkspace,
}) => {
	const markdownFiles = generateMarkdownPlan(intake, claims, tasks);
	const ledgerFiles = generateCanonicalLedgerFiles(intake, claims, events, tasks);
	const allFiles: ExportedFile[] = [...markdownFiles, ...ledgerFiles];

	const [selectedFilePath, setSelectedFilePath] = useState<string>(allFiles[0]?.path ?? "");
	const [copied, setCopied] = useState(false);
	const [importError, setImportError] = useState<string | null>(null);

	const selectedFile = allFiles.find((f) => f.path === selectedFilePath) ?? allFiles[0];

	const handleCopy = () => {
		if (!selectedFile) return;
		navigator.clipboard.writeText(selectedFile.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleDownloadCurrent = () => {
		if (!selectedFile) return;
		const filename = selectedFile.path.split("/").pop() ?? "export.txt";
		downloadFile(filename, selectedFile.content);
	};

	const handleDownloadAll = () => {
		for (const file of allFiles) {
			const filename = file.path.replace(/\//g, "_");
			downloadFile(filename, file.content);
		}
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		setImportError(null);
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const content = event.target?.result as string;
				JSON.parse(content); // Test valid JSON
				onImportWorkspace(content);
			} catch (_err) {
				setImportError("Failed to parse imported JSON file. Please verify file integrity.");
			}
		};
		reader.readAsText(file);
	};

	return (
		<div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
				<div>
					<div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full mb-1">
						<Download className="w-3.5 h-3.5" />
						<span>Stage 6: Artifacts & System Export</span>
					</div>
					<h2 className="text-2xl font-bold text-white tracking-tight">
						Export & Repository Generation
					</h2>
					<p className="text-xs text-slate-400 mt-0.5">
						Export canonical <code className="font-mono text-emerald-400">.jarvistark/</code> files
						and generated <code className="font-mono text-emerald-400">docs/plan/</code> blueprints
						for check-in to git.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleDownloadAll}
						className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20"
					>
						<Download className="w-3.5 h-3.5" />
						<span>Download All Files ({allFiles.length})</span>
					</button>
				</div>
			</div>

			{/* File Browser & Viewer Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
				{/* File list Sidebar */}
				<div className="lg:col-span-4 space-y-4">
					<div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
						<div>
							<div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-semibold flex items-center gap-1.5">
								<FileText className="w-3.5 h-3.5 text-emerald-400" />
								<span>Generated Plan Docs (Read-Only)</span>
							</div>
							<div className="space-y-1">
								{markdownFiles.map((file) => (
									<button
										key={file.path}
										type="button"
										onClick={() => setSelectedFilePath(file.path)}
										className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
											selectedFilePath === file.path
												? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold"
												: "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
										}`}
									>
										<span className="truncate">{file.path}</span>
										<FileCheck className="w-3 h-3 text-emerald-400 shrink-0" />
									</button>
								))}
							</div>
						</div>

						<div className="border-t border-slate-800 pt-3">
							<div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-semibold flex items-center gap-1.5">
								<HardDrive className="w-3.5 h-3.5 text-sky-400" />
								<span>Canonical Ledger Data</span>
							</div>
							<div className="space-y-1">
								{ledgerFiles.map((file) => (
									<button
										key={file.path}
										type="button"
										onClick={() => setSelectedFilePath(file.path)}
										className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
											selectedFilePath === file.path
												? "bg-sky-500/15 border border-sky-500/40 text-sky-300 font-semibold"
												: "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
										}`}
									>
										<span className="truncate">{file.path}</span>
										<FolderArchive className="w-3 h-3 text-sky-400 shrink-0" />
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Workspace Backup & Restore Card */}
					<div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
						<div className="text-xs font-bold text-white flex items-center gap-2">
							<FolderArchive className="w-4 h-4 text-emerald-400" />
							<span>Workspace State Management</span>
						</div>
						<p className="text-[11px] text-slate-400">
							Persisted automatically in browser local storage. Export full snapshot or restore
							anytime.
						</p>

						{importError && (
							<div className="p-2 rounded-lg bg-rose-950/60 border border-rose-900 text-rose-300 text-[11px]">
								{importError}
							</div>
						)}

						<div className="space-y-2 pt-1">
							<button
								type="button"
								onClick={onExportWorkspace}
								className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-between transition-all"
							>
								<span>Export Workspace JSON</span>
								<Download className="w-3.5 h-3.5" />
							</button>

							<label className="w-full cursor-pointer px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-between transition-all">
								<span>Import Workspace JSON</span>
								<Upload className="w-3.5 h-3.5" />
								<input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
							</label>

							<button
								type="button"
								onClick={onClearWorkspace}
								className="w-full text-left px-3 py-2 rounded-lg bg-rose-950/30 hover:bg-rose-950/80 border border-rose-900/50 text-rose-400 text-xs font-semibold flex items-center justify-between transition-all"
							>
								<span>Reset / Clear Workspace</span>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				</div>

				{/* File Content Preview */}
				<div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
					{/* Viewer Header */}
					<div className="bg-slate-950/80 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<FileText className="w-4 h-4 text-emerald-400" />
							<span className="font-mono text-xs font-bold text-slate-200">
								{selectedFile?.path ?? "No file selected"}
							</span>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleCopy}
								className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
							>
								{copied ? (
									<Check className="w-3 h-3 text-emerald-400" />
								) : (
									<Copy className="w-3 h-3" />
								)}
								<span>{copied ? "Copied" : "Copy"}</span>
							</button>
							<button
								type="button"
								onClick={handleDownloadCurrent}
								className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
							>
								<Download className="w-3 h-3" />
								<span>Download</span>
							</button>
						</div>
					</div>

					{/* Note on content hash */}
					{selectedFile?.path.startsWith("docs/plan/") && (
						<div className="bg-slate-950 px-4 py-2 border-b border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
							<span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-900 font-mono text-[9px] uppercase">
								Protected
							</span>
							<span>
								Generated markdown with cryptographic content-hash header. Direct edits will be
								flagged by <code className="font-mono text-emerald-400">jarvistark validate</code>.
							</span>
						</div>
					)}

					{/* File Preview Content */}
					<pre className="p-4 bg-slate-950 text-xs font-mono text-slate-300 overflow-auto max-h-[600px] whitespace-pre-wrap leading-relaxed">
						{selectedFile?.content ?? "No content"}
					</pre>
				</div>
			</div>
		</div>
	);
};
