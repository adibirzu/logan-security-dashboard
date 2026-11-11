const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function loadRoute(relative) {
  const filename = path.resolve(relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = mod.require.bind(mod);
  mod.require = id => id.startsWith('@/') ? loadRoute('src/' + id.slice(2) + '.ts') : originalRequire(id);
  mod._compile(output, filename);
  return mod.exports;
}
const route = loadRoute('src/app/api/security-rules/route.ts');

test('catalog API returns pinned canonical content and honest provider status', async () => {
  const response = await route.GET(new NextRequest('http://localhost/api/security-rules?search=Windows%20Failed%20Logon%20Burst&limit=20'));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.metadata.upstream_commit, '2ae1c63d07bbafe9113437a952749d9a09327757');
  const rule = data.rules.find(r => r.source_file === 'queries/hunting/windows_access_failed_logon_burst.json');
  assert.ok(rule, 'current Windows access hunt must be discoverable');
  assert.equal(rule.provider_validation, 'not_run');
  assert.ok(rule.oci_query.includes("'Event ID' = '4625'"));
});

test('catalog API rejects negative or malformed pagination', async () => {
  for (const query of ['offset=-1', 'limit=0', 'limit=nope', 'limit=5001']) {
    const response = await route.GET(new NextRequest('http://localhost/api/security-rules?' + query));
    assert.equal(response.status, 400);
  }
});

test('catalog cannot be replaced by generating sample rules through POST', async () => {
  const response = await route.POST(new NextRequest('http://localhost/api/security-rules', {
    method: 'POST', body: JSON.stringify({ action: 'regenerate', count: 1 }),
  }));
  assert.equal(response.status, 405);
});

const cp = require('node:child_process');
const { promisify } = require('node:util');
const calls = [];
let providerResult = { success: true, results: [{ Hits: 3 }], total: 3,
  query_used: 'exact', status: 'partial', are_partial_results: true };
const fake = () => {};
fake[promisify.custom] = async (...args) => {
  calls.push(args);
  return { stdout: JSON.stringify(providerResult), stderr: '' };
};
const originalExec = cp.exec;
const originalExecFile = cp.execFile;
cp.exec = fake;
cp.execFile = fake;
const searchRoute = loadRoute('src/app/api/mcp/search/route.ts');
cp.exec = originalExec;
cp.execFile = originalExecFile;

test('search passes exact query and requested limit without a shell, and exposes partial results', async () => {
  calls.length = 0;
  const query = "'Log Source' = 'Windows Sysmon Events' and User != 'SYSTEM'";
  const response = await searchRoute.POST(new NextRequest('http://localhost/api/mcp/search', {
    method: 'POST', body: JSON.stringify({ query, maxCount: 23, timePeriodMinutes: 15 }),
  }));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls[0][0], 'python3');
  assert.ok(calls[0][1].includes(query));
  assert.deepEqual(calls[0][1].slice(-2), ['--max-count', '23']);
  assert.equal(data.arePartialResults, true);
  assert.equal(data.status, 'partial');
  assert.equal(data.results[0].rawTimestamp, null);
});

test('search rejects invalid windows and limits before spawning Python', async () => {
  calls.length = 0;
  for (const options of [{ maxResults: 0 }, { maxCount: 2001 }, { timeRange: '24h' }, { timePeriodMinutes: -1 }]) {
    const response = await searchRoute.POST(new NextRequest('http://localhost/api/mcp/search', {
      method: 'POST', body: JSON.stringify({ query: '* | head 1', ...options }),
    }));
    assert.equal(response.status, 400);
  }
  assert.equal(calls.length, 0);
});

const queriesRoute = loadRoute('src/app/api/logan-queries/route.ts');
test('query library exposes the same canonical IDs that it can execute', async () => {
  const response = await queriesRoute.GET(new NextRequest('http://localhost/api/logan-queries'));
  const data = await response.json();
  assert.equal(data.data.total_queries, 1368);
  assert.ok(data.data.queries.some(q => q.id === 'logan-detections:hunting/windows_access_failed_logon_burst'));
  const originalFetch = global.fetch;
  let sent;
  global.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return new Response(JSON.stringify({ success: false, error: 'invalid field' }), { status: 500 });
  };
  try {
    const result = await queriesRoute.POST(new NextRequest('http://localhost/api/logan-queries', {
      method: 'POST', body: JSON.stringify({ queryId: 'logan-detections:hunting/windows_access_failed_logon_burst', timeRange: '24h', maxResults: 23 }),
    }));
    const body = await result.json();
    assert.equal(body.success, false);
    assert.equal(result.status, 500);
    assert.equal(sent.timePeriodMinutes, 1440);
    assert.equal(sent.maxResults, 23);
    assert.ok(sent.query.includes("'Event ID' = '4625'"));
  } finally { global.fetch = originalFetch; }
});
