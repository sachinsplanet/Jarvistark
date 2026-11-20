import type { ClarificationOption, Proposal } from "@jarvistark/core";

export interface PlannerQuestion {
	id: string;
	text: string;
	options: ClarificationOption[];
	recommendation: string;
}

export interface ProfileBoundaryCheck {
	allowed: boolean;
	reasons: string[];
}

export function checkProfileBoundary(
	text: string,
	profileId = "accounts-database",
): ProfileBoundaryCheck {
	const lower = text.toLowerCase();
	const reasons: string[] = [];

	if (profileId === "accounts-database") {
		if (
			lower.includes("payment") ||
			lower.includes("stripe") ||
			lower.includes("subscription fee")
		) {
			reasons.push("Payments are declined in v1 (scope boundary)");
		}
		if (
			lower.includes("voice") ||
			lower.includes("microphone") ||
			lower.includes("audio") ||
			lower.includes("dictation")
		) {
			reasons.push("Hardware audio / dictation is outside the accounts-database web profile");
		}
		if (lower.includes("real-time") || lower.includes("chat") || lower.includes("websocket")) {
			reasons.push("Real-time messaging is declined in v1");
		}
		if (lower.includes("desktop") || lower.includes("linux") || lower.includes("daemon")) {
			reasons.push("System-level desktop daemons are outside the accounts-database profile");
		}
	}

	return {
		allowed: reasons.length === 0,
		reasons,
	};
}

/**
 * Generate starter clarification questions based on input idea text.
 */
export function generateClarificationQuestions(ideaText: string): PlannerQuestion[] {
	const lower = ideaText.toLowerCase();

	if (lower.includes("voice") || lower.includes("dictation") || lower.includes("wispr")) {
		return [
			{
				id: "Q1",
				text: "Where should speech-to-text processing take place?",
				options: [
					{ text: "Cloud STT API (Google, Deepgram, AssemblyAI)", recommended: true },
					{ text: "Local model (Whisper) on-device", recommended: false },
					{ text: "Pluggable provider architecture", recommended: false },
				],
				recommendation: "Cloud STT API",
			},
			{
				id: "Q2",
				text: "Who provides the API keys and absorbs the usage costs?",
				options: [
					{ text: "Developer provides keys; users are not billed directly", recommended: true },
					{ text: "Users provide their own API keys (Bring-Your-Own-Key)", recommended: false },
				],
				recommendation: "Developer provides and absorbs costs",
			},
			{
				id: "Q3",
				text: "What is the application desktop shape on Linux?",
				options: [
					{ text: "Background daemon + system tray icon", recommended: true },
					{ text: "Full GTK / Qt GUI application window", recommended: false },
					{ text: "CLI-only daemon with hotkey", recommended: false },
				],
				recommendation: "Background daemon + system tray icon",
			},
			{
				id: "Q4",
				text: "How should dictation be toggled by the user?",
				options: [
					{ text: "Global keyboard shortcut (hold to talk, release to stop)", recommended: true },
					{ text: "Click tray icon to toggle recording", recommended: false },
				],
				recommendation: "Global keyboard shortcut",
			},
			{
				id: "Q5",
				text: "What display server is supported first on Linux?",
				options: [
					{ text: "X11 first (xdotool), Wayland support deferred", recommended: true },
					{ text: "Wayland first (ydotool/uinput)", recommended: false },
				],
				recommendation: "X11 first",
			},
		];
	}

	// Generic SaaS / Accounts questions
	return [
		{
			id: "Q1",
			text: "What user authentication methods should be supported?",
			options: [
				{ text: "Email/password and Google OAuth sign-in", recommended: true },
				{ text: "Passwordless email magic links", recommended: false },
			],
			recommendation: "Email/password and Google OAuth",
		},
		{
			id: "Q2",
			text: "What database and persistence layer should be used?",
			options: [
				{ text: "PostgreSQL with typed ORM (Drizzle/Prisma)", recommended: true },
				{ text: "Embedded SQLite for single-file deployment", recommended: false },
			],
			recommendation: "PostgreSQL with typed ORM",
		},
		{
			id: "Q3",
			text: "Are payments or billing subscriptions required in v1?",
			options: [
				{ text: "No payments in v1 — core tracking/CRUD only", recommended: true },
				{ text: "Stripe checkout integration required", recommended: false },
			],
			recommendation: "No payments in v1",
		},
	];
}

/**
 * Generate claim proposal based on answered questions and original idea.
 */
export function synthesizeProposal(ideaText: string, answers: Record<string, string>): Proposal {
	const ops: Proposal["ops"] = [
		{
			op: "add",
			key: "$idea",
			claim: {
				kind: "requirement",
				origin: "user-stated",
				text: ideaText,
				source: { type: "input-span", input: "input/original.md", start: 0, end: ideaText.length },
			},
		},
	];

	let counter = 1;
	for (const [qId, ans] of Object.entries(answers)) {
		const key = `$q_${counter++}`;
		ops.push({
			op: "add",
			key,
			claim: {
				kind: "requirement",
				origin: "user-stated",
				text: ans,
				source: { type: "clarification", sessionId: "SESS-001", questionId: qId },
			},
		});
		ops.push({
			op: "link",
			from: key,
			to: "$idea",
			rel: "implements",
		});
	}

	return {
		id: "PRP-001",
		planner: { role: "host-agent", id: "browser-planner" },
		ops,
		createdAt: new Date().toISOString(),
	};
}
