const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

function corsResponse(body, init = {}) {
  const headers = { ...CORS_HEADERS, ...(init.headers || {}) };
  return new Response(body, { ...init, headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, { status: 204 });
    }

    // Health check
    if (url.pathname === '/health') {
      return corsResponse(JSON.stringify({ status: 'ok' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Proxy to Claude API — streaming
    if (url.pathname === '/api/messages' && request.method === 'POST') {
      const apiKey = request.headers.get('x-api-key');
      if (!apiKey) {
        return corsResponse(JSON.stringify({ error: 'API key required' }), {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      try {
        const body = await request.json();
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({ ...body, stream: true }),
        });

        if (!claudeResponse.ok) {
          const errorBody = await claudeResponse.text();
          return corsResponse(JSON.stringify({ error: 'Claude API error', details: errorBody, status: claudeResponse.status }), {
            status: claudeResponse.status,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        // Stream the response through
        return new Response(claudeResponse.body, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (error) {
        return corsResponse(JSON.stringify({ error: 'Proxy error', message: error.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate API key
    if (url.pathname === '/api/validate-key' && request.method === 'POST') {
      const apiKey = request.headers.get('x-api-key');
      if (!apiKey) {
        return corsResponse(JSON.stringify({ error: 'API key required' }), {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        });

        if (response.ok) {
          return corsResponse(JSON.stringify({ valid: true }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        } else {
          const errorBody = await response.text();
          return corsResponse(JSON.stringify({ valid: false, error: errorBody }), {
            status: response.status,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        return corsResponse(JSON.stringify({ valid: false, error: error.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    return corsResponse('Not Found', { status: 404 });
  },
};
