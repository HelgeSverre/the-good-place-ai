// Bun fullstack server entry point

import { serve } from 'bun';
import homepage from './client/index.html';
import {
  handleGetCharacters,
  handleGetCharacter,
  handleGetScenarios,
  handleGetScenario,
  handleGenerateScenario,
} from './api/routes.js';
import {
  websocketHandlers,
  handleCreateScene,
  handleGetScene,
  handleDeleteScene,
  getSession,
} from './api/websocket.js';

// Load environment variables
import 'dotenv/config';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = serve({
  port: PORT,

  routes: {
    // Serve the React app
    '/': homepage,

    // Character endpoints
    '/api/characters': {
      async GET() {
        return handleGetCharacters();
      },
    },

    '/api/characters/:name': {
      async GET(req) {
        const name = req.params.name;
        return handleGetCharacter(name);
      },
    },

    // Scenario endpoints
    '/api/scenarios': {
      async GET() {
        return handleGetScenarios();
      },
    },

    '/api/scenarios/generate': {
      async POST(req) {
        return handleGenerateScenario(req);
      },
    },

    '/api/scenarios/:id': {
      async GET(req) {
        const id = req.params.id;
        return handleGetScenario(id);
      },
    },

    // Scene session endpoints
    '/api/scene': {
      POST() {
        return handleCreateScene();
      },
    },

    '/api/scene/:id': {
      GET(req) {
        const id = req.params.id;
        return handleGetScene(id);
      },
      DELETE(req) {
        const id = req.params.id;
        return handleDeleteScene(id);
      },
    },

    // WebSocket upgrade endpoint
    '/api/ws': {
      GET(req, server) {
        const url = new URL(req.url);
        const sessionId = url.searchParams.get('sessionId');

        if (!sessionId) {
          return new Response('Missing sessionId', { status: 400 });
        }

        const session = getSession(sessionId);
        if (!session) {
          return new Response('Session not found', { status: 404 });
        }

        const upgraded = server.upgrade(req, {
          data: { sessionId },
        });

        if (!upgraded) {
          return new Response('WebSocket upgrade failed', { status: 500 });
        }

        return undefined;
      },
    },
  },

  websocket: websocketHandlers,

  development: {
    hmr: true,
    console: true,
  },

  // Fallback for unmatched routes
  fetch(req) {
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`
  The Good Place Simulator - Web Interface
  =========================================

  Server running at: http://localhost:${server.port}

  API Endpoints:
    GET  /api/characters          - List all characters
    GET  /api/characters/:name    - Get character details
    GET  /api/scenarios           - List all scenarios
    GET  /api/scenarios/:id       - Get scenario details
    POST /api/scenarios/generate  - Generate new scenario
    POST /api/scene               - Create scene session
    GET  /api/scene/:id           - Get scene state
    WS   /api/ws?sessionId=...    - WebSocket for scene streaming
`);
