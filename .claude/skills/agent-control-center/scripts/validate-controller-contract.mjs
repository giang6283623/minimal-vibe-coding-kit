#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RELAY_MODES = new Set([
  'automatic-host-relay',
  'sequential-host-relay',
  'manual-handoff'
]);
const SELECTION_SOURCES = new Set([
  'explicit-user',
  'verified-single-route',
  'verified-auto'
]);
const ROUTE_FIELDS = ['provider', 'transport', 'model', 'reasoning_effort'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function addError(errors, code, pathName, message) {
  errors.push({ code, path: pathName, message });
}

function validateRoute(route, pathName, errors) {
  if (!isRecord(route)) {
    addError(errors, 'ROUTE_REQUIRED', pathName, 'route must be an object');
    return;
  }
  for (const field of ROUTE_FIELDS) {
    if (typeof route[field] !== 'string' || route[field].length === 0) {
      addError(errors, 'ROUTE_FIELD', `${pathName}.${field}`, 'route field must be a non-empty string');
    }
  }
  if (!SELECTION_SOURCES.has(route.selection_source)) {
    addError(
      errors,
      'ROUTE_SELECTION',
      `${pathName}.selection_source`,
      'selection_source must prove an independent explicit or verified selection'
    );
  }
}

function workOrderRoute(workOrder) {
  return {
    provider: workOrder.executor_provider,
    transport: workOrder.executor_transport,
    model: workOrder.requested_model,
    reasoning_effort: workOrder.requested_reasoning_effort
  };
}

function sameRoute(left, right) {
  return ROUTE_FIELDS.every((field) => left[field] === right[field]);
}

function matchingEvents(trace, type, workId) {
  return trace
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.type === type && (workId === undefined || event.work_id === workId));
}

function requireOneEvent(trace, type, workId, errors) {
  const matches = matchingEvents(trace, type, workId);
  if (matches.length !== 1) {
    addError(
      errors,
      'TRACE_CARDINALITY',
      `trace.${type}${workId ? `.${workId}` : ''}`,
      `expected exactly one ${type} event, found ${matches.length}`
    );
    return null;
  }
  return matches[0];
}

