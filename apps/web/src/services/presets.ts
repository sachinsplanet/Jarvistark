import type { Proposal, Task } from "@jarvistark/core";

export interface DemoPreset {
	id: string;
	title: string;
	subtitle: string;
	profileId?: string;
	originalText: string;
	clarificationQuestions: Array<{
		id: string;
		text: string;
		recommendation?: string;
		options?: Array<{ text: string; recommended?: boolean }>;
		answer: string;
	}>;
	proposal: Proposal;
	tasks: Task[];
}

const wisprIdea = "linux version of app called wispr flow, basically a voice dictation app";
const freelancerIdea =
	"A web app for freelancers to track client projects, log billable hours, and view monthly earnings dashboards.";

function inputSpan(idea: string, excerpt: string) {
	const start = idea.indexOf(excerpt);
	if (start < 0)
		throw new Error(`Preset source excerpt is missing from its original idea: ${excerpt}`);
	return {
		type: "input-span" as const,
		input: "input/original.md",
		start,
		end: start + excerpt.length,
	};
}

export const PRESETS: DemoPreset[] = [
	{
		id: "wispr-flow-linux",
		title: "Wispr Flow for Linux (Voice Dictation)",
		subtitle:
			"Client-server desktop daemon with speech-to-text, AI cleanup, and X11 text injection",
		profileId: "desktop-app-with-backend",
		originalText: wisprIdea,
		clarificationQuestions: [
			{
				id: "Q1",
				text: "Where does speech-to-text processing happen?",
				recommendation: "Cloud STT API",
				options: [
					{ text: "Local model (Whisper) on-device", recommended: false },
					{ text: "Cloud STT API (Google, Deepgram, AssemblyAI)", recommended: true },
					{ text: "Pluggable (support both)", recommended: false },
				],
				answer: "Cloud STT API (pluggable backend)",
			},
			{
				id: "Q2",
				text: "Who provides the API keys and pays for usage?",
				recommendation: "Developer provides and absorbs costs",
				options: [
					{
						text: "Developer provides API keys; all users billed from dev account",
						recommended: true,
					},
					{ text: "Bring-your-own-key: users provide their own keys", recommended: false },
				],
				answer: "Developer provides API keys; users are not billed directly",
			},
			{
				id: "Q3",
				text: "What is the user-facing desktop interface shape?",
				recommendation: "Background daemon + system tray icon",
				options: [
					{ text: "Background daemon + system tray icon", recommended: true },
					{ text: "Standalone GUI window (GTK / Qt)", recommended: false },
					{ text: "CLI-only tool with keybind", recommended: false },
				],
				answer: "A background daemon/service + system tray icon",
			},
			{
				id: "Q4",
				text: "How is dictation activated by the user?",
				recommendation: "Global keyboard shortcut (hold-to-talk)",
				options: [
					{
						text: "Global keyboard shortcut (e.g. hold Ctrl+Shift+Space, release to stop)",
						recommended: true,
					},
					{ text: "Click tray icon to toggle recording", recommended: false },
				],
				answer: "Global keyboard shortcut (hold to talk, release to stop)",
			},
			{
				id: "Q5",
				text: "How does cleaned text get into the focused application?",
				recommendation: "Input simulation (typing directly at cursor)",
				options: [
					{
						text: "Type into the focused app's text field directly (input simulation)",
						recommended: true,
					},
					{ text: "Copy to clipboard and auto-paste", recommended: false },
				],
				answer: "Type into the focused app's text field directly via input simulation",
			},
			{
				id: "Q6",
				text: "Which Linux display server is targeted first?",
				recommendation: "X11 first (xdotool), Wayland deferred",
				options: [
					{ text: "X11 first (xdotool), Wayland support deferred", recommended: true },
					{ text: "Wayland first (ydotool/uinput)", recommended: false },
				],
				answer: "X11 first (xdotool), Wayland support later",
			},
			{
				id: "Q7",
				text: "What language will the desktop client be built in?",
				recommendation: "Python (strong audio + system ecosystem)",
				options: [
					{ text: "Python (PortAudio/sounddevice, requests, D-Bus)", recommended: true },
					{ text: "Rust (low latency, system daemon)", recommended: false },
				],
				answer: "Python",
			},
			{
				id: "Q8",
				text: "What level of AI text cleanup is performed?",
				recommendation: "Full Wispr Flow cleanup (filler removal, false starts, auto-punctuation)",
				options: [
					{
						text: "Full cleanup: remove filler words, fix false starts, auto-punctuate, format",
						recommended: true,
					},
					{ text: "Basic raw transcription only", recommended: false },
				],
				answer:
					"Yes — clean up filler words, fix false starts, auto-punctuate, and format paragraphs",
			},
			{
				id: "Q9",
				text: "Is context awareness from the active application required in v1?",
				recommendation: "Yes, captures active app name and surrounding text",
				options: [
					{ text: "Yes — context awareness is essential", recommended: true },
					{ text: "No — text only, context deferred", recommended: false },
				],
				answer: "Yes — context awareness is essential to differentiate from basic dictation tools",
			},
			{
				id: "Q10",
				text: "How is the cloud backend hosted?",
				recommendation: "Python/FastAPI on free-tier cloud service",
				options: [
					{
						text: "Python/FastAPI on free-tier cloud (Railway, Fly.io, or Oracle Cloud)",
						recommended: true,
					},
					{ text: "Self-hosted server", recommended: false },
				],
				answer: "Python/FastAPI on a free-tier cloud service",
			},
		],
		proposal: {
			id: "PRP-001",
			planner: { role: "host-agent", id: "wispr-flow-planner" },
			ops: [
				{
					op: "add",
					key: "$core",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Linux desktop voice dictation tool inspired by Wispr Flow",
						source: inputSpan(wisprIdea, wisprIdea),
					},
				},
				{
					op: "add",
					key: "$arch",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Audio is captured locally and streamed to a backend server for STT and LLM processing",
						source: { type: "clarification", sessionId: "SESS-001", questionId: "Q1" },
					},
				},
				{
					op: "add",
					key: "$keys",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Developer provides and pays for all API keys; client binary does not expose master keys",
						source: { type: "clarification", sessionId: "SESS-001", questionId: "Q2" },
					},
				},
				{
					op: "add",
					key: "$daemon",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "App runs as a background daemon with system tray icon",
						source: { type: "clarification", sessionId: "SESS-001", questionId: "Q3" },
					},
				},
				{
					op: "add",
					key: "$shortcut",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Dictation activated via global keyboard shortcut (hold-to-talk)",
						source: { type: "clarification", sessionId: "SESS-001", questionId: "Q4" },
					},
				},
				{
					op: "add",
					key: "$inject",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Cleaned text is injected directly into focused application via xdotool on X11",
						source: { type: "clarification", sessionId: "SESS-001", questionId: "Q5" },
					},
				},
				{
					op: "add",
					key: "$context",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Context awareness: active window title and cursor text context passed to cleanup prompt",
						source: { type: "clarification", sessionId: "SESS-001", questionId: "Q9" },
						risk: {
							level: "high",
							category: "technical",
							note: "Reading cursor context via AT-SPI is inconsistent across Linux window managers",
						},
					},
				},
				{
					op: "add",
					key: "$backend",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Python/FastAPI WebSocket backend service deployed to free-tier cloud",
						source: { type: "clarification", sessionId: "SESS-001", questionId: "Q10" },
					},
				},
				{
					op: "add",
					key: "$risk_cost",
					claim: {
						kind: "assumption",
						origin: "inferred",
						text: "V1 has no user auth or usage-based rate limits on backend calls",
						risk: {
							level: "high",
							category: "financial",
							note: "Unbounded API cost risk if backend endpoint is discovered and abused",
						},
					},
				},
				{
					op: "add",
					key: "$q_cost",
					claim: {
						kind: "question",
						origin: "inferred",
						text: "How will API costs be managed at scale without user accounts or rate limits?",
						blocking: false,
						impact: "high",
					},
				},
				{
					op: "link",
					from: "$arch",
					to: "$core",
					rel: "implements",
				},
				{
					op: "link",
					from: "$inject",
					to: "$core",
					rel: "implements",
				},
				{
					op: "link",
					from: "$risk_cost",
					to: "$keys",
					rel: "constrains",
				},
			],
			createdAt: "2026-10-17T06:00:00.000Z",
		},
		tasks: [
			{
				id: "TSK-001",
				title: "Implement local microphone audio capture and stream buffer",
				needs: ["CLM-001", "CLM-002"],
				dependsOn: [],
				checks: [
					{
						id: "CHK-001-1",
						command: "python -m pytest tests/test_audio.py -k test_capture_device",
						expect: "exit code 0",
					},
				],
				state: "ready",
			},
			{
				id: "TSK-002",
				title: "Build global hotkey listener and background daemon lifecycle",
				needs: ["CLM-004", "CLM-005"],
				dependsOn: ["TSK-001"],
				checks: [
					{
						id: "CHK-002-1",
						command: "python -m pytest tests/test_hotkey.py",
						expect: "exit code 0",
					},
				],
				state: "blocked",
			},
			{
				id: "TSK-003",
				title: "FastAPI WebSocket streaming backend with pluggable STT adapter",
				needs: ["CLM-002", "CLM-008"],
				dependsOn: [],
				checks: [
					{
						id: "CHK-003-1",
						command: "pytest backend/tests/test_stream.py",
						expect: "exit code 0",
					},
				],
				state: "ready",
			},
			{
				id: "TSK-004",
				title: "LLM cleanup engine with filler word removal and context formatting",
				needs: ["CLM-007", "CLM-008"],
				dependsOn: ["TSK-003"],
				checks: [
					{
						id: "CHK-004-1",
						command: "pytest backend/tests/test_cleanup.py",
						expect: "exit code 0",
					},
				],
				state: "blocked",
			},
			{
				id: "TSK-005",
				title: "Active window context capture and xdotool text injection",
				needs: ["CLM-006", "CLM-007"],
				dependsOn: ["TSK-002"],
				checks: [
					{
						id: "CHK-005-1",
						command: "python -m pytest tests/test_injection.py",
						expect: "exit code 0",
					},
				],
				state: "blocked",
			},
		],
	},
	{
		id: "freelancer-tracker",
		title: "Freelancer Project & Earnings Tracker",
		subtitle:
			"SaaS dashboard with email & Google login, project tracking, time logging, and charts",
		profileId: "accounts-database",
		originalText: freelancerIdea,
		clarificationQuestions: [
			{
				id: "Q1",
				text: "How do users authenticate?",
				recommendation: "Email/password and Google OAuth",
				options: [
					{ text: "Email/password and Google OAuth", recommended: true },
					{ text: "Email magic link only", recommended: false },
				],
				answer: "Email/password and Google OAuth sign-in",
			},
			{
				id: "Q2",
				text: "What database and storage are needed?",
				recommendation: "PostgreSQL with Drizzle ORM",
				options: [
					{ text: "PostgreSQL with Drizzle ORM", recommended: true },
					{ text: "SQLite for local dev", recommended: false },
				],
				answer: "PostgreSQL database with Drizzle ORM",
			},
			{
				id: "Q3",
				text: "Are payments or billing included in v1?",
				recommendation: "No payments in v1 (declined by profile)",
				options: [
					{ text: "No payments or invoice processing in v1", recommended: true },
					{ text: "Stripe integration for client payments", recommended: false },
				],
				answer: "No payments in v1 — logging and tracking only",
			},
		],
		proposal: {
			id: "PRP-001",
			planner: { role: "host-agent", id: "accounts-planner" },
			ops: [
				{
					op: "add",
					key: "$auth",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Freelancers can authenticate via email/password or Google OAuth",
						source: { type: "clarification", sessionId: "SESS-001", questionId: "Q1" },
					},
				},
				{
					op: "add",
					key: "$projects",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Users can create, view, edit, and archive client projects with hourly rates",
						source: inputSpan(freelancerIdea, "track client projects"),
					},
				},
				{
					op: "add",
					key: "$hours",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Users can log billable time entries attached to specific projects",
						source: inputSpan(freelancerIdea, "log billable hours"),
					},
				},
				{
					op: "add",
					key: "$dashboard",
					claim: {
						kind: "requirement",
						origin: "user-stated",
						text: "Interactive monthly earnings charts aggregated by client and project status",
						source: inputSpan(freelancerIdea, "view monthly earnings dashboards"),
					},
				},
			],
			createdAt: "2026-10-17T06:00:00.000Z",
		},
		tasks: [
			{
				id: "TSK-001",
				title: "User authentication system with Google OAuth and session management",
				needs: ["CLM-001"],
				dependsOn: [],
				checks: [
					{
						id: "CHK-001-1",
						command: "pnpm test auth",
						expect: "exit code 0",
					},
				],
				state: "ready",
			},
			{
				id: "TSK-002",
				title: "Project and time entry database schema with migrations",
				needs: ["CLM-002", "CLM-003"],
				dependsOn: ["TSK-001"],
				checks: [
					{
						id: "CHK-002-1",
						command: "pnpm test db-schema",
						expect: "exit code 0",
					},
				],
				state: "blocked",
			},
			{
				id: "TSK-003",
				title: "Dashboard monthly earnings calculation and visualization",
				needs: ["CLM-004"],
				dependsOn: ["TSK-002"],
				checks: [
					{
						id: "CHK-003-1",
						command: "pnpm test dashboard-math",
						expect: "exit code 0",
					},
				],
				state: "blocked",
			},
		],
	},
];
