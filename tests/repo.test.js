import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('ficheros de coordinación presentes', () => {
  for (const f of ['ORDERS.md', 'AGENTS.md', 'TASKS.md', 'PROGRESS.md', 'index.html', 'src/main.js']) {
    assert.ok(existsSync(f), `falta ${f}`);
  }
});
