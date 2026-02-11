import { createServer } from 'http';
import { randomUUID } from 'crypto';

const PORT = 8000;

// ── Mock Data ───────────────────────────────────────

const personaTemplates = [
  {
    id: randomUUID(), name: 'Tech-Savvy Millennial', emoji: '💻', category: 'demographic',
    short_description: 'Impatient power user, expects fast interactions and modern UI patterns.',
    default_profile: { age: 28, tech_literacy: 'advanced', device_preference: 'mobile' },
    created_at: new Date().toISOString(),
  },
  {
    id: randomUUID(), name: 'Senior Citizen', emoji: '👴', category: 'accessibility',
    short_description: 'Needs larger text, clear navigation, and simple layouts. Easily confused by modals.',
    default_profile: { age: 72, tech_literacy: 'beginner', accessibility_needs: ['large-text'] },
    created_at: new Date().toISOString(),
  },
  {
    id: randomUUID(), name: 'Busy Parent', emoji: '👩‍👧', category: 'demographic',
    short_description: 'Multitasking, short attention span, often interrupted mid-task.',
    default_profile: { age: 35, tech_literacy: 'intermediate', motivation: 'speed' },
    created_at: new Date().toISOString(),
  },
  {
    id: randomUUID(), name: 'Screen Reader User', emoji: '🦯', category: 'accessibility',
    short_description: 'Relies on screen readers; expects proper ARIA labels and keyboard navigation.',
    default_profile: { age: 40, tech_literacy: 'intermediate', accessibility_needs: ['screen-reader'] },
    created_at: new Date().toISOString(),
  },
  {
    id: randomUUID(), name: 'First-Time Visitor', emoji: '🆕', category: 'behavioral',
    short_description: 'No prior knowledge of the site. Explores cautiously, reads everything.',
    default_profile: { age: 30, tech_literacy: 'intermediate', familiarity: 'none' },
    created_at: new Date().toISOString(),
  },
  {
    id: randomUUID(), name: 'Impatient Executive', emoji: '👔', category: 'behavioral',
    short_description: 'Wants answers fast. Low tolerance for loading times or unnecessary steps.',
    default_profile: { age: 45, tech_literacy: 'advanced', motivation: 'efficiency' },
    created_at: new Date().toISOString(),
  },
  {
    id: randomUUID(), name: 'International User', emoji: '🌍', category: 'demographic',
    short_description: 'Non-native English speaker, may struggle with idioms and complex layouts.',
    default_profile: { age: 33, tech_literacy: 'intermediate', language: 'non-native-english' },
    created_at: new Date().toISOString(),
  },
  {
    id: randomUUID(), name: 'Low Vision User', emoji: '👓', category: 'accessibility',
    short_description: 'Uses browser zoom at 200%, needs high contrast and large click targets.',
    default_profile: { age: 55, tech_literacy: 'beginner', accessibility_needs: ['zoom', 'high-contrast'] },
    created_at: new Date().toISOString(),
  },
];

const studies = [];
let wsClients = [];

function createMockStudy(url, tasks, personaIds) {
  const id = randomUUID();
  const study = {
    id, url, starting_path: '/', status: 'setup',
    overall_score: null, executive_summary: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    tasks: tasks.map((t, i) => ({
      id: randomUUID(), study_id: id, description: t.description,
      order_index: t.order_index ?? i, created_at: new Date().toISOString(),
    })),
    personas: personaIds.map(tid => ({
      id: randomUUID(), study_id: id, template_id: tid,
      profile: personaTemplates.find(p => p.id === tid)?.default_profile ?? {},
      is_custom: false, created_at: new Date().toISOString(),
    })),
    sessions: [], issues: [], insights: [],
  };
  studies.push(study);
  return study;
}

