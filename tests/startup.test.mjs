import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDirectRun, server } from '../server/index.mjs';

test('Windows startup accepts OneDrive paths containing spaces', () => {
  assert.equal(isDirectRun(String.raw`D:\OneDrive - FOCALCXM\Desktop\Auckland Knightts\mobile\akcc-mobile\server\index.mjs`, 'file:///D:/OneDrive%20-%20FOCALCXM/Desktop/Auckland%20Knightts/mobile/akcc-mobile/server/index.mjs', true), true);
  assert.equal(isDirectRun(String.raw`D:\other\server\index.mjs`, 'file:///D:/akcc-mobile/server/index.mjs', true), false);
});

test('importing account helpers does not start a listener', () => {
  assert.equal(server.listening, false);
  assert.equal(isDirectRun(undefined), false);
});

test('direct execution stays running and serves health without credentials', {timeout:15000}, async () => {
  const env = {...process.env, PORT:'0', MOBILE_ACCOUNTS_ENABLED:'false'};
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server/index.mjs', import.meta.url))], {env, stdio:['ignore','pipe','pipe']});
  try {
    const port = await new Promise((resolve, reject) => {
      let output='';
      child.stdout.on('data', chunk => {
        output+=chunk;
        const match=output.match(/AKCC read API listening on port (\d+)/);
        if(match) resolve(Number(match[1]));
      });
      child.once('error', reject);
      child.once('exit', code => reject(new Error(`API exited before startup: ${code}`)));
    });
    const response=await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{ok:true,accounts_enabled:false});
    assert.equal(child.exitCode,null);
  } finally {
    child.kill();
    if(child.exitCode===null) await new Promise(resolve=>child.once('exit',resolve));
  }
});
