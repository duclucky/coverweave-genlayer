import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { projectRoot } from './studio-config.mjs';

const git = args => execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8' });
const top = resolve(git(['rev-parse', '--show-toplevel']).trim());
if (top.toLowerCase() !== projectRoot.toLowerCase()) throw new Error('Wrong project Git root.');
const allow = /^(?:\.gitignore|README\.md|package(?:-lock)?\.json|requirements\.txt|pyproject\.toml|gltest\.config\.yaml|contracts\/coverweave\.py|scripts\/[a-z0-9_-]+\.(?:mjs|py|d\.mts)|shared\/[a-z0-9_-]+\.ts|tests\/(?:direct|integration|tooling)\/[a-z0-9_.-]+\.(?:py|mjs)|frontend\/(?:src\/.+\.(?:ts|tsx|css)|tests\/.+\.(?:mjs|tsx|ts)|api\/ic\.ts|(?:vite\.config\.ts|vitest\.config\.ts|vercel\.json|tsconfig\.json|package\.json|index\.html|\.env\.example))|docs\/(?:README\.md|DESIGN\.md|FRONTEND-BASELINE\.md|LOCAL-VERIFICATION\.md|TOOLCHAIN\.md|contract-schema\.json|evidence\/studio-dev\/[a-z0-9_-]+\.(?:json|md))|\.github\/workflows\/[a-z0-9_-]+\.yml)$/;
const staged = git(['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean);
const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
const commits = git(['rev-list', '--all']).trim().split('\n').filter(Boolean);
const secrets = [];
for (const path of [resolve(projectRoot, '.env'), resolve(projectRoot, '..', '.env')]) {
  if (!existsSync(path)) continue;
  for (const [name, value] of Object.entries(parseEnv(readFileSync(path, 'utf8'))))
    if (/(?:KEY|TOKEN|SECRET|PASSWORD|SEED)/i.test(name) && value.length >= 16) secrets.push(value);
}
let checked = 0;
function check(paths, revision) {
  for (const path of paths) {
    if (!allow.test(path)) throw new Error('Path is outside public allowlist: ' + path);
    const content = git(['show', revision + ':' + path]);
    if (secrets.some(secret => content.includes(secret))) throw new Error('Secret match in public content: ' + path);
    if (/MASTER-PROMPT-\w+-END-TO-END\.md|GENLAYER-PROJECT-PLAYBOOK\.md|[A-Z]:\\Users\\[^\\]+\\|[A-Z]:\\Genlayer Project\\/i.test(content))
      throw new Error('Internal control/path content: ' + path);
    checked++;
  }
}
check(tracked, '');
for (const commit of commits) check(git(['ls-tree', '-r', '--name-only', commit]).trim().split('\n').filter(Boolean), commit);
for (const path of ['.venv', 'node_modules', 'docs/ADMISSION.md']) {
  if (!existsSync(resolve(projectRoot, path))) throw new Error('Expected ignored local file is absent: ' + path);
  git(['check-ignore', path]);
}
console.log(JSON.stringify({ gitRoot: top, stagedFileCount: staged.length, trackedFileCount: tracked.length,
  historicalCommits: commits.length, checkedContents: checked, publicAllowlist: 'PASS', secretScan: 'PASS', ignoredLocalFiles: 'PASS' }, null, 2));
