import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Print 에이전트 파이프라인 최대 5분 소요

const PRINT_API_URL    = process.env.PRINT_API_URL!;
const CANVAS_API_SECRET = process.env.CANVAS_API_SECRET;

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetPath = path.join('/');
  const search     = request.nextUrl.search;
  const targetUrl  = `${PRINT_API_URL}/${targetPath}${search}`;

  // ── 요청 로깅 ──
  const startTime = Date.now();
  const contentLength = request.headers.get('content-length') ?? 'unknown';
  console.log(`\n[print-proxy] ▶ ${request.method} ${targetPath}`);
  console.log(`[print-proxy]   Target: ${targetUrl}`);
  console.log(`[print-proxy]   Content-Length: ${contentLength}`);

  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') forwardHeaders.set(key, value);
  });
  forwardHeaders.set('host', new URL(PRINT_API_URL).host);
  if (CANVAS_API_SECRET) forwardHeaders.set('x-canvas-api-secret', CANVAS_API_SECRET);

  const hasBody = !['GET', 'HEAD'].includes(request.method);

  try {
    const upstream = await fetch(targetUrl, {
      method:  request.method,
      headers: forwardHeaders,
      body:    hasBody ? request.body : undefined,
      // @ts-ignore
      duplex:  'half',
    });

    const elapsed = Date.now() - startTime;
    const resLength = upstream.headers.get('content-length') ?? 'unknown';
    console.log(`[print-proxy] ◀ ${upstream.status} (${elapsed}ms, ${resLength} bytes)`);

    const resHeaders = new Headers(upstream.headers);
    resHeaders.delete('content-encoding'); // avoid double-decompression

    return new NextResponse(upstream.body, {
      status:  upstream.status,
      headers: resHeaders,
    });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[print-proxy] ✕ FETCH FAILED (${elapsed}ms):`, err);
    return NextResponse.json(
      { error: `Print 서버 연결 실패: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
