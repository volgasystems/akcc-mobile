import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
const cwd=new URL('../',import.meta.url);
const env={...process.env,EAS_BUILD_PROFILE:'',EXPO_PUBLIC_EXPO_PROJECT_ID:''};
test('config links confirmed existing Expo identity without environment variables',()=>{
 const config=JSON.parse(execFileSync(process.execPath,['-e','console.log(JSON.stringify(require("./app.config.js")()))'],{cwd,env,encoding:'utf8'}));
 assert.equal(config.owner,'aucklandknightss-team');assert.equal(config.slug,'auckland-knights');assert.equal(config.extra.eas.projectId,'cf884347-bb5a-4eb9-971f-198a58048076');
});
test('config blocks a stale project ID override',()=>{
 const result=spawnSync(process.execPath,['-e','require("./app.config.js")()'],{cwd,env:{...env,EXPO_PUBLIC_EXPO_PROJECT_ID:'wrong'},encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/does not match/);
});
