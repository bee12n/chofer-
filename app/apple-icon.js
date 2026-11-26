import { ImageResponse } from 'next/og';

// Ícono para la pantalla de inicio del iPhone.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4D8BFF, #2EE6A6)' }}>
        <svg width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="#03111E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="19" r="2.2" />
          <circle cx="18" cy="5" r="2.2" />
          <path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8" />
        </svg>
      </div>
    ),
    size,
  );
}
