import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PRINT_API_URL    = process.env.PRINT_API_URL!;
const CANVAS_API_SECRET = process.env.CANVAS_API_SECRET;

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetPath = path.join('/');
  const search     = request.nextUrl.search;
  const targetUrl  = `${PRINT_API_URL}/${targetPath}${search}`;

  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') forwardHeaders.set(key, value);
  });
  forwardHeaders.set('host', new URL(PRINT_API_URL).host);
  if (CANVAS_API_SECRET) forwardHeaders.set('x-canvas-api-secret', CANVAS_API_SECRET);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const upstream = await fetch(targetUrl, {
    method:  request.method,
    headers: forwardHeaders,
    body:    hasBody ? request.body : undefined,
    // @ts-ignore
    duplex:  'half',
  });

  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete('content-encoding'); // avoid double-decompression

  return new NextResponse(upstream.body, {
    status:  upstream.status,
    headers: resHeaders,
  });
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
