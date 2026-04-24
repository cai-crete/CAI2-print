import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { buildSystemPrompt, loadProtocolFile } from '@/lib/prompt';

const MODEL_ANALYSIS          = 'gemini-3.1-pro-preview';
const MODEL_IMAGE_GEN         = 'gemini-3.1-flash-image-preview';
const MODEL_ANALYSIS_FALLBACK  = 'gemini-2.5-pro-preview';
const MODEL_IMAGE_GEN_FALLBACK = 'gemini-2.5-flash-image';
const TIMEOUT_ANALYSIS  = 120000;
const TIMEOUT_IMAGE_GEN = 180000;

const MAX_IMAGE_BYTES    = 10 * 1024 * 1024;
const MAX_PROMPT_LENGTH  = 2000;
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
    floor_type?: string;
    grid_module?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    sketch_image,
    mime_type   = 'image/png',
    user_prompt = '',
    floor_type  = 'RESIDENTIAL',
    grid_module = 4000,
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
    const protocol           = loadProtocolFile('protocol-sketch-to-plan-v3.8.txt');
    const knowledgeWpGrid    = loadProtocolFile('knowledge-wp-grid-mapping.txt');
    const knowledgeArchStd   = loadProtocolFile('knowledge-architectural-standards.txt');
    const knowledgeTemplateA = loadProtocolFile('knowledge-template-a.txt');
    systemPrompt = buildSystemPrompt(protocol, [knowledgeWpGrid, knowledgeArchStd, knowledgeTemplateA]);
  } catch (err) {
    console.error('Protocol load failed:', err);
    return NextResponse.json({ error: 'Protocol initialization failed' }, { status: 500 });
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

  // Phase 1: Spatial Analysis
  let analysisText: string;
  let analysisSpec: Record<string, unknown> = {};

  try {
    const analysisPrompt = [
      '스케치 이미지를 분석하여 위상적 평면 데이터로 변환하세요.',
      '',
      `건물 용도: ${floor_type}`,
      `구조 그리드 모듈: ${grid_module}mm`,
      `사용자 요청: ${user_prompt || '(없음)'}`,
      '',
      '4단계 보정 위계 프로토콜(Hierarchy 0→3)을 순서대로 실행하고,',
      '최종 SPATIAL_SPEC JSON 블록을 출력하세요.',
      '(WP 원점, 각 실의 명칭·치수·그리드 스냅 좌표, 개구부 위치, 동선 벡터 포함)',
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
    const jsonInline = analysisText.match(/\{[\s\S]*?"process"\s*:\s*"spatial"[\s\S]*?\}/);
    const rawJson = jsonFenced?.[1] ?? jsonInline?.[0];
    if (rawJson) {
      const jsonStart = rawJson.indexOf('{');
      const jsonEnd   = rawJson.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        try {
          analysisSpec = JSON.parse(rawJson.slice(jsonStart, jsonEnd + 1));
        } catch { /* non-critical — continue with empty spec */ }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Analysis failed:', msg);
    return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 503 });
  }

  // Phase 2: CAD Floor Plan Image Generation
  let generatedImageBase64: string;
  let roomAnalysisText = '';

  try {
    const generationPrompt = [
      'TEMPLATE-A 스타일의 미니멀리스트 CAD 평면도를 생성하세요.',
      '',
      'spatial-spec (위상 분석 결과):',
      JSON.stringify(analysisSpec, null, 2),
      '',
      '렌더링 규칙:',
      '- Monochrome(흑백), Solid Poche, Pure White 배경',
      '- 내력벽: 두껍고 검은 솔리드 해치 / 비내력벽: 얇게',
      '- 개구부 천공(문·창), 문 열림 궤적(Arc)',
      '- 실명 텍스트 + 하단 그래픽 스케일 바 표기',
      `- 그리드 모듈: ${grid_module}mm 기준`,
      '',
      '생성 완료 후 각 실의 면적과 비율 등 공간 분석 요약(ROOM ANALYSIS)을 텍스트로 출력하세요.',
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
        const imgPart  = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
        const textPart = parts.find(p => typeof p.text === 'string' && p.text.trim().length > 0);
        if (!imgPart?.inlineData?.data) throw new Error('No image in generation response');
        return {
          image: imgPart.inlineData.data,
          text:  textPart?.text ?? '',
        };
      });
    };

    const result = await callWithFallback(
      makeGenerationCall(MODEL_IMAGE_GEN),
      makeGenerationCall(MODEL_IMAGE_GEN_FALLBACK)
    );

    generatedImageBase64 = result.image;
    roomAnalysisText     = result.text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Image generation failed:', msg);
    return NextResponse.json({ error: `Image generation failed: ${msg}` }, { status: 503 });
  }

  return NextResponse.json({
    generated_plan_image: generatedImageBase64,
    room_analysis:        roomAnalysisText,
    analysis_spec:        analysisSpec,
  });
}
