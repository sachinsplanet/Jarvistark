import { InMemoryStorage, JarvistarkGate } from "@jarvistark/core";
import { afterEach, expect, it, vi } from "vitest";
import { BrowserStorage } from "../src/services/storage.js";

afterEach(() => vi.unstubAllGlobals());

it("round-trips complete browser journals and preserves data on invalid import", async () => {
	const values = new Map<string, string>();
	vi.stubGlobal("localStorage", {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key),
	});
	vi.stubGlobal("navigator", {
		locks: { request: async (_key: string, action: () => Promise<void>) => action() },
	});
	const storage = new BrowserStorage();
	const gate = await JarvistarkGate.create(storage);
	await gate.recordIntake("Freelancer tracker");
	const exported = storage.exportAll();
	await storage.importAll(exported);
	expect((await JarvistarkGate.create(storage)).getIntake()?.originalText).toBe(
		"Freelancer tracker",
	);
	const corrupt = JSON.parse(JSON.stringify(exported));
	corrupt.events[0].snapshot.intake.originalText = "Changed";
	await expect(storage.importAll(corrupt)).rejects.toThrow("Tampered");
	expect(storage.exportAll()).toEqual(exported);
	await expect(storage.importAll({ events: [] })).rejects.toThrow("versioned journal");
	expect(storage.exportAll()).toEqual(exported);
});

it("browser demo presets remain valid under source and task validation", async () => {
	const { PRESETS } = await import("../src/services/presets.js");
	for (const preset of PRESETS) {
		const gate = await JarvistarkGate.create(new InMemoryStorage());
		await gate.recordIntake(preset.originalText);
		for (const q of preset.clarificationQuestions) {
			await gate.recordClarification("SESS-001", {
				id: q.id,
				text: q.text,
				answer: q.answer,
				answeredAt: new Date().toISOString(),
			});
		}
		const result = await gate.propose(preset.proposal);
		expect(result, preset.id).toMatchObject({ ok: true });
		for (const task of preset.tasks) {
			await gate.proposeTask({
				title: task.title,
				needs: task.needs,
				dependsOn: task.dependsOn,
				checks: task.checks.map(({ command, expect }) => ({ command, expect })),
			});
		}
		expect(gate.getTasks().every((t) => t.state === "blocked")).toBe(true);
	}
});