export function validateControllerContract(document) {
  const errors = [];
  if (!isRecord(document)) {
    return {
      valid: false,
      errors: [{ code: 'DOCUMENT_REQUIRED', path: '$', message: 'document must be an object' }]
    };
  }

  const envelope = document.taskEnvelope;
  if (!isRecord(envelope)) {
    return {
      valid: false,
      errors: [{ code: 'TASK_ENVELOPE_REQUIRED', path: 'taskEnvelope', message: 'taskEnvelope must be an object' }]
    };
  }

  if (envelope.version !== 2) {
    addError(errors, 'VERSION', 'taskEnvelope.version', 'task envelope version must be 2');
  }
  if (typeof envelope.task_id !== 'string' || envelope.task_id.length === 0) {
    addError(errors, 'TASK_ID', 'taskEnvelope.task_id', 'task_id must be a non-empty string');
  }
  if (typeof envelope.controller !== 'string' || envelope.controller.length === 0) {
    addError(errors, 'CONTROLLER', 'taskEnvelope.controller', 'controller must be a non-empty string');
  }

  validateRoute(envelope.controller_route, 'taskEnvelope.controller_route', errors);
  validateRoute(envelope.worker_defaults, 'taskEnvelope.worker_defaults', errors);

  const extraWorkerRoutes = envelope.worker_routes === undefined ? [] : envelope.worker_routes;
  if (!Array.isArray(extraWorkerRoutes)) {
    addError(errors, 'WORKER_ROUTES', 'taskEnvelope.worker_routes', 'worker_routes must be an array when present');
  }
  const approvedWorkerRoutes = [envelope.worker_defaults];
  if (Array.isArray(extraWorkerRoutes)) {
    for (let index = 0; index < extraWorkerRoutes.length; index += 1) {
      validateRoute(extraWorkerRoutes[index], `taskEnvelope.worker_routes[${index}]`, errors);
      approvedWorkerRoutes.push(extraWorkerRoutes[index]);
    }
  }

  const externalController = !['native', 'current'].includes(envelope.controller);
  if (isRecord(envelope.controller_route)) {
    const allowedControllerProviders = externalController
      ? [envelope.controller]
      : ['current', 'native'];
    if (!allowedControllerProviders.includes(envelope.controller_route.provider)) {
      addError(
        errors,
        'CONTROLLER_ROUTE_PROVIDER',
        'taskEnvelope.controller_route.provider',
        'controller route provider must match the selected controller'
      );
    }
  }

  for (let index = 0; index < approvedWorkerRoutes.length; index += 1) {
    const route = approvedWorkerRoutes[index];
    if (!isRecord(route)) continue;
    if (externalController
      && route.provider === envelope.controller_route?.provider
      && !SELECTION_SOURCES.has(route.selection_source)) {
      addError(
        errors,
        'IMPLICIT_CONTROLLER_WORKER',
        index === 0 ? 'taskEnvelope.worker_defaults' : `taskEnvelope.worker_routes[${index - 1}]`,
        'a controller-provider worker route requires independent selection evidence'
      );
    }
  }

  const relay = envelope.relay;
  if (!isRecord(relay) || !RELAY_MODES.has(relay.mode)) {
    addError(errors, 'RELAY_MODE', 'taskEnvelope.relay.mode', 'relay mode is missing or unsupported');
  } else {
    const manualTransport = envelope.controller_route?.transport === 'manual';
    if (manualTransport !== (relay.mode === 'manual-handoff')) {
      addError(
        errors,
        'MANUAL_RELAY_BINDING',
        'taskEnvelope.relay.mode',
        'manual-handoff must be derived exactly when controller transport is manual'
      );
    }
    if (relay.mode === 'automatic-host-relay' && relay.resume_controller !== true) {
      addError(
        errors,
        'AUTOMATIC_RELAY_RESUME',
        'taskEnvelope.relay.resume_controller',
        'automatic-host-relay requires verified controller resume support'
      );
    }
    if (relay.mode !== 'automatic-host-relay' && relay.resume_controller !== false) {
      addError(
        errors,
        'NON_AUTOMATIC_RELAY_RESUME',
        'taskEnvelope.relay.resume_controller',
        'non-automatic relay modes must not claim controller resume'
      );
    }
  }

  const workOrders = document.workOrders;
  if (!Array.isArray(workOrders) || workOrders.length === 0) {
    addError(errors, 'WORK_ORDERS', 'workOrders', 'at least one work order is required');
  }
  const safeWorkOrders = Array.isArray(workOrders) ? workOrders : [];
  const workIds = new Set();
  for (let index = 0; index < safeWorkOrders.length; index += 1) {
    const workOrder = safeWorkOrders[index];
    const pathName = `workOrders[${index}]`;
    if (!isRecord(workOrder)) {
      addError(errors, 'WORK_ORDER', pathName, 'work order must be an object');
      continue;
    }
    if (typeof workOrder.work_id !== 'string' || workOrder.work_id.length === 0) {
      addError(errors, 'WORK_ID', `${pathName}.work_id`, 'work_id must be a non-empty string');
    } else if (workIds.has(workOrder.work_id)) {
      addError(errors, 'DUPLICATE_WORK_ID', `${pathName}.work_id`, 'work_id must be unique');
    } else {
      workIds.add(workOrder.work_id);
    }
    if (workOrder.task_id !== envelope.task_id) {
      addError(errors, 'WORK_TASK_ID', `${pathName}.task_id`, 'work order task_id must match the task envelope');
    }
    const route = workOrderRoute(workOrder);
    if (!approvedWorkerRoutes.some((approved) => isRecord(approved) && sameRoute(route, approved))) {
      addError(
        errors,
        'UNAPPROVED_WORKER_ROUTE',
        pathName,
        'work order executor route does not match an approved worker route'
      );
    }
  }

  const maxWorkers = envelope.budget?.max_workers;
  if (!Number.isInteger(maxWorkers) || maxWorkers < 1) {
    addError(errors, 'MAX_WORKERS', 'taskEnvelope.budget.max_workers', 'max_workers must be a positive integer');
  } else if (safeWorkOrders.length > maxWorkers) {
    addError(errors, 'WORKER_BUDGET', 'workOrders', 'work order count exceeds max_workers');
  }

  const trace = document.trace;
  if (!Array.isArray(trace) || trace.length === 0 || trace.some((event) => !isRecord(event))) {
    addError(errors, 'TRACE', 'trace', 'trace must be a non-empty array of event objects');
  }
  const safeTrace = Array.isArray(trace) ? trace.filter(isRecord) : [];
  const authorityActor = externalController ? 'controller' : 'host';

  let handoff = null;
  if (externalController) {
    handoff = requireOneEvent(safeTrace, 'task-envelope-sent', undefined, errors);
    if (handoff && (handoff.event.actor !== 'host' || handoff.event.target !== 'controller')) {
      addError(
        errors,
        'HANDOFF_AUTHORITY',
        `trace[${handoff.index}]`,
        'external-controller task envelope must be sent by the host to the controller'
      );
    }
    const forbiddenHostEvents = new Set(['host-decomposed', 'host-chose-workers', 'host-accepted']);
    safeTrace.forEach((event, index) => {
      if (forbiddenHostEvents.has(event.type)) {
        addError(
          errors,
          'HOST_DECOMPOSITION',
          `trace[${index}]`,
          'the host must not decompose, choose workers, or accept for an external controller'
        );
      }
    });
  }

  const receiptPositions = [];
  for (const workOrder of safeWorkOrders.filter(isRecord)) {
    const issued = requireOneEvent(safeTrace, 'work-order-issued', workOrder.work_id, errors);
    const dispatched = requireOneEvent(safeTrace, 'worker-dispatched', workOrder.work_id, errors);
    const receipt = requireOneEvent(safeTrace, 'proof-receipt-returned', workOrder.work_id, errors);
    if (issued && issued.event.actor !== authorityActor) {
      addError(
        errors,
        'WORK_ORDER_AUTHORITY',
        `trace[${issued.index}]`,
        `work orders must be issued by the ${authorityActor}`
      );
    }
    if (handoff && issued && issued.index <= handoff.index) {
      addError(errors, 'CONTROLLER_FIRST_ORDER', `trace[${issued.index}]`, 'controller handoff must precede work orders');
    }
    if (dispatched && dispatched.event.actor !== 'host') {
      addError(errors, 'DISPATCH_AUTHORITY', `trace[${dispatched.index}]`, 'the host must dispatch approved workers');
    }
    if (issued && dispatched && dispatched.index <= issued.index) {
      addError(errors, 'DISPATCH_ORDER', `trace[${dispatched.index}]`, 'worker dispatch must follow its work order');
    }
    if (receipt && receipt.event.actor !== 'host') {
      addError(errors, 'RECEIPT_AUTHORITY', `trace[${receipt.index}]`, 'the host must return the worker receipt');
    }
    if (externalController && receipt && receipt.event.target !== 'controller') {
      addError(errors, 'RECEIPT_TARGET', `trace[${receipt.index}]`, 'external-controller receipts must return to the controller');
    }
    if (dispatched && receipt && receipt.index <= dispatched.index) {
      addError(errors, 'RECEIPT_ORDER', `trace[${receipt.index}]`, 'proof receipt must follow worker dispatch');
    }
    if (receipt) receiptPositions.push(receipt.index);
  }

  const decisions = matchingEvents(safeTrace, 'control-decision');
  if (decisions.length === 0) {
    addError(errors, 'CONTROL_DECISION', 'trace', 'at least one control decision is required');
  }
  for (const { event, index } of decisions) {
    if (event.actor !== authorityActor) {
      addError(
        errors,
        'CONTROL_AUTHORITY',
        `trace[${index}]`,
        `control decisions must be returned by the ${authorityActor}`
      );
    }
  }

  const acceptDecisions = decisions.filter(({ event }) => event.decision === 'accept');
  for (const accept of acceptDecisions) {
    if (receiptPositions.some((position) => position >= accept.index)) {
      addError(errors, 'ACCEPT_ORDER', `trace[${accept.index}]`, 'accept must follow every worker receipt');
    }
    if (envelope.topology === 'proofline') {
      const seals = matchingEvents(safeTrace, 'seal-granted')
        .filter(({ event, index }) => index < accept.index
          && event.actor === 'host'
          && event.issuer === 'keeper'
          && event.target === authorityActor
          && event.verified === true);
      if (seals.length === 0) {
        addError(
          errors,
          'PROOFLINE_SEAL_REQUIRED',
          `trace[${accept.index}]`,
          'Proofline accept requires a prior verified Keeper SEAL_GRANTED receipt'
        );
      } else {
        const seal = seals.at(-1);
        const humanGates = Array.isArray(envelope.acceptance?.human_gates)
          ? envelope.acceptance.human_gates
          : [];
        if (humanGates.length > 0) {
          const approvals = matchingEvents(safeTrace, 'owner-approved')
            .filter(({ event, index }) => index < seal.index
              && event.actor === 'owner'
              && Array.isArray(event.completed_gates)
              && humanGates.every((gate) => event.completed_gates.includes(gate)));
          if (approvals.length === 0 || seal.event.owner_approved !== true) {
            addError(
              errors,
              'OWNER_APPROVAL_REQUIRED',
              `trace[${seal.index}]`,
              'Proofline seal must follow and attest every required Owner gate'
            );
          }
        }
      }
    }
  }

  for (const ask of decisions.filter(({ event }) => event.decision === 'ask-user')) {
    const questionId = ask.event.question_id;
    if (typeof questionId !== 'string' || questionId.length === 0) {
      addError(errors, 'QUESTION_ID', `trace[${ask.index}].question_id`, 'ask-user requires a question_id');
      continue;
    }
    const asked = safeTrace.findIndex((event, index) => index > ask.index
      && event.type === 'user-question-asked'
      && event.actor === 'host'
      && event.question_id === questionId);
    const answered = safeTrace.findIndex((event, index) => index > asked
      && event.type === 'user-answer-returned'
      && event.actor === 'host'
      && event.target === authorityActor
      && event.question_id === questionId);
    if (asked < 0 || answered < 0) {
      addError(
        errors,
        'USER_RELAY_ORDER',
        `trace[${ask.index}]`,
        'ask-user must be followed by a host question and an answer returned to the controller'
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: validate-controller-contract.mjs <controller-trace.json>');
    process.exit(2);
  }
  let document;
  try {
    document = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
  } catch (error) {
    console.error(`Unable to read controller trace: ${error.message}`);
    process.exit(2);
  }
  const result = validateControllerContract(document);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