function simulateStudyRun(study) {
  study.status = 'running';
  study.updated_at = new Date().toISOString();

  const sessions = [];
  for (const persona of study.personas) {
    for (const task of study.tasks) {
      const session = {
        id: randomUUID(), study_id: study.id, persona_id: persona.id,
        task_id: task.id, status: 'running', total_steps: 0,
        task_completed: false, summary: null, emotional_arc: {},
        current_think_aloud: null, current_emotional_state: 'curious',
        current_action: 'navigating', current_task_progress: 0,
        created_at: new Date().toISOString(),
      };
      sessions.push(session);
    }
  }
  study.sessions = sessions;

  const template = (pid) => personaTemplates.find(t => t.id === pid);
  const emotions = ['curious', 'curious', 'confused', 'frustrated', 'satisfied', 'confused', 'satisfied', 'satisfied'];
  const actions = ['click', 'type', 'scroll', 'click', 'navigate', 'submit', 'click', 'submit'];
  const maxSteps = 8;
  const totalSessionSteps = sessions.length * maxSteps;
  let stepsDone = 0;

  const thinkAlouds = [
    "Let me look around and see what's here...",
    "I'll try clicking this button to see what happens.",
    "Hmm, where is the navigation menu?",
    "This form is a bit confusing, not sure what to enter.",
    "Oh I see, I need to scroll down for more options.",
    "Let me try submitting this form now.",
    "Great, that worked! Moving on to the next part.",
    "I think I've completed what I needed to do.",
  ];

  // Run ALL sessions in parallel — each tick advances every active session by one step
  const interval = setInterval(() => {
    const activeSessions = sessions.filter(s => s.status === 'running');
    if (activeSessions.length === 0) {
      clearInterval(interval);
      study.status = 'analyzing';
      study.updated_at = new Date().toISOString();
      broadcast({ type: 'study:analyzing', study_id: study.id, phase: 'synthesis' });
      setTimeout(() => finishStudy(study), 3000);
      return;
    }

    for (const session of activeSessions) {
      session.total_steps++;
      const stepNum = session.total_steps;
      stepsDone++;

      const emotion = emotions[Math.min(stepNum - 1, emotions.length - 1)];
      const action = actions[(stepNum - 1) % actions.length];
      const thinkAloud = thinkAlouds[stepNum - 1] ?? 'Navigating...';
      const taskProgress = Math.min(100, stepNum * 14);

      session.emotional_arc[`step_${stepNum}`] = emotion;
      session.current_think_aloud = thinkAloud;
      session.current_emotional_state = emotion;
      session.current_action = action;
      session.current_task_progress = taskProgress;

      const personaName = template(study.personas.find(p => p.id === session.persona_id)?.template_id)?.name ?? 'Persona';
      broadcast({
        type: 'session:step', session_id: session.id, persona_name: personaName,
        step_number: stepNum, think_aloud: thinkAloud,
        screenshot_url: '', emotional_state: emotion,
        action, task_progress: taskProgress,
      });

      if (stepNum >= maxSteps) {
        session.status = 'complete';
        session.task_completed = Math.random() > 0.2;
        session.summary = session.task_completed
          ? `Successfully completed the task after ${stepNum} steps.`
          : `Got stuck and was unable to complete the task after ${stepNum} steps.`;
        session.current_think_aloud = session.summary;
        session.current_emotional_state = session.task_completed ? 'satisfied' : 'frustrated';
        session.current_action = 'done';
        session.current_task_progress = 100;
        broadcast({ type: 'session:complete', session_id: session.id, completed: session.task_completed, total_steps: stepNum });
      }
    }

    const percent = Math.round((stepsDone / totalSessionSteps) * 80);
    broadcast({ type: 'study:progress', study_id: study.id, percent, phase: 'navigating' });
  }, 1500);
}

