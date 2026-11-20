import type { Task } from "../checks/schema.js";
import type { Claim } from "../claims/schema.js";
import { verifyLedgerChain } from "../ledger/chain.js";
import type { LedgerEvent } from "../ledger/schema.js";
import type { Proposal, ProposalError } from "../proposals/schema.js";
import type { ValidationFinding, ValidationResult } from "./schema.js";

/**
 * Validates a proposal before acceptance into the ledger.
 * Returns machine-readable errors if invalid.
 */
export function validateProposal(
	proposal: Proposal,
	existingClaims: Map<string, Claim>,
): ProposalError[] {
	const errors: ProposalError[] = [];
	const definedProvisionalKeys = new Set<string>();

	// Track provisional keys in add / revise ops
	for (let i = 0; i < proposal.ops.length; i++) {
		const op = proposal.ops[i];
		const pathPrefix = `ops[${i}]`;

		if (op.op === "add") {
			if (!op.key.startsWith("$")) {
				errors.push({
					path: `${pathPrefix}.key`,
					code: "INVALID_PROVISIONAL_KEY",
					message: `Provisional key "${op.key}" must start with "$"`,
				});
			}
			definedProvisionalKeys.add(op.key);

			// Rule: user-stated claims must point to a source span or clarification
			if (op.claim.origin === "user-stated" && !op.claim.source) {
				errors.push({
					path: `${pathPrefix}.claim`,
					code: "SOURCE_REQUIRED",
					message:
						"A user-stated claim must specify a source (input-span, clarification, or observation)",
				});
			}
		} else if (op.op === "revise") {
			if (!op.key.startsWith("$")) {
				errors.push({
					path: `${pathPrefix}.key`,
					code: "INVALID_PROVISIONAL_KEY",
					message: `Provisional key "${op.key}" must start with "$"`,
				});
			}
			definedProvisionalKeys.add(op.key);

			const target = existingClaims.get(op.target);
			if (!target) {
				errors.push({
					path: `${pathPrefix}.target`,
					code: "TARGET_NOT_FOUND",
					message: `Target claim "${op.target}" does not exist`,
				});
			} else if (target.state === "superseded") {
				errors.push({
					path: `${pathPrefix}.target`,
					code: "CANNOT_REVISE_SUPERSEDED",
					message: `Cannot revise claim "${op.target}" because it is already superseded by "${target.supersededBy}"`,
				});
			}
		} else if (op.op === "retire") {
			const target = existingClaims.get(op.target);
			if (!target) {
				errors.push({
					path: `${pathPrefix}.target`,
					code: "TARGET_NOT_FOUND",
					message: `Target claim to retire "${op.target}" does not exist`,
				});
			}
		}
	}

	// Validate link references
	for (let i = 0; i < proposal.ops.length; i++) {
		const op = proposal.ops[i];
		if (op.op === "link") {
			const pathPrefix = `ops[${i}]`;

			const isValidRef = (ref: string) => {
				if (ref.startsWith("$")) {
					return definedProvisionalKeys.has(ref);
				}
				return existingClaims.has(ref);
			};

			if (!isValidRef(op.from)) {
				errors.push({
					path: `${pathPrefix}.from`,
					code: "INVALID_LINK_REF",
					message: `Link source reference "${op.from}" is neither a defined provisional key nor an existing claim`,
				});
			}

			if (!isValidRef(op.to)) {
				errors.push({
					path: `${pathPrefix}.to`,
					code: "INVALID_LINK_REF",
					message: `Link target reference "${op.to}" is neither a defined provisional key nor an existing claim`,
				});
			}

			if (op.from === op.to) {
				errors.push({
					path: pathPrefix,
					code: "SELF_REFERENTIAL_LINK",
					message: `Self-referential link on "${op.from}" is not allowed`,
				});
			}
		}
	}

	return errors;
}

/**
 * Validates the cryptographic integrity of the ledger and consistency of events with claims.
 */
