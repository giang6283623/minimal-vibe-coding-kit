#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateControllerContract } from '../../../.vibekit/skills/agent-control-center/scripts/validate-controller-contract.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const examples = path.join(root, '.vibekit/skills/agent-control-center/examples');
let checks = 0;

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(examples, name), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectValid(document) {
  const result = validateControllerContract(document);
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  checks += 1;
}

function expectInvalid(document, code) {
  const result = validateControllerContract(document);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === code), JSON.stringify(result.errors, null, 2));
  checks += 1;
}

const nativeSequential = load('native-sequential.json');
const cursorCodex = load('cursor-codex-cursor-workers.json');
expectValid(nativeSequential);
expectValid(cursorCodex);

const routeMismatch = clone(nativeSequential);
routeMismatch.workOrders[0].executor_transport = 'native-subagents';
expectInvalid(routeMismatch, 'UNAPPROVED_WORKER_ROUTE');

const hostDecomposition = clone(cursorCodex);
hostDecomposition.trace.splice(1, 0, {
  type: 'host-decomposed',
  actor: 'host'
});
expectInvalid(hostDecomposition, 'HOST_DECOMPOSITION');

const implicitControllerWorker = clone(cursorCodex);
implicitControllerWorker.taskEnvelope.worker_defaults.provider = 'codex';
implicitControllerWorker.taskEnvelope.worker_defaults.transport = 'mcp';
implicitControllerWorker.taskEnvelope.worker_defaults.model = 'catalog-verified-controller-model-id';
implicitControllerWorker.taskEnvelope.worker_defaults.reasoning_effort = 'high';
delete implicitControllerWorker.taskEnvelope.worker_defaults.selection_source;
for (const workOrder of implicitControllerWorker.workOrders) {
  workOrder.executor_provider = 'codex';
  workOrder.executor_transport = 'mcp';
  workOrder.requested_model = 'catalog-verified-controller-model-id';
  workOrder.requested_reasoning_effort = 'high';
}
expectInvalid(implicitControllerWorker, 'IMPLICIT_CONTROLLER_WORKER');

const manualMismatch = clone(cursorCodex);
manualMismatch.taskEnvelope.controller_route.transport = 'manual';
expectInvalid(manualMismatch, 'MANUAL_RELAY_BINDING');

const falseManualRelay = clone(cursorCodex);
falseManualRelay.taskEnvelope.relay.mode = 'manual-handoff';
falseManualRelay.taskEnvelope.relay.resume_controller = false;
expectInvalid(falseManualRelay, 'MANUAL_RELAY_BINDING');

const wrongControllerAuthority = clone(cursorCodex);
wrongControllerAuthority.trace.at(-1).actor = 'host';
expectInvalid(wrongControllerAuthority, 'CONTROL_AUTHORITY');

const earlyAccept = clone(cursorCodex);
const accept = earlyAccept.trace.pop();
earlyAccept.trace.splice(5, 0, accept);
expectInvalid(earlyAccept, 'ACCEPT_ORDER');

const prooflineWithoutSeal = clone(cursorCodex);
prooflineWithoutSeal.taskEnvelope.topology = 'proofline';
expectInvalid(prooflineWithoutSeal, 'PROOFLINE_SEAL_REQUIRED');

const prooflineWithSeal = clone(prooflineWithoutSeal);
prooflineWithSeal.trace.splice(-1, 0, {
  type: 'seal-granted',
  actor: 'host',
  issuer: 'keeper',
  target: 'controller',
  verified: true,
  owner_approved: false
});
expectValid(prooflineWithSeal);

const prooflineMissingOwner = clone(prooflineWithSeal);
prooflineMissingOwner.taskEnvelope.acceptance.human_gates = ['release-owner'];
expectInvalid(prooflineMissingOwner, 'OWNER_APPROVAL_REQUIRED');

const prooflineWithOwner = clone(prooflineMissingOwner);
const sealIndex = prooflineWithOwner.trace.findIndex((event) => event.type === 'seal-granted');
prooflineWithOwner.trace[sealIndex].owner_approved = true;
prooflineWithOwner.trace.splice(sealIndex, 0, {
  type: 'owner-approved',
  actor: 'owner',
  completed_gates: ['release-owner']
});
expectValid(prooflineWithOwner);

console.log(`controller contract tests passed (${checks} checks)`);
