import fs from 'node:fs';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

// Read-only Git metadata adapter, hard-bounded to the current repository:
// the requested root must resolve (through symlinks) to the same toplevel as
// the process working directory, or the adapter refuses. A revert commit is
// an issue *candidate* (confidence-scored downstream), never automatically a
// failure.

function repoToplevel(dir) {
  const res = spawnSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`not a git repository: ${dir}`);
  }
  return fs.realpathSync(res.stdout.trim());
}

export function readGitEvents(repoRoot, limit = 500) {
  const requested = repoToplevel(repoRoot);
  const current = repoToplevel(process.cwd());
  if (requested !== current) {
    throw new Error(
      `gitRoot ${repoRoot} resolves to ${requested}, outside the current repository ${current}; tutien only reads the current repo's history`
    );
  }
  const res = spawnSync('git', ['log', '-n', String(limit), '--pretty=format:%H%x1f%aI%x1f%s%x1e'], {
    cwd: requested,
    encoding: 'utf8'
  });
  if (res.status !== 0) {
    throw new Error(`git log failed in ${requested}: ${res.stderr?.trim() || res.status}`);
  }
  return res.stdout
    .split('\x1e')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((rec) => {
      const [hash, ts, subject] = rec.split('\x1f');
      return {
        type: 'commit',
        session: 'git',
        ts,
        text: subject,
        commit: { hash, isRevert: /^Revert\b/.test(subject) }
      };
    });
}
