import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fileURLToPath(new URL('./artifacts/life-price-first-browser-profile/', import.meta.url));
const url = 'http://127.0.0.1:4179/tests/life-price-first.html';
const result = await new Promise((resolve, reject) => {
  const process = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    `--user-data-dir=${profile}`,
    '--virtual-time-budget=5000',
    '--window-size=900,900',
    '--dump-dom',
    url
  ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let errors = '';
  process.stdout.on('data', data => output += data);
  process.stderr.on('data', data => errors += data);
  process.on('error', reject);
  process.on('close', () => resolve({ output, errors }));
});

const status = result.output.match(/<p id="status">([^<]*)<\/p>/)?.[1] || 'Did not finish';
const checks = [...result.output.matchAll(/<li class="(?:pass|fail)">([^<]*)<\/li>/g)].map(match => match[1]);
const report = [status, ...checks].join('\n');
await writeFile(new URL('./artifacts/life-price-first-report.txt', import.meta.url), report);
await writeFile(new URL('./artifacts/life-price-first-errors.log', import.meta.url), result.errors);
if (!result.output.includes('data-result="passed"')) process.exitCode = 1;
