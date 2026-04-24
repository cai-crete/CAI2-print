'use client';

import { useState, useCallback } from 'react';

export interface GenerationParams {
  userPrompt?: string;
  vizMode?: string;
  styleMode?: string;
  resolution?: string;
  aspectRatio?: string;
}

export interface GenerationResult {
  generatedImage: string | null;
  analysisReport: Record<string, unknown> | null;
}

export interface UseBlueprintGenerationReturn extends GenerationResult {
  isLoading: boolean;
  error: string | null;
  generate: (
    sketchBase64: string,
    params?: GenerationParams,
    signal?: AbortSignal
  ) => Promise<string | null>;
  reset: () => void;
}

export function useBlueprintGeneration(): UseBlueprintGenerationReturn {
  const [isLoading,      setIsLoading]      = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<Record<string, unknown> | null>(null);

  const generate = useCallback(
    async (
      sketchBase64: string,
      params: GenerationParams = {},
      signal?: AbortSignal
    ): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const body = {
          sketch_image: sketchBase64,
          mime_type:    'image/png',
          user_prompt:  params.userPrompt  ?? '',
          viz_mode:     params.vizMode     ?? 'CONCEPT',
          style_mode:   params.styleMode   ?? 'NONE',
          resolution:   params.resolution  ?? 'NORMAL QUALITY',
          aspect_ratio: params.aspectRatio ?? '4:3',
        };

        const res = await fetch('/api/sketch-to-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? `API 오류: ${res.status}`);
        }

        const data = await res.json() as { generated_image: string; analysis_report: Record<string, unknown> };
        setGeneratedImage(data.generated_image);
        setAnalysisReport(data.analysis_report);
        return data.generated_image;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return null;
        }
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setGeneratedImage(null);
    setAnalysisReport(null);
    setError(null);
  }, []);

  return { isLoading, error, generatedImage, analysisReport, generate, reset };
}