function finishStudy(study) {
  study.status = 'complete';
  study.overall_score = Math.round(40 + Math.random() * 50);
  study.executive_summary = `This usability study tested ${study.url} with ${study.personas.length} AI personas across ${study.tasks.length} task(s). The overall usability score is ${study.overall_score}/100.\n\nKey findings: Navigation structure needs improvement, especially for less tech-savvy users. Form inputs lack clear labels and error messages. Mobile responsiveness is adequate but touch targets are too small in the footer. The checkout flow has a confusing step where users must re-enter information already provided.`;
  study.updated_at = new Date().toISOString();

  // Generate mock issues
  const severities = ['critical', 'major', 'minor', 'enhancement'];
  const issueDescriptions = [
    { desc: 'Primary CTA button is below the fold on mobile devices', sev: 'critical', rec: 'Move the main call-to-action above the fold' },
    { desc: 'Form validation errors are not announced to screen readers', sev: 'critical', rec: 'Add aria-live regions for error messages' },
    { desc: 'Navigation menu lacks keyboard accessibility', sev: 'major', rec: 'Add keyboard event handlers and focus management' },
    { desc: 'Color contrast ratio is 3.2:1 on secondary text (needs 4.5:1)', sev: 'major', rec: 'Darken the secondary text color to meet WCAG AA' },
    { desc: 'Loading spinner has no text alternative', sev: 'minor', rec: 'Add aria-label="Loading" to the spinner element' },
    { desc: 'Search results page lacks pagination', sev: 'minor', rec: 'Add pagination or infinite scroll with proper announcements' },
    { desc: 'Consider adding breadcrumb navigation for better wayfinding', sev: 'enhancement', rec: 'Implement breadcrumbs on all pages deeper than 2 levels' },
    { desc: 'Footer links could benefit from grouping by category', sev: 'enhancement', rec: 'Group footer links under semantic headings' },
  ];

  study.issues = issueDescriptions.map((item, i) => ({
    id: randomUUID(), step_id: null,
    session_id: study.sessions[i % study.sessions.length]?.id ?? randomUUID(),
    study_id: study.id, element: null, description: item.desc, severity: item.sev,
    heuristic: 'Visibility of system status', wcag_criterion: 'WCAG 2.1 AA',
    recommendation: item.rec, page_url: study.url, created_at: new Date().toISOString(),
  }));

  // Generate mock insights
  study.insights = [
    { id: randomUUID(), study_id: study.id, type: 'universal', title: 'Mobile CTA Visibility', description: 'All personas struggled to find the primary action button on mobile viewports.', severity: 'high', impact: 'high', effort: 'low', personas_affected: null, evidence: null, rank: 1, created_at: new Date().toISOString() },
    { id: randomUUID(), study_id: study.id, type: 'recommendation', title: 'Improve Form Error Handling', description: 'Add inline validation with clear error messages. Ensure errors are announced to screen readers.', severity: 'high', impact: 'high', effort: 'medium', personas_affected: null, evidence: null, rank: 2, created_at: new Date().toISOString() },
    { id: randomUUID(), study_id: study.id, type: 'recommendation', title: 'Add Keyboard Navigation Support', description: 'Implement proper focus management and keyboard shortcuts for power users.', severity: 'medium', impact: 'medium', effort: 'medium', personas_affected: null, evidence: null, rank: 3, created_at: new Date().toISOString() },
    { id: randomUUID(), study_id: study.id, type: 'comparative', title: 'Accessibility Users Struggle Most', description: 'Screen reader and low vision personas had significantly lower task completion rates.', severity: 'high', impact: 'high', effort: 'high', personas_affected: null, evidence: null, rank: 4, created_at: new Date().toISOString() },
    { id: randomUUID(), study_id: study.id, type: 'recommendation', title: 'Simplify Checkout Flow', description: 'Reduce the number of steps from 5 to 3 by combining address and payment forms.', severity: 'medium', impact: 'high', effort: 'high', personas_affected: null, evidence: null, rank: 5, created_at: new Date().toISOString() },
  ];

  // Generate mock session steps
  for (const session of study.sessions) {
    session.steps = Array.from({ length: session.total_steps || 8 }, (_, i) => ({
      id: randomUUID(), session_id: session.id, step_number: i + 1,
      page_url: study.url + (i > 3 ? '/checkout' : ''),
      page_title: i > 3 ? 'Checkout' : 'Home',
      screenshot_path: null, think_aloud: `Step ${i + 1}: Exploring the page...`,
      action_type: ['click', 'type', 'scroll', 'click', 'navigate', 'submit', 'click', 'submit'][i],
      action_selector: null, action_value: null, confidence: 0.7 + Math.random() * 0.3,
      task_progress: Math.min(100, (i + 1) * 14), emotional_state: ['curious', 'curious', 'confused', 'frustrated', 'confused', 'satisfied', 'satisfied', 'satisfied'][i],
      click_x: Math.round(100 + Math.random() * 600), click_y: Math.round(100 + Math.random() * 400),
      viewport_width: 1280, viewport_height: 720,
      created_at: new Date().toISOString(),
    }));
    session.issues = study.issues.filter(iss => iss.session_id === session.id);
  }

  broadcast({ type: 'study:complete', study_id: study.id, score: study.overall_score, issues_count: study.issues.length });
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  console.log(`[WS BROADCAST] to ${wsClients.length} client(s):`, msg.type, msg.study_id ?? msg.session_id ?? '');
  wsClients.forEach(ws => {
    try { ws.send(data); } catch (e) { console.log('[WS BROADCAST] send error:', e.message); }
  });
}

