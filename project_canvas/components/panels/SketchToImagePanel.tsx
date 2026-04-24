'use client';

import { useState, Dispatch, SetStateAction } from 'react';

const STYLE_DESCRIPTIONS: Record<string, {
  title: { ko: string; en: string };
  keywords: { ko: string; en: string }[];
}> = {
  'A': { title: { ko: '장중한 메스의 규칙',   en: 'Vitruvian Tectonics'    }, keywords: [{ en: 'Fragment', ko: '분절' }, { en: 'Stagger', ko: '엇갈림' }, { en: 'Deep Set Recess', ko: '창호의 깊이감' }, { en: 'Contextual Material Derivation', ko: '맥락적 재료 파생' }, { en: 'Diffuse Timelessness', ko: '확산된 시간성' }] },
  'B': { title: { ko: '순수한 기하학적형태',   en: 'Geometric Purity'       }, keywords: [{ en: 'Orthogonal Grid', ko: '직교 그리드' }, { en: 'Layered Transparency', ko: '레이어 투명성' }, { en: 'Elevated Massing', ko: '띄워진 매스' }, { en: 'Absolute Whiteness', ko: '절대 백색' }, { en: 'Hard Sunlight Chiaroscuro', ko: '강렬한 명암법' }] },
  'C': { title: { ko: '가구식 구조',           en: 'Particlization'         }, keywords: [{ en: 'Divide', ko: '분할' }, { en: 'Kigumi Joinery', ko: '결구 접합' }, { en: 'Deep Eaves', ko: '깊은 처마' }, { en: 'Blurred Edge', ko: '흐릿한 경계' }, { en: 'Komorebi Lighting', ko: '목과 빛' }] },
  'D': { title: { ko: '고지식한 조형성',       en: 'Incised Geometry'       }, keywords: [{ en: 'Platonic Extrusion', ko: '플라톤적 돌출' }, { en: 'Strategic Incision', ko: '전략적 절개' }, { en: 'Horizontal Striping', ko: '수평 줄무늬' }, { en: 'Brick Pattern Variation', ko: '벽돌 패턴 변주' }, { en: 'Grounded Solidity', ko: '접지된 견고함' }] },
  'E': { title: { ko: '조형적인 유선형',       en: 'Sculptural Fluidity'    }, keywords: [{ en: 'Collide & Explode', ko: '충돌과 폭발' }, { en: 'Curve & Crumple', ko: '곡면과 구김' }, { en: 'Metallic Skin', ko: '금속 피부' }, { en: 'Asymmetric Fragmentation', ko: '비대칭 파편화' }, { en: 'Oblique Sunlight Drama', ko: '비스듬한 햇빛 드라마' }] },
  'F': { title: { ko: '다이어그램의 구조화',   en: 'Diagrammatic Formalism' }, keywords: [{ en: 'Dual Grid Superimposition', ko: '이중 그리드 중첩' }, { en: 'Transformation Sequence', ko: '변형 연산 시퀀스' }, { en: 'Indexical Trace', ko: '지표적 흔적' }, { en: 'Anti-Compositional Logic', ko: '반구성 논리' }, { en: 'White Neutrality', ko: '백색 중립성' }] },
  'G': { title: { ko: '노출된 하이테크',       en: 'Tectonic Transparency'  }, keywords: [{ en: 'Kit of Parts', ko: '부품 조립' }, { en: 'Multi-Layered Facade', ko: '다층 입면' }, { en: 'Floating Roof', ko: '떠 있는 지붕' }, { en: 'Exposed Services', ko: '노출 설비' }, { en: 'Adaptive Permeability', ko: '적응적 투과성' }] },
};

