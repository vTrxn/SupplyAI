// frontend/src/components/BubAvatar.tsx
export default function BubAvatar({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size, flexShrink: 0 }}>
      <circle cx="50" cy="50" r="45" fill="var(--brand-primary)" stroke="var(--brand-primary-border, #ddd9fc)" strokeWidth="3" />
      <ellipse cx="30" cy="30" rx="16" ry="9" fill="rgba(255,255,255,0.4)" transform="rotate(-25, 30, 30)" />
      <circle cx="36" cy="46" r="5" fill="white" />
      <circle cx="64" cy="46" r="5" fill="white" />
      <path d="M 42 60 Q 50 68 58 60" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

