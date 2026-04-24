import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { buildSystemPrompt, loadProtocolFile } from '@/lib/prompt';

const MODEL_ANALYSIS          = 'gemini-3.1-pro-preview';
const MODEL_IMAGE_GEN         = 'gemini-3.1-flash-image-preview';
const MODEL_ANALYSIS_FALLBACK  = 'gemini-2.5-pro-preview';
const MODEL_IMAGE_GEN_FALLBACK = 'gemini-2.5-flash-image';
const TIMEOUT_ANALYSIS  = 90000;
const TIMEOUT_IMAGE_GEN = 120000;

const MAX_IMAGE_BYTES   = 10 * 1024 * 1024;
const MAX_PROMPT_LENGTH = 2000;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

async function callWithFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await withRetry(primary);
  } catch (err) {
    console.warn('Primary model failed, trying fallback:', err);
    return await withRetry(fallback);
  }
}

export async function POST(req: NextRequest) {
  let body: {
    sketch_image: string;
    mime_type?: string;
    user_prompt?: string;
    viz_mode?: string;
    style_mode?: string;
    resolution?: string;
    aspect_ratio?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    sketch_image,
    mime_type    = 'image/png',
    user_prompt  = '',
    viz_mode     = 'CONCEPT',
    style_mode   = 'NONE',
    resolution   = 'NORMAL QUALITY',
    aspect_ratio = '4:3',
  } = body;

  if (!sketch_image) {
    return NextResponse.json({ error: 'sketch_image is required' }, { status: 400 });
  }

  const mimeTypeLower = mime_type.toLowerCase();
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeTypeLower)) {
    return NextResponse.json({ error: 'Invalid image type. Allowed: JPEG, PNG, WebP' }, { status: 400 });
  }

  const imageBytes = Buffer.from(sketch_image, 'base64');
  if (imageBytes.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image size exceeds 10MB limit' }, { status: 400 });
  }

  if (user_prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt exceeds ${MAX_PROMPT_LENGTH} character limit` },
      { status: 400 }
    );
  }

  let systemPrompt: string;
  try {
    const protocolContent = loadProtocolFile('protocol-sketch-to-image-v2.3.txt');
    systemPrompt = buildSystemPrompt(protocolContent);
  } catch (err) {
    console.error('Protocol load failed:', err);
    return NextResponse.json({ error: 'Protocol initialization failed' }, { status: 500 });
  }

  if (!systemPrompt) {
    return NextResponse.json({ error: 'System prompt construction failed' }, { status: 500 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const imagePart: Part = {
    inlineData: {
      mimeType: mimeTypeLower as AllowedMimeType,
      data: sketch_image,
    },
  };

  // Phase 1: Analysis — ROOM 1~3
  let analysisText: string;
  let analysisSpec: Record<string, unknown> = {};

  try {
    const analysisPrompt = [
      '스케치 이미지를 분석하세요.',
      'ROOM 1 (정의의 방) → ROOM 2 (전략의 방) → ROOM 3 (논리의 방) 순서로 실행하고,',
      'ROOM 3 완료 후 반드시 SPEC_OUTPUT: analysis-spec JSON 블록을 출력하세요.',
      '',
      `사용자 요청: ${user_prompt || '(없음)'}`,
      `시각화 모드: ${viz_mode}`,
      `스타일 모드: ${style_mode}`,
    ].join('\n');

    const makeAnalysisCall = (modelName: string) => () => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });
      return withTimeout(
        model.generateContent([imagePart, { text: analysisPrompt }]),
        TIMEOUT_ANALYSIS
      ).then(r => r.response.text());
    };

    analysisText = await callWithFallback(
      makeAnalysisCall(MODEL_ANALYSIS),
      makeAnalysisCall(MODEL_ANALYSIS_FALLBACK)
    );

    const jsonFenced = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonInline = analysisText.match(/\{[\s\S]*?"process"\s*:\s*"analysis"[\s\S]*?\}/);
    const rawJson = jsonFenced?.[1] ?? jsonInline?.[0];
    if (rawJson) {
      const jsonStart = rawJson.indexOf('{');
      const jsonEnd   = rawJson.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        analysisSpec = JSON.parse(rawJson.slice(jsonStart, jsonEnd + 1));
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Analysis failed:', msg);
    return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 503 });
  }

  // Phase 2: Image Generation — ROOM 4~5
  let generatedImageBase64: string;

  try {
    const generationPrompt = [
      'ROOM 4 (시공의 방) 와 ROOM 5 (검증의 방) 를 실행하여 극사실주의 건축 이미지를 생성하세요.',
      '',
      'analysis-spec (ROOM 3 결과):',
      JSON.stringify(analysisSpec, null, 2),
      '',
      '생성 파라미터:',
      `- 해상도: ${resolution}`,
      `- 비율: ${aspect_ratio}`,
      `- 스타일: ${style_mode}`,
      `- 시각화 모드: ${viz_mode}`,
      '',
      '이미지를 생성하고 ROOM 5의 Failure Mode 체크를 완료한 후 generation-spec을 출력하세요.',
    ].join('\n');

    const makeGenerationCall = (modelName: string) => () => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
      });
      return withTimeout(
        model.generateContent([imagePart, { text: generationPrompt }]),
        TIMEOUT_IMAGE_GEN
      ).then(r => {
        const parts = r.response.candidates?.[0]?.content?.parts ?? [];
        const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
        if (!imgPart?.inlineData?.data) throw new Error('No image in generation response');
        return imgPart.inlineData.data;
      });
    };

    generatedImageBase64 = await callWithFallback(
      makeGenerationCall(MODEL_IMAGE_GEN),
      makeGenerationCall(MODEL_IMAGE_GEN_FALLBACK)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Image generation failed:', msg);
    return NextResponse.json({ error: `Image generation failed: ${msg}` }, { status: 503 });
  }

  return NextResponse.json({
    generated_image: generatedImageBase64,
    analysis_report: analysisSpec,
  });
}
