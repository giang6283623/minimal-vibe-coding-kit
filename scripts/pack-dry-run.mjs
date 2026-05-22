#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const cache = process.env.MVCK_NPM_CACHE || path.join(os.tmpdir(), 'mvck-npm-cache');
const result = spawnSync(npm, ['pack', '--dry-run'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    npm_config_cache: cache
  }
});

process.exit(result.status ?? 1);
