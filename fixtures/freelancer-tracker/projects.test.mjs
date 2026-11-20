import assert from "node:assert/strict";
import test from "node:test";
import { createTracker } from "./tracker.mjs";

test("projects retain rates and are accessible only to their owner", () => {
	const tracker = createTracker();
	const id = tracker.createProject("alice", "Website", 2500);
	assert.equal(tracker.getProject("alice", id).rateCents, 2500);
	assert.throws(() => tracker.getProject("bob", id), /Forbidden/);
	const copy = tracker.getProject("alice", id);
	copy.rateCents = 0;
	assert.equal(tracker.getProject("alice", id).rateCents, 2500);
});

test("invalid projects are rejected", () => {
	const tracker = createTracker();
	assert.throws(() => tracker.createProject("", "Website", 2500));
	assert.throws(() => tracker.createProject("alice", "Website", -1));
});
