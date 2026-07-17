// On-product mockup: composites the B&W design onto a simple branded product
// illustration (mug / hat / shirt) so guests see the finished thing, not flat
// art. Pure SVG — no product photography needed to launch.

interface Props {
  designUrl: string;
  mockupType: "mug" | "hat" | "shirt";
}

export default function MockupPreview({ designUrl, mockupType }: Props) {
  if (mockupType === "mug") {
    return (
      <svg viewBox="0 0 400 300" className="w-full h-auto" role="img" aria-label="Mug preview">
        <rect width="400" height="300" fill="#E8DDC2" rx="16" />
        <ellipse cx="200" cy="262" rx="120" ry="14" fill="#00000018" />
        {/* body */}
        <path d="M110 80 h150 a8 8 0 0 1 8 8 v140 a24 24 0 0 1 -24 24 H126 a24 24 0 0 1 -24 -24 V88 a8 8 0 0 1 8 -8 Z" fill="#ffffff" stroke="#14263F" strokeWidth="5" />
        {/* handle */}
        <path d="M268 110 h22 a30 30 0 0 1 30 30 v20 a30 30 0 0 1 -30 30 h-22" fill="none" stroke="#14263F" strokeWidth="10" />
        <image href={designUrl} x="128" y="102" width="118" height="118" preserveAspectRatio="xMidYMid meet" />
      </svg>
    );
  }
  if (mockupType === "hat") {
    return (
      <svg viewBox="0 0 400 300" className="w-full h-auto" role="img" aria-label="Hat preview">
        <rect width="400" height="300" fill="#E8DDC2" rx="16" />
        <ellipse cx="200" cy="252" rx="130" ry="12" fill="#00000018" />
        {/* crown */}
        <path d="M110 190 a90 95 0 0 1 180 0 Z" fill="#ffffff" stroke="#14263F" strokeWidth="5" />
        <path d="M200 96 v94" stroke="#14263F" strokeWidth="3" opacity="0.35" />
        {/* brim */}
        <path d="M96 190 h208 a10 10 0 0 1 10 12 c-4 18 -40 26 -114 26 s-110 -8 -114 -26 a10 10 0 0 1 10 -12 Z" fill="#ffffff" stroke="#14263F" strokeWidth="5" />
        {/* button */}
        <circle cx="200" cy="96" r="7" fill="#14263F" />
        <image href={designUrl} x="158" y="118" width="84" height="64" preserveAspectRatio="xMidYMid meet" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 300" className="w-full h-auto" role="img" aria-label="Shirt preview">
      <rect width="400" height="300" fill="#E8DDC2" rx="16" />
      {/* shirt */}
      <path
        d="M150 48 l-62 30 -24 54 46 22 12 -22 v140 a10 10 0 0 0 10 10 h136 a10 10 0 0 0 10 -10 V132 l12 22 46 -22 -24 -54 -62 -30 a52 26 0 0 1 -100 0 Z"
        fill="#ffffff"
        stroke="#14263F"
        strokeWidth="5"
      />
      <path d="M150 48 a52 26 0 0 0 100 0" fill="none" stroke="#14263F" strokeWidth="5" />
      <image href={designUrl} x="146" y="110" width="108" height="108" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}
