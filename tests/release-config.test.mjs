import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {validateRelease}=require('../scripts/validate-release.cjs');
const valid={EXPO_PUBLIC_API_URL:'https://mobile-api.aucklandknights.co.nz',EXPO_PUBLIC_EXPO_PROJECT_ID:'12345678-1234-1234-1234-123456789abc',EXPO_PUBLIC_ACCOUNTS_ENABLED:'false',EXPO_PUBLIC_PUSH_ENABLED:'false'};
test('release accepts explicit configuration without enabling gated features',()=>assert.deepEqual(validateRelease(valid),[]));
test('release blocks missing configuration and LAN or insecure API',()=>{assert.ok(validateRelease({}).length);for(const url of ['http://192.168.1.167:8787','https://127.0.0.1','https://api.local','https://user:pass@api.club.nz','https://api.club.nz?secret=x'])assert.ok(validateRelease({...valid,EXPO_PUBLIC_API_URL:url}).length,url);});
test('release rejects public secret configuration',()=>assert.ok(validateRelease({...valid,EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:'dummy'}).length));
