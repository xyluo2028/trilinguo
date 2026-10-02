import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('an occupied API port reports a startup failure and exits nonzero', { timeout: 10_000 }, async t => {
  const occupied = createServer();
  occupied.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => occupied.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => occupied.close(() => resolve())));
  const directory = mkdtempSync(path.join(tmpdir(), 'trilinguo-startup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, PORT: String((occupied.address() as AddressInfo).port), TRILINGUO_DB: path.join(directory, 'progress.sqlite') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const code = await new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  assert.equal(code, 1);
  assert.match(output, /Could not start Trilinguo:.*EADDRINUSE/);
  assert.doesNotMatch(output, /Trilinguo listening/);
});