export interface SketchToImagePanelProps {
  isGenerating: boolean;
  error: string | null;
  sketchPrompt: string;
  setSketchPrompt: (v: string) => void;
  sketchMode: string;
  setSketchMode: Dispatch<SetStateAction<string>>;
  sketchStyle: string | null;
  setSketchStyle: Dispatch<SetStateAction<string | null>>;
  aspectRatio: string | null;
  setAspectRatio: Dispatch<SetStateAction<string | null>>;
  resolution: string;
  setResolution: Dispatch<SetStateAction<string>>;
  onGenerate: () => void;
}

const IC = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const IconLoader = () => (
  <svg viewBox="0 0 20 20" width={18} height={18} {...IC} style={{ animation: 'spin 1s linear infinite' }}>
    <circle cx="10" cy="10" r="7" strokeOpacity={0.3} />
    <path d="M10 3A7 7 0 0 1 17 10" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 20 20" width={14} height={14} {...IC}><path d="M5 5L15 15M15 5L5 15" /></svg>
);

export default function SketchToImagePanel({
  isGenerating, error,
  sketchPrompt, setSketchPrompt,
  sketchMode, setSketchMode,
  sketchStyle, setSketchStyle,
  aspectRatio, setAspectRatio,
  resolution, setResolution,
  onGenerate,
}: SketchToImagePanelProps) {
  const [activeDetailStyle, setActiveDetailStyle] = useState<string | null>(null);

  const sectionLabel: React.CSSProperties = {
    fontFamily: 'var(--font-family-bebas)',
    fontSize: '0.75rem',
    color: 'var(--color-gray-400)',
    letterSpacing: '0.1em',
    display: 'block',
    marginBottom: '0.5rem',
  };

  const toggleBase: React.CSSProperties = {
    flex: 1, height: '2.75rem',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '0.75rem',
    fontFamily: 'var(--font-family-bebas)',
    fontSize: '0.875rem',
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'background-color 100ms ease, color 100ms ease',
  };

  const activeStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.05)',
    color: 'var(--color-black)',
  };
  const inactiveStyle: React.CSSProperties = {
    background: 'transparent',
    color: 'var(--color-gray-500)',
  };

  return (
    <div style={{
      height: '100%', width: '100%',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
        minHeight: 0,
      }}>

        {/* PROMPT */}
        <div>
          <span style={sectionLabel}>Prompt</span>
          <textarea
            value={sketchPrompt}
            onChange={e => setSketchPrompt(e.target.value)}
            placeholder="재료, 조명, 분위기를 설명하세요..."
            maxLength={2000}
            style={{
              width: '100%', height: '9rem',
              resize: 'none',
              borderRadius: '0.75rem',
              border: '1px solid var(--color-gray-200)',
              background: 'rgba(255,255,255,0.6)',
              padding: '0.75rem',
              fontFamily: 'var(--font-family-pretendard)',
              fontSize: '0.75rem',
              color: 'var(--color-black)',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
          />
          <div style={{ textAlign: 'right', fontSize: '0.625rem', color: 'var(--color-gray-300)', marginTop: 2 }}>
            {sketchPrompt.length} / 2000
          </div>
        </div>

        {/* MODE */}
        <div>
          <span style={sectionLabel}>Mode</span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {['CONCEPT', 'DETAIL'].map(mode => (
              <button
                key={mode}
                onClick={() => setSketchMode(prev => prev === mode ? '' : mode)}
                style={{ ...toggleBase, ...(sketchMode === mode ? activeStyle : inactiveStyle) }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* STYLE */}
        <div>
          <span style={sectionLabel}>CRE-TE Style</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem' }}>
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'NONE'].map(style => (
              <button
                key={style}
                onClick={() => {
                  const next = sketchStyle === style ? 'NONE' : style;
                  setSketchStyle(next);
                  setActiveDetailStyle(next !== 'NONE' ? next : null);
                }}
                style={{
                  height: '2.75rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--color-gray-200)',
                  fontFamily: 'var(--font-family-bebas)',
                  fontSize: '0.875rem',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'background-color 100ms ease',
                  ...(sketchStyle === style ? activeStyle : inactiveStyle),
                }}
              >
                {style}
              </button>
            ))}
          </div>

          {activeDetailStyle && STYLE_DESCRIPTIONS[activeDetailStyle] && (
            <div style={{
              marginTop: '0.75rem',
              background: 'rgba(0,0,0,0.03)',
              borderRadius: '1.25rem',
              padding: '1rem',
              border: '1px solid rgba(0,0,0,0.05)',
              position: 'relative',
              maxHeight: '12.5rem',
              overflowY: 'auto',
            }}>
              <div style={{ paddingRight: '1.5rem', marginBottom: '0.75rem' }}>
                <div style={{ fontFamily: 'var(--font-family-pretendard)', fontWeight: 700, fontSize: '0.8125rem', lineHeight: 1.3 }}>
                  {STYLE_DESCRIPTIONS[activeDetailStyle].title.ko}<br />
                  <span style={{ opacity: 0.5 }}>_{STYLE_DESCRIPTIONS[activeDetailStyle].title.en}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveDetailStyle(null)}
                style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', color: 'var(--color-gray-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: '50%',
                  transition: 'background-color 100ms ease',
                }}
              >
                <IconX />
              </button>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {STYLE_DESCRIPTIONS[activeDetailStyle].keywords.map((kw, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.4, marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 500, fontFamily: 'var(--font-family-pretendard)' }}>{kw.en}</div>
                      <div style={{ fontSize: '0.6875rem', opacity: 0.5, fontFamily: 'var(--font-family-pretendard)' }}>({kw.ko})</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ASPECT RATIO */}
        <div>
          <span style={sectionLabel}>Aspect Ratio</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['1:1', '4:3', '16:9'].map(ratio => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(prev => prev === ratio ? null : ratio)}
                style={{
                  ...toggleBase,
                  height: '2.25rem',
                  fontSize: '0.75rem',
                  ...(aspectRatio === ratio ? activeStyle : inactiveStyle),
                }}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* RESOLUTION */}
        <div>
          <span style={sectionLabel}>Resolution</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['FAST', 'NORMAL', 'HIGH'].map(res => (
              <button
                key={res}
                onClick={() => setResolution(prev => prev.startsWith(res) ? '' : `${res} QUALITY`)}
                style={{
                  ...toggleBase,
                  height: '2.25rem',
                  fontSize: '0.75rem',
                  ...(resolution.startsWith(res) ? activeStyle : inactiveStyle),
                }}
              >
                {res}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          margin: '0 1rem',
          padding: '0.625rem 0.75rem',
          borderRadius: '0.75rem',
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.2)',
          fontSize: '0.6875rem',
          color: '#dc2626',
          fontFamily: 'var(--font-family-pretendard)',
          lineHeight: 1.4,
        }}>
          {error}
        </div>
      )}

      {/* GENERATE button */}
      <div style={{ padding: '0.75rem 1rem 1rem' }}>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          style={{
            width: '100%', height: '2.75rem',
            borderRadius: '9999px',
            border: '1px solid var(--color-gray-200)',
            background: isGenerating ? 'var(--color-gray-200)' : 'var(--color-black)',
            color: isGenerating ? 'var(--color-gray-400)' : 'var(--color-white)',
            fontFamily: 'var(--font-family-bebas)',
            fontSize: '1rem',
            letterSpacing: '0.1em',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'opacity 150ms ease, background-color 150ms ease',
          }}
        >
          {isGenerating ? (
            <>
              <IconLoader />
              <span>GENERATING...</span>
            </>
          ) : (
            'GENERATE'
          )}
        </button>
      </div>

      {/* Footer */}
      <div style={{ paddingBottom: '0.75rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.5625rem', color: 'var(--color-gray-300)', fontFamily: 'var(--font-family-pretendard)', letterSpacing: '0.04em' }}>
          © CRETE CO.,LTD. 2026
        </span>
      </div>

      {/* spin keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
