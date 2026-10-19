// Ilustraciones vectoriales del libro (globos, corazón, girasol, cinta adhesiva).

export const BALLOON_COLORS = ['#e4572e', '#f2b134', '#3bb0c1', '#8d5fa8', '#6aa84f', '#e9739b'];

export function Balloon({ color = '#e4572e', className = '', style }: { color?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={`bk-balloon ${className}`} style={style} viewBox="0 0 40 90" aria-hidden="true" focusable="false">
      <path d="M20 2C9 2 3 11 3 22c0 12 9 24 17 28 8-4 17-16 17-28C37 11 31 2 20 2z" fill={color} />
      <path d="M12 9c-4 3-6 8-6 14" stroke="rgba(255,255,255,.55)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M17 50l3 5 3-5z" fill={color} />
      <path d="M20 55c-4 8 4 14 0 22s-2 10-2 12" stroke="#6b4a2f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function BalloonBunch({ className = '' }: { className?: string }) {
  return (
    <div className={`bk-balloon-bunch ${className}`} aria-hidden="true">
      <Balloon color={BALLOON_COLORS[0]} className="b1" />
      <Balloon color={BALLOON_COLORS[1]} className="b2" />
      <Balloon color={BALLOON_COLORS[2]} className="b3" />
      <Balloon color={BALLOON_COLORS[3]} className="b4" />
    </div>
  );
}

export function HeartMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`bk-heart ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Sunflower({ className = '' }: { className?: string }) {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg className={`bk-sunflower ${className}`} viewBox="0 0 60 60" aria-hidden="true" focusable="false">
      <g transform="translate(30 30)">
        {petals.map((deg) => (
          <ellipse key={deg} rx="4.6" ry="12" cy="-17" fill="#f2b134" stroke="#c98914" strokeWidth=".7" transform={`rotate(${deg})`} />
        ))}
        <circle r="10.5" fill="#6b3b1d" />
        <circle r="10.5" fill="none" stroke="#4a2810" strokeWidth="1" strokeDasharray="1.2 2" />
      </g>
    </svg>
  );
}

export function Tape({ className = '' }: { className?: string }) {
  return <span className={`bk-tape ${className}`} aria-hidden="true" />;
}
