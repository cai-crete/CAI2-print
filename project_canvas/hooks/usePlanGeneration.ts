'use client';

import { useState, useCallback } from 'react';

export interface PlanGenerationParams {
  userPrompt?: string;
  floorType?: string;
  gridModule?: number;
}

export interface PlanGenerationResult {
  generatedPlanImage: string | null;
  roomAnalysis: string | null;
}

export interface UsePlanGenerationReturn extends PlanGenerationResult {
  isLoading: boolean;
  error: string | null;
  generate: (
    sketchBase64: string,
    params?: PlanGenerationParams,
    signal?: AbortSignal
  ) => Promise<{ image: string | null; roomAnalysis: string }>;
  reset: () => void;
}

export function usePlanGeneration(): UsePlanGenerationReturn {
  const [isLoading,          setIsLoading]          = useState(false);
  const [error,              setError]              = useState<string | null>(null);
  const [generatedPlanImage, setGeneratedPlanImage] = useState<string | null>(null);
  const [roomAnalysis,       setRoomAnalysis]       = useState<string | null>(null);

  const generate = useCallback(
    async (
      sketchBase64: string,
      params: PlanGenerationParams = {},
      signal?: AbortSignal
    ): Promise<{ image: string | null; roomAnalysis: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const body = {
          sketch_image: sketchBase64,
          mime_type:    'image/png',
          user_prompt:  params.userPrompt ?? '',
          floor_type:   params.floorType  ?? 'RESIDENTIAL',
          grid_module:  params.gridModule ?? 4000,
        };

        const res = await fetch('/api/sketch-to-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? `API 오류: ${res.status}`);
        }

        const data = await res.json() as {
          generated_plan_image: string;
          room_analysis: string;
          analysis_spec: Record<string, unknown>;
        };
        setGeneratedPlanImage(data.generated_plan_image);
        setRoomAnalysis(data.room_analysis ?? '');
        return { image: data.generated_plan_image, roomAnalysis: data.room_analysis ?? '' };
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return { image: null, roomAnalysis: '' };
        }
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        return { image: null, roomAnalysis: '' };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setGeneratedPlanImage(null);
    setRoomAnalysis(null);
    setError(null);
  }, []);

  return { isLoading, error, generatedPlanImage, roomAnalysis, generate, reset };
}
