import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = ts.transpileModule(fs.readFileSync('src/lib/nebius/token-factory.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function client(env, fetch) {
  const exports = {};
  vm.runInNewContext(source,{ exports, process:{env}, fetch, URL, AbortSignal, Date });
  return exports.NebiusTokenFactoryClient;
}
const options = { modelTier:'nemotron-3-ultra' };
test('no implicit demo and no network call without credentials',async () => {
  await assert.rejects(client({},() => {throw Error('unexpected fetch');}).generateResponse('hello',options), /Configure NEBIUS_API_KEY/);
});
test('explicit demo is identified and uses zero model tokens',async () => {
  const r = await client({INFERENCE_MODE:'demo'},() => {throw Error('unexpected fetch');}).generateResponse('hello',options);
  assert.match(r.modelUsed,/demo/); assert.equal(r.tokensUsed,0);
});
test('live request uses configured NVIDIA model and authenticated HTTPS',async () => {
  let observed;
  const r = await client({NEBIUS_API_KEY:'test-only-fixture',NEBIUS_MODEL:'nvidia/test-nemotron'},async (url,init) => {
    observed={url,init}; return {ok:true,json:async () => ({choices:[{message:{content:'Verified fixture response'}}],usage:{total_tokens:12}})};
  }).generateResponse('hello',options);
  assert.equal(observed.url,'https://api.tokenfactory.nebius.com/v1/chat/completions');
  assert.equal(observed.init.headers.Authorization,'Bearer test-only-fixture');
  assert.equal(observed.init.redirect,'error');
  assert.equal(JSON.parse(observed.init.body).model,'nvidia/test-nemotron');
  assert.equal(r.text,'Verified fixture response'); assert.equal(r.tokensUsed,12);
});
test('provider errors never become successful demo responses',async () => {
  const c=client({NEBIUS_API_KEY:'test-only-fixture',NEBIUS_MODEL:'nvidia/test-nemotron',INFERENCE_MODE:'demo'},async () => ({ok:false,status:401}));
  await assert.rejects(c.generateResponse('hello',options),/HTTP 401/);
});
test('empty provider output and insecure endpoints are rejected',async () => {
  await assert.rejects(client({NEBIUS_API_KEY:'test-only-fixture',NEBIUS_MODEL:'nvidia/test-nemotron'},async () => ({ok:true,json:async () => ({choices:[]})})).generateResponse('hello',options),/no completion/);
  await assert.rejects(client({NEBIUS_API_KEY:'test-only-fixture',NEBIUS_MODEL:'nvidia/test-nemotron',NEBIUS_BASE_URL:'http://example.invalid/v1'},() => {throw Error('unexpected fetch');}).generateResponse('hello',options),/HTTPS/);
});

test('legacy provider prefixes are normalized for overrides and tier configuration',async () => {
  for (const setting of ['NEBIUS_MODEL','NEBIUS_MODEL_ULTRA']) {
    let requested;
    const r = await client({NEBIUS_API_KEY:'test-only-fixture',[setting]:'nebius/nvidia/test-nemotron'},async (_url,init) => {
      requested = JSON.parse(init.body).model;
      return {ok:true,json:async () => ({choices:[{message:{content:'Live fixture'}}]})};
    }).generateResponse('hello',options);
    assert.equal(requested,'nvidia/test-nemotron');
    assert.equal(r.modelUsed,'nvidia/test-nemotron (Live Nebius Token Factory)');
  }
});

test('configuration whitespace is trimmed and invalid model labels get actionable guidance',async () => {
  let body;
  await client({NEBIUS_API_KEY:' fixture ',NEBIUS_MODEL:' nvidia/test-nemotron ',NEBIUS_BASE_URL:' https://api.tokenfactory.nebius.com/v1 '},async (url,init) => {
    assert.equal(url,'https://api.tokenfactory.nebius.com/v1/chat/completions');
    assert.equal(init.headers.Authorization,'Bearer fixture'); body=JSON.parse(init.body);
    return {ok:true,json:async () => ({choices:[{message:{content:'ok'}}]})};
  }).generateResponse('hello',options);
  assert.equal(body.model,'nvidia/test-nemotron'); assert.equal(body.max_tokens,2048);
  await assert.rejects(client({NEBIUS_API_KEY:'fixture',NEBIUS_MODEL:'Nemotron Ultra'},() => {throw Error('unexpected fetch');}).generateResponse('hello',options),/doctor:nebius/);
});