// ── HTTP Router ─────────────────────────────────────

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function cors(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end();
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

function route(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  console.log(`[HTTP] ${method} ${path}`);
  if (method === 'OPTIONS') return cors(res);

  // Health
  if (path === '/api/v1/health') {
    return json(res, { status: 'ok', db: 'ok', redis: 'ok' });
  }

  // Studies
  if (path === '/api/v1/studies' && method === 'GET') {
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '20');
    const statusFilter = url.searchParams.get('status');
    let items = [...studies].reverse();
    if (statusFilter) items = items.filter(s => s.status === statusFilter);
    return json(res, { items: items.slice((page-1)*limit, page*limit), total: items.length, page, limit });
  }

  if (path === '/api/v1/studies' && method === 'POST') {
    return readBody(req).then(body => {
      const study = createMockStudy(body.url, body.tasks, body.persona_template_ids);
      return json(res, study, 201);
    });
  }

  const studyMatch = path.match(/^\/api\/v1\/studies\/([^/]+)$/);
  if (studyMatch && method === 'GET') {
    const study = studies.find(s => s.id === studyMatch[1]);
    if (!study) return json(res, { detail: 'Not found' }, 404);
    return json(res, study);
  }
  if (studyMatch && method === 'DELETE') {
    const idx = studies.findIndex(s => s.id === studyMatch[1]);
    if (idx >= 0) studies.splice(idx, 1);
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
    return res.end();
  }

  const runMatch = path.match(/^\/api\/v1\/studies\/([^/]+)\/run$/);
  if (runMatch && method === 'POST') {
    const study = studies.find(s => s.id === runMatch[1]);
    if (!study) return json(res, { detail: 'Not found' }, 404);
    simulateStudyRun(study);
    return json(res, { study_id: study.id, job_id: randomUUID(), status: 'running' });
  }

  const statusMatch = path.match(/^\/api\/v1\/studies\/([^/]+)\/status$/);
  if (statusMatch) {
    const study = studies.find(s => s.id === statusMatch[1]);
    if (!study) return json(res, { detail: 'Not found' }, 404);
    return json(res, { study_id: study.id, status: study.status, percent: study.status === 'complete' ? 100 : 50, phase: study.status === 'running' ? 'navigating' : null });
  }

  // Sessions
  const sessionsMatch = path.match(/^\/api\/v1\/studies\/([^/]+)\/sessions$/);
  if (sessionsMatch) {
    const study = studies.find(s => s.id === sessionsMatch[1]);
    return json(res, study?.sessions ?? []);
  }

  const sessionMatch = path.match(/^\/api\/v1\/sessions\/([^/]+)$/);
  if (sessionMatch) {
    for (const study of studies) {
      const session = study.sessions.find(s => s.id === sessionMatch[1]);
      if (session) return json(res, { ...session, steps: session.steps ?? [], issues: session.issues ?? [] });
    }
    return json(res, { detail: 'Not found' }, 404);
  }

  // Issues
  const issuesMatch = path.match(/^\/api\/v1\/studies\/([^/]+)\/issues$/);
  if (issuesMatch) {
    const study = studies.find(s => s.id === issuesMatch[1]);
    let issues = study?.issues ?? [];
    const sev = url.searchParams.get('severity');
    if (sev) issues = issues.filter(i => i.severity === sev);
    return json(res, issues);
  }

  // Insights
  const insightsMatch = path.match(/^\/api\/v1\/studies\/([^/]+)\/insights$/);
  if (insightsMatch) {
    const study = studies.find(s => s.id === insightsMatch[1]);
    return json(res, study?.insights ?? []);
  }

  // Heatmap
  const heatmapMatch = path.match(/^\/api\/v1\/studies\/([^/]+)\/heatmap$/);
  if (heatmapMatch) {
    const study = studies.find(s => s.id === heatmapMatch[1]);
    const points = [];
    for (const session of study?.sessions ?? []) {
      for (const step of session.steps ?? []) {
        if (step.click_x != null) {
          points.push({ page_url: step.page_url, click_x: step.click_x, click_y: step.click_y, viewport_width: step.viewport_width, viewport_height: step.viewport_height, persona_name: null });
        }
      }
    }
    return json(res, { page_url: study?.url ?? '', data_points: points, total_clicks: points.length });
  }

  // Report
  const reportMatch = path.match(/^\/api\/v1\/studies\/([^/]+)\/report$/);
  if (reportMatch) {
    return json(res, { study_id: reportMatch[1], format: 'markdown', available_formats: ['markdown', 'pdf'], generated: true });
  }

  const reportMdMatch = path.match(/^\/api\/v1\/studies\/([^/]+)\/report\/md$/);
  if (reportMdMatch) {
    const study = studies.find(s => s.id === reportMdMatch[1]);
    const md = `# Usability Report: ${study?.url ?? 'Unknown'}\n\n## Executive Summary\n\n${study?.executive_summary ?? 'No summary available.'}\n\n## Score: ${study?.overall_score ?? 'N/A'}/100\n\n## Issues Found: ${study?.issues?.length ?? 0}\n\n${(study?.issues ?? []).map(i => `### ${i.severity.toUpperCase()}: ${i.description}\n\n**Recommendation:** ${i.recommendation}\n`).join('\n')}\n\n## Recommendations\n\n${(study?.insights ?? []).filter(i => i.type === 'recommendation').map((i, idx) => `${idx+1}. **${i.title}** — ${i.description}`).join('\n')}\n`;
    res.writeHead(200, { 'Content-Type': 'text/markdown', 'Content-Disposition': 'attachment; filename="report.md"', 'Access-Control-Allow-Origin': '*' });
    return res.end(md);
  }

  const reportPdfMatch = path.match(/^\/api\/v1\/studies\/([^/]+)\/report\/pdf$/);
  if (reportPdfMatch) {
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="report.pdf"', 'Access-Control-Allow-Origin': '*' });
    return res.end('PDF not available in mock server');
  }

  // Persona templates
  if (path === '/api/v1/personas/templates') {
    const cat = url.searchParams.get('category');
    const filtered = cat ? personaTemplates.filter(t => t.category === cat) : personaTemplates;
    return json(res, filtered);
  }

  const templateMatch = path.match(/^\/api\/v1\/personas\/templates\/([^/]+)$/);
  if (templateMatch) {
    const t = personaTemplates.find(p => p.id === templateMatch[1]);
    if (!t) return json(res, { detail: 'Not found' }, 404);
    return json(res, t);
  }

  if (path === '/api/v1/personas/generate' && method === 'POST') {
    return readBody(req).then(body => {
      return json(res, { message: 'Persona generated (stub)', description: body.description });
    });
  }

  // Fallback
  json(res, { detail: 'Not found' }, 404);
}

