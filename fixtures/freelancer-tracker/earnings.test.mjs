import assert from "node:assert/strict";
import test from "node:test";
import { createTracker } from "./tracker.mjs";

test("earnings use each project rate and isolate owners", () => {
	const tracker = createTracker();
	const website = tracker.createProject("alice", "Website", 2500);
	const design = tracker.createProject("alice", "Design", 3000);
	const other = tracker.createProject("bob", "Private", 9000);
	tracker.recordHours("alice", website, 2);
	tracker.recordHours("alice", design, 1.5);
	tracker.recordHours("bob", other, 1);
	assert.equal(tracker.earnings("alice"), 9500);
	assert.equal(tracker.earnings("bob"), 9000);
	assert.equal(tracker.earnings("charlie"), 0);
});

test("hours cannot be negative, non-finite, or recorded by another owner", () => {
	const tracker = createTracker();
	const id = tracker.createProject("alice", "Website", 2500);
	assert.throws(() => tracker.recordHours("bob", id, 2), /Forbidden/);
	assert.throws(() => tracker.recordHours("alice", id, -1), /Invalid/);
	assert.throws(() => tracker.recordHours("alice", id, Number.NaN), /Invalid/);
});
