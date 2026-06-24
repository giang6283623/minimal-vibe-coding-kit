#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const target = path.resolve(process.argv[2] || process.cwd());
const extra = process.argv.slice(3);
const probe = path.join(target, 'skills/agentshield-security-review/scripts/agentshield_repo_probe.py');

if (!fs.existsSync(probe)) {
  console.error(`AgentShield probe not found: ${path.relative(target, probe)}`);
  process.exit(1);
}

for (const python of ['python', 'python3', 'py']) {
  const result = spawnSync(python, [probe, target, ...extra], { stdio: 'inherit' });
  if (result.error?.code === 'ENOENT') continue;
  process.exit(result.status ?? 1);
}

console.error('No Python executable found. Install Python 3 or run the probe manually.');
process.exit(1);