export function validateLedger(
	events: LedgerEvent[],
	claims: Map<string, Claim>,
): ValidationFinding[] {
	const findings: ValidationFinding[] = [];

	// 1. Verify cryptographic hash chain
	const chainResult = verifyLedgerChain(events);
	if (!chainResult.valid) {
		findings.push({
			code: "LEDGER_HASH_CHAIN_BROKEN",
			severity: "error",
			message: chainResult.error ?? "Ledger hash chain verification failed",
			eventId: chainResult.brokenEventId,
		});
	}

	// 2. Verify approval events refer to existing claims
	for (const event of events) {
		if (event.type === "approval.recorded") {
			for (const claimId of event.claims) {
				const claim = claims.get(claimId);
				if (!claim) {
					findings.push({
						code: "ORPHANED_APPROVAL",
						severity: "error",
						message: `Approval event "${event.id}" refers to missing claim "${claimId}"`,
						eventId: event.id,
						claimId,
					});
				}
			}
		}
	}

	return findings;
}

/**
 * Validates overall specification completeness, blocking questions, and task graph acyclicity.
 */
export function validateConsistency(
	claims: Map<string, Claim>,
	tasks: Task[] = [],
): ValidationResult {
	const findings: ValidationFinding[] = [];

	// 1. Check for unresolved blocking questions
	for (const claim of claims.values()) {
		if (claim.kind === "question") {
			if (claim.state === "proposed" && claim.blocking) {
				findings.push({
					code: "UNRESOLVED_BLOCKING_QUESTION",
					severity: "error",
					message: `Blocking question "${claim.id}" must be resolved before proceeding: "${claim.text}"`,
					claimId: claim.id,
				});
			} else if (claim.state === "proposed") {
				findings.push({
					code: "UNRESOLVED_OPEN_QUESTION",
					severity: "warning",
					message: `Open question "${claim.id}" is unresolved: "${claim.text}"`,
					claimId: claim.id,
				});
			}
		}

		// 2. Check that accepted user-stated claims have sources
		if (claim.origin === "user-stated" && !claim.source) {
			findings.push({
				code: "USER_CLAIM_MISSING_SOURCE",
				severity: "error",
				message: `User-stated claim "${claim.id}" is missing a verifiable source span or clarification`,
				claimId: claim.id,
			});
		}

		// 3. Check superseded claims validity
		if (claim.state === "superseded" && claim.supersededBy) {
			if (!claims.has(claim.supersededBy)) {
				findings.push({
					code: "INVALID_SUPERSEDED_TARGET",
					severity: "error",
					message: `Claim "${claim.id}" is marked superseded by missing claim "${claim.supersededBy}"`,
					claimId: claim.id,
				});
			}
		}
	}

	// 4. Validate task graph (acyclicity and dependency references)
	const taskMap = new Map<string, Task>();
	for (const task of tasks) {
		taskMap.set(task.id, task);
	}

	for (const task of tasks) {
		// Verify needed claims exist
		for (const neededClaimId of task.needs) {
			if (!claims.has(neededClaimId)) {
				findings.push({
					code: "TASK_MISSING_CLAIM",
					severity: "error",
					message: `Task "${task.id}" needs missing claim "${neededClaimId}"`,
					path: `tasks[${task.id}].needs`,
				});
			}
		}

		// Verify task dependencies exist
		for (const depId of task.dependsOn) {
			if (!taskMap.has(depId)) {
				findings.push({
					code: "TASK_MISSING_DEPENDENCY",
					severity: "error",
					message: `Task "${task.id}" depends on missing task "${depId}"`,
					path: `tasks[${task.id}].dependsOn`,
				});
			}
		}
	}

	// Check for cycles in task dependencies using DFS
	const visited = new Set<string>();
	const recursionStack = new Set<string>();

	function checkCycle(taskId: string, path: string[]): boolean {
		visited.add(taskId);
		recursionStack.add(taskId);

		const task = taskMap.get(taskId);
		if (task) {
			for (const depId of task.dependsOn) {
				if (!visited.has(depId)) {
					if (checkCycle(depId, [...path, depId])) {
						return true;
					}
				} else if (recursionStack.has(depId)) {
					findings.push({
						code: "TASK_CYCLE_DETECTED",
						severity: "error",
						message: `Cycle detected in task dependencies: ${[...path, depId].join(" -> ")}`,
					});
					return true;
				}
			}
		}

		recursionStack.delete(taskId);
		return false;
	}

	for (const taskId of taskMap.keys()) {
		if (!visited.has(taskId)) {
			checkCycle(taskId, [taskId]);
		}
	}

	const hasErrors = findings.some((f) => f.severity === "error");
	return {
		valid: !hasErrors,
		findings,
	};
}
