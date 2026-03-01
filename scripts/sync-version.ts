import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const rootDir = join(__dirname, '..');
const packagePath = join(rootDir, 'package.json');

const gitTag = execFileSync('git', ['describe', '--tags', '--abbrev=0']).toString().trim();
const version = gitTag.replace(/^v/, '');

const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
pkg.version = version;
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Version synced: ${gitTag} → ${version}`);
