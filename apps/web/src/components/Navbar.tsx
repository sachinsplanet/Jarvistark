import {
	BookOpen,
	CheckSquare,
	Download,
	Layers,
	ListOrdered,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Terminal,
} from "lucide-react";
import type React from "react";

export type ActiveTab = "intake" | "clarify" | "claims" | "tasks" | "ledger" | "export";

interface NavbarProps {
	activeTab: ActiveTab;
	setActiveTab: (tab: ActiveTab) => void;
	chainValid: boolean;
	claimsCount: number;
	tasksCount: number;
	eventsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
	activeTab,
	setActiveTab,
	chainValid,
	claimsCount,
	tasksCount,
	eventsCount,
}) => {
	const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
		{ id: "intake", label: "1. Intake", icon: <Sparkles className="w-4 h-4" /> },
		{ id: "clarify", label: "2. Interview", icon: <BookOpen className="w-4 h-4" /> },
		{
			id: "claims",
			label: "3. Claims & Approval",
			icon: <Layers className="w-4 h-4" />,
			badge: claimsCount,
		},
		{
			id: "tasks",
			label: "4. Tasks & Prompts",
			icon: <CheckSquare className="w-4 h-4" />,
			badge: tasksCount,
		},
		{
			id: "ledger",
			label: "5. Ledger Explorer",
			icon: <ListOrdered className="w-4 h-4" />,
			badge: eventsCount,
		},
		{ id: "export", label: "6. Export", icon: <Download className="w-4 h-4" /> },
	];

	return (
		<header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					{/* Logo & Brand */}
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
							<Terminal className="w-5 h-5 text-emerald-400" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-extrabold text-lg tracking-tight text-white">JARVISTARK</span>
								<span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
									Core Gate
								</span>
							</div>
							<p className="text-xs text-slate-400">System of Record for Intent</p>
						</div>
					</div>

					{/* Navigation tabs */}
					<nav className="flex items-center space-x-1 sm:space-x-2">
						{navItems.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => setActiveTab(item.id)}
								className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
									activeTab === item.id
										? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
										: "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
								}`}
							>
								{item.icon}
								<span>{item.label}</span>
								{typeof item.badge === "number" && item.badge > 0 && (
									<span
										className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
											activeTab === item.id
												? "bg-emerald-500/30 text-emerald-200"
												: "bg-slate-800 text-slate-400"
										}`}
									>
										{item.badge}
									</span>
								)}
							</button>
						))}
					</nav>

					{/* Hash chain verification indicator */}
					<div className="flex items-center">
						{chainValid ? (
							<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shadow-sm">
								<ShieldCheck className="w-3.5 h-3.5" />
								<span>Chain: Verified</span>
							</div>
						) : (
							<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-rose-950/80 text-rose-400 border border-rose-800/80 shadow-sm animate-pulse">
								<ShieldAlert className="w-3.5 h-3.5" />
								<span>Chain: Tampered</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
};
