// api/ask-nvidia.js — Vercel Edge Runtime Streaming Version

export const runtime = 'edge';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Expose-Headers': 'Content-Type',
};

// Handle OPTIONS preflight
export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

// Vercel Edge phải bắt đầu trả lời trong ~25s, nên chỉ chờ Nvidia gửi header tối đa 22s
const UPSTREAM_HEADER_TIMEOUT_MS = 22000;

export default async function handler(request) {
  // Preflight CORS (phòng khi runtime gọi handler mặc định cho cả OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let apiKey, systemPrompt;
  try {
    const body = await request.json();
    apiKey = body.apiKey;
    systemPrompt = body.systemPrompt;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!apiKey || !systemPrompt) {
    return new Response(JSON.stringify({ error: 'Missing parameters: apiKey and systemPrompt required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Call Nvidia NIM API with STREAMING enabled
    const upstreamCtrl = new AbortController();
    const upstreamTimer = setTimeout(() => upstreamCtrl.abort(), UPSTREAM_HEADER_TIMEOUT_MS);
    if (request.signal) request.signal.addEventListener('abort', () => upstreamCtrl.abort());

    let nvidiaResponse;
    try {
    nvidiaResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      signal: upstreamCtrl.signal,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream', // Critical for streaming
      },
      body: JSON.stringify({
        model: 'nemotron-3-ultra-550b-a55b',
        messages: [{ role: 'user', content: systemPrompt }],
        max_tokens: 4096,
        temperature: 0.7,
        stream: true, // <-- ENABLE STREAMING
      }),
    });
    } finally {
      clearTimeout(upstreamTimer); // đã có header -> không giới hạn thời gian đọc luồng
    }

    if (!nvidiaResponse.ok) {
      // For non-streaming errors, try to get error details
      let errorText = await nvidiaResponse.text().catch(() => '');
      let errorDetail = `Nvidia API error: ${nvidiaResponse.status}`;
      try {
        const parsed = JSON.parse(errorText);
        errorDetail = parsed.error?.message || parsed.message || errorDetail;
      } catch {
        if (errorText) errorDetail += ` - ${errorText.slice(0, 300)}`;
      }
      return new Response(JSON.stringify({ error: errorDetail }), {
        status: nvidiaResponse.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Stream the response body directly to the client
    // The Edge runtime preserves the ReadableStream from the upstream response
    return new Response(nvidiaResponse.body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no', // Disable nginx buffering if applicable
      },
    });

  } catch (err) {
    if (err?.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Nvidia did not respond in time (overloaded). Please try again.' }), {
        status: 504,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    console.error('[Edge API] Proxy error:', err);
    return new Response(JSON.stringify({ error: 'Proxy server error', detail: err?.message || String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}