// ── WebSocket (minimal) ─────────────────────────────

import { createHash } from 'crypto';

function decodeWsFrame(buffer) {
  if (buffer.length < 2) return null;
  const opcode = buffer[0] & 0x0f;
  const masked = (buffer[1] & 0x80) !== 0;
  let payloadLen = buffer[1] & 0x7f;
  let offset = 2;

  if (payloadLen === 126) {
    if (buffer.length < 4) return null;
    payloadLen = (buffer[2] << 8) | buffer[3];
    offset = 4;
  } else if (payloadLen === 127) {
    if (buffer.length < 10) return null;
    payloadLen = 0;
    for (let i = 0; i < 8; i++) payloadLen = payloadLen * 256 + buffer[offset + i];
    offset = 10;
  }

  const maskLen = masked ? 4 : 0;
  const totalLen = offset + maskLen + payloadLen;
  if (buffer.length < totalLen) return null;

  let payload = buffer.slice(offset + maskLen, totalLen);
  if (masked) {
    const mask = buffer.slice(offset, offset + 4);
    payload = Buffer.from(payload);
    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
  }

  return { opcode, payload, totalLen };
}

function handleUpgrade(req, socket) {
  const key = req.headers['sec-websocket-key'];
  const accept = createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-5AB9AA10BE11')
    .digest('base64');

  console.log('[WS] Upgrade request received');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  console.log('[WS] Handshake complete, connection open');

  let alive = true;
  const ws = {
    send(data) {
      if (!alive) return;
      try {
        const buf = Buffer.from(data);
        const frame = [];
        frame.push(0x81); // text frame
        if (buf.length < 126) {
          frame.push(buf.length);
        } else if (buf.length < 65536) {
          frame.push(126, (buf.length >> 8) & 0xff, buf.length & 0xff);
        } else {
          frame.push(127);
          for (let i = 7; i >= 0; i--) frame.push((buf.length >> (i * 8)) & 0xff);
        }
        socket.write(Buffer.concat([Buffer.from(frame), buf]));
      } catch {}
    }
  };

  let buf = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length > 0) {
      const frame = decodeWsFrame(buf);
      if (!frame) break;
      buf = buf.slice(frame.totalLen);

      console.log(`[WS] Frame received: opcode=${frame.opcode}, len=${frame.payload.length}`);
      if (frame.opcode === 0x8) {
        console.log('[WS] Close frame received');
        const closeFrame = Buffer.from([0x88, 0x00]);
        try { socket.write(closeFrame); } catch {}
        alive = false;
        socket.end();
        return;
      }
      if (frame.opcode === 0x9) {
        console.log('[WS] Ping received, sending pong');
        const pong = Buffer.alloc(2 + frame.payload.length);
        pong[0] = 0x8a;
        pong[1] = frame.payload.length;
        frame.payload.copy(pong, 2);
        try { socket.write(pong); } catch {}
        continue;
      }
      // Text frame
      if (frame.opcode === 0x1) {
        try {
          const text = frame.payload.toString('utf8');
          console.log('[WS] Text frame:', text);
        } catch {}
      }
    }
  });

  wsClients.push(ws);
  const cleanup = (reason) => { console.log('[WS] Connection closed:', reason ?? 'unknown'); alive = false; wsClients = wsClients.filter(c => c !== ws); };
  socket.on('close', () => cleanup('socket close'));
  socket.on('error', (err) => cleanup('socket error: ' + err.message));
}

// ── Start Server ────────────────────────────────────

const server = createServer(route);
server.on('upgrade', (req, socket) => {
  if (req.url === '/api/v1/ws') {
    handleUpgrade(req, socket);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Mock API server running at http://localhost:${PORT}`);
  console.log(`WebSocket at ws://localhost:${PORT}/api/v1/ws`);
  console.log(`\nEndpoints: health, studies, sessions, issues, insights, heatmap, report, personas`);
});
