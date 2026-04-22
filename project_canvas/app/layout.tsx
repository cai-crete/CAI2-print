import type { Metadata } from 'next';
import { Bebas_Neue } from 'next/font/google';
import './globals.css';

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CAI CANVAS',
  description: 'CAI Project-10 — 7-노드 AI 건축 설계 파이프라인 통합 캔버스. CRE-TE CO.,LTD.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={bebas.variable}>
      <body>{children}</body>
    </html>
  );
}
