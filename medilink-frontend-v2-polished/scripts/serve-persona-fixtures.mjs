// Local, read-only fixture API for browser-controlled native screenshot sessions.
// Start: node scripts/serve-persona-fixtures.mjs
// Start Next separately with NEXT_PUBLIC_API_URL=/api and
// API_PROXY_URL=http://127.0.0.1:3101, then open this through the Next origin:
// /api/__persona-demo/candidate?next=/app/search
// /api/__persona-demo/recruiter?next=/establishment/current-missions
// Every unknown API path fails closed and is logged. No request reaches a backend.
import http from 'node:http';
import { personaFixtureResponse } from './fixtures/persona-interface.mjs';

const port = Number(process.env.PERSONA_FIXTURE_PORT || 3101);
const apiPaths = new Set();
const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://localhost');
  const endpoint = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const cookies = Object.fromEntries((request.headers.cookie || '').split(';').map(value => value.trim().split('=')));

  if (endpoint.startsWith('/__persona-demo/')) {
    const requestedRole = endpoint.split('/').at(-1);
    const role = requestedRole === 'establishment' ? 'recruiter' : requestedRole;
    if (!['candidate', 'recruiter'].includes(role)) {
      response.writeHead(400).end('Choose candidate or recruiter.');
      return;
    }
    const defaultPath = role === 'candidate' ? '/app/search' : '/establishment/current-missions';
    const target = url.searchParams.get('next') || defaultPath;
    const safeTarget = target.startsWith('/') && !target.startsWith('//') && !target.includes('\\') ? target : defaultPath;
    const requestedScenario = url.searchParams.get('scenario');
    const scenario = ['mission', 'report', 'offer', 'candidates'].includes(requestedScenario) ? requestedScenario : '';
    response.setHeader('Set-Cookie', [
      `persona_fixture_role=${role}; HttpOnly; SameSite=Lax; Path=/`,
      `persona_fixture_scenario=${scenario}; HttpOnly; SameSite=Lax; Path=/`,
    ]);
    response.writeHead(302, { Location: safeTarget }).end();
    return;
  }
  if (endpoint === '/__persona-fixture-health') {
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ mode: 'fictional-only', apiPaths: [...apiPaths].sort() }));
    return;
  }

  const role = cookies.persona_fixture_role === 'recruiter' ? 'recruiter' : 'candidate';
  const result = personaFixtureResponse(endpoint, request.method, role, cookies.persona_fixture_scenario);
  apiPaths.add(`${request.method} ${endpoint}`);
  if (!result) {
    console.error(`Unmocked API request: ${request.method} ${endpoint}`);
    response.writeHead(418, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: `No fictional fixture for ${endpoint}` }));
    return;
  }
  if (result.eventStream) {
    response.writeHead(200, { 'Content-Type': 'text/event-stream' }).end(': fictional demo fixture\n\n');
    return;
  }
  response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(result.data));
});
server.listen(port, '127.0.0.1', () => console.log(`Fictional persona fixture API: http://127.0.0.1:${port}/api`));
