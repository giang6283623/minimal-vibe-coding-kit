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
const PROVIDERS = new Set([
  'current',
  'native',
  'codex',
  'claude',
  'cursor',
  'opencode',
  'grok',
  'kimi'
]);
const TRANSPORTS = new Set([
  'native',
  'host-sequential',
  'native-subagents',
  'codex-cli',
  'claude-cli',
  'cursor-cli',
  'cursor-sdk',
  'opencode-cli',
  'grok-cli',
  'kimi-cli',
  'mcp',
  'sdk',
  'api',
  'manual'
]);
const CONTROL_DECISIONS = new Set(['accept', 'retry', 'escalate', 'ask-user', 'stop']);
const SELECTION_MECHANISMS = new Set([
  'native-structured-question',
  'parent-conversation',
  'verified-single-route',
  'verified-auto'
]);
const ROUTE_FIELDS = ['provider', 'transport', 'model', 'reasoning_effort'];
const CONTROLLER_TRANSPORTS_BY_PROVIDER = new Map([
  ['codex', new Set(['codex-cli', 'mcp', 'sdk', 'api', 'manual'])],
  ['claude', new Set(['claude-cli', 'mcp', 'sdk', 'api', 'manual'])],
  ['cursor', new Set(['cursor-cli', 'cursor-sdk', 'mcp', 'sdk', 'api', 'manual'])],
  ['opencode', new Set(['opencode-cli', 'mcp', 'sdk', 'api', 'manual'])],
  ['grok', new Set(['grok-cli', 'mcp', 'sdk', 'api', 'manual'])],
  ['kimi', new Set(['kimi-cli', 'mcp', 'sdk', 'api', 'manual'])]
]);

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
  if (!PROVIDERS.has(route.provider)) {
    addError(errors, 'ROUTE_PROVIDER', `${pathName}.provider`, 'provider is not supported by the controller contract');
  }
  if (!TRANSPORTS.has(route.transport)) {
    addError(errors, 'ROUTE_TRANSPORT', `${pathName}.transport`, 'transport is not supported by the controller contract');
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

function requireString(event, field, pathName, errors, code = 'TRACE_FIELD') {
  if (typeof event[field] !== 'string' || event[field].length === 0) {
    addError(errors, code, `${pathName}.${field}`, `${field} must be a non-empty string`);
    return false;
  }
  return true;
}

function validateSelectionEvent(selection, route, envelope, errors) {
  if (!selection) return;
  const { event, index } = selection;
  const pathName = `trace[${index}]`;
  if (event.actor !== 'host' || event.target !== 'controller') {
    addError(errors, 'CONTROLLER_SELECTION_AUTHORITY', pathName, 'the host must select and bind the controller route');
  }
  for (const field of ROUTE_FIELDS) {
    if (event[field] !== route?.[field]) {
      addError(errors, 'CONTROLLER_SELECTION_BINDING', `${pathName}.${field}`, `${field} must match controller_route`);
    }
  }
  if (event.selection_source !== route?.selection_source) {
    addError(errors, 'CONTROLLER_SELECTION_BINDING', `${pathName}.selection_source`, 'selection_source must match controller_route');
  }
  if (!SELECTION_MECHANISMS.has(event.mechanism)) {
    addError(errors, 'CONTROLLER_SELECTION_MECHANISM', `${pathName}.mechanism`, 'selection mechanism is unsupported');
  }
  if (event.selection_source === 'explicit-user') {
    if (!['native-structured-question', 'parent-conversation'].includes(event.mechanism)) {
      addError(errors, 'CONTROLLER_SELECTION_MECHANISM', `${pathName}.mechanism`, 'explicit-user selection requires a parent question mechanism');
    }
    if (event.mechanism === 'native-structured-question') {
      requireString(event, 'question_tool', pathName, errors, 'CONTROLLER_SELECTION_QUESTION_TOOL');
    }
  }
  if (event.selection_source === 'verified-auto' && event.mechanism !== 'verified-auto') {
    addError(errors, 'CONTROLLER_SELECTION_MECHANISM', `${pathName}.mechanism`, 'verified-auto requires its matching mechanism');
  }
  if (event.selection_source === 'verified-single-route' && event.mechanism !== 'verified-single-route') {
    addError(errors, 'CONTROLLER_SELECTION_MECHANISM', `${pathName}.mechanism`, 'verified-single-route requires its matching mechanism');
  }
  if (event.task_id !== envelope.task_id) {
    addError(errors, 'CONTROLLER_SELECTION_TASK', `${pathName}.task_id`, 'controller selection must bind the task_id');
  }
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
    if (externalController
      && !CONTROLLER_TRANSPORTS_BY_PROVIDER.get(envelope.controller_route.provider)?.has(envelope.controller_route.transport)) {
      addError(
        errors,
        'CONTROLLER_ROUTE_TRANSPORT',
        'taskEnvelope.controller_route.transport',
        'controller transport is not compatible with the selected provider'
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
    const statefulExternal = externalController && relay.mode !== 'manual-handoff';
    if (statefulExternal && relay.resume_controller !== true) {
      addError(
        errors,
        'STATEFUL_RELAY_RESUME',
        'taskEnvelope.relay.resume_controller',
        'every non-manual external relay requires verified controller resume support'
      );
    }
    if (!statefulExternal && relay.resume_controller !== false) {
      addError(
        errors,
        'NON_STATEFUL_RELAY_RESUME',
        'taskEnvelope.relay.resume_controller',
        'native and manual relay modes must not claim external controller resume'
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
  let sessionStart = null;
  let controllerSessionId = null;
  if (externalController) {
    const selection = requireOneEvent(safeTrace, 'controller-route-selected', undefined, errors);
    validateSelectionEvent(selection, envelope.controller_route, envelope, errors);
    handoff = requireOneEvent(safeTrace, 'task-envelope-sent', undefined, errors);
    if (handoff && (handoff.event.actor !== 'host' || handoff.event.target !== 'controller')) {
      addError(
        errors,
        'HANDOFF_AUTHORITY',
        `trace[${handoff.index}]`,
        'external-controller task envelope must be sent by the host to the controller'
      );
    }
    if (handoff && handoff.event.task_id !== envelope.task_id) {
      addError(errors, 'HANDOFF_TASK_BINDING', `trace[${handoff.index}].task_id`, 'task envelope handoff must bind the task_id');
    }
    if (selection && handoff && selection.index >= handoff.index) {
      addError(errors, 'CONTROLLER_SELECTION_ORDER', `trace[${selection.index}]`, 'controller route selection must precede the task envelope handoff');
    }
    if (envelope.relay?.mode !== 'manual-handoff') {
      sessionStart = requireOneEvent(safeTrace, 'controller-session-started', undefined, errors);
      if (sessionStart) {
        const pathName = `trace[${sessionStart.index}]`;
        if (sessionStart.event.actor !== 'host' || sessionStart.event.target !== 'controller') {
          addError(errors, 'CONTROLLER_SESSION_AUTHORITY', pathName, 'the host adapter must start the controller session');
        }
        requireString(sessionStart.event, 'issuer', pathName, errors, 'CONTROLLER_ADAPTER_ID');
        if (requireString(sessionStart.event, 'session_id', pathName, errors, 'CONTROLLER_SESSION_ID')) {
          controllerSessionId = sessionStart.event.session_id;
        }
        if (sessionStart.event.adapter_verified !== true || sessionStart.event.resume_supported !== true) {
          addError(errors, 'CONTROLLER_SESSION_UNVERIFIED', pathName, 'session start must attest a verified adapter with explicit resume support');
        }
        if (envelope.controller === 'codex' && sessionStart.event.multi_agent !== false) {
          addError(errors, 'CODEX_MULTI_AGENT_ENABLED', `${pathName}.multi_agent`, 'an external Codex controller must disable Codex multi-agent execution');
        }
        if (handoff && sessionStart.index <= handoff.index) {
          addError(errors, 'CONTROLLER_SESSION_ORDER', pathName, 'controller session start must follow the task envelope handoff');
        }
      }
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
    if (sessionStart && issued && issued.index <= sessionStart.index) {
      addError(errors, 'CONTROLLER_SESSION_FIRST_ORDER', `trace[${issued.index}]`, 'session start must precede controller work orders');
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
    if (!CONTROL_DECISIONS.has(event.decision)) {
      addError(errors, 'CONTROL_DECISION_VALUE', `trace[${index}].decision`, 'control decision is unsupported');
    }
    if (event.actor !== authorityActor) {
      addError(
        errors,
        'CONTROL_AUTHORITY',
        `trace[${index}]`,
        `control decisions must be returned by the ${authorityActor}`
      );
    }
  }

  if (externalController && envelope.relay?.mode !== 'manual-handoff') {
    const resumes = matchingEvents(safeTrace, 'controller-session-resumed');
    for (const resume of resumes) {
      const pathName = `trace[${resume.index}]`;
      if (resume.event.actor !== 'host' || resume.event.target !== 'controller') {
        addError(errors, 'CONTROLLER_RESUME_AUTHORITY', pathName, 'the host adapter must resume the controller session');
      }
      if (resume.event.session_id !== controllerSessionId) {
        addError(errors, 'CONTROLLER_SESSION_SUBSTITUTION', `${pathName}.session_id`, 'every resume must use the explicit started session_id');
      }
      if (resume.event.resume_supported !== true) {
        addError(errors, 'CONTROLLER_RESUME_UNVERIFIED', pathName, 'controller resume must attest explicit-session support');
      }
      if (envelope.controller === 'codex' && resume.event.multi_agent !== false) {
        addError(errors, 'CODEX_MULTI_AGENT_ENABLED', `${pathName}.multi_agent`, 'every external Codex controller resume must disable multi-agent execution');
      }
    }
    const returnedToController = safeTrace
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => ['proof-receipt-returned', 'user-answer-returned'].includes(event.type)
        && event.target === 'controller');
    for (const returned of returnedToController) {
      const resume = resumes.find((candidate) => candidate.index > returned.index);
      if (!resume) {
        addError(
          errors,
          'CONTROLLER_RESUME_REQUIRED',
          `trace[${returned.index}]`,
          'every receipt or user answer returned to an external controller must resume the same session'
        );
        continue;
      }
      const laterDecision = decisions.find((decision) => decision.index > resume.index);
      if (!laterDecision) {
        addError(errors, 'CONTROLLER_DECISION_AFTER_RESUME', `trace[${resume.index}]`, 'a resumed controller must return a later control decision');
      }
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
