// The Invmatics mark: an isometric cube with a check on its side face ("stock confirmed").
// Drawn in white for use on the brand-green tile; the check takes the tile colour.
export default function LogoGlyph({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <polygon points="32,8 53,20 32,32 11,20" fill="#fff" stroke="none" />
      <polygon points="11,23.5 30,34.5 30,57 11,46" fill="#fff" opacity=".88" stroke="none" />
      <polygon points="53,23.5 34,34.5 34,57 53,46" fill="#fff" opacity=".5" stroke="none" />
      <path d="M15 39.5 L20.5 45.5 L27 36.5" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        style={{ stroke: 'var(--green, #059669)' }} />
    </svg>
  );
}
