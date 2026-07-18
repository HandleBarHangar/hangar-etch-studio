// Laserability heuristics: advisory checks that a finalized B&W design will
// actually engrave well. Non-blocking — staff can always help — but they steer
// guests away from designs that burn badly (huge solid fills) or blur out
// (photo-grade fine detail).

export interface LaserabilityReport {
  blackRatio: number;
  detailScore: number;
  warnings: string[];
}

export function analyzeLaserability(canvas: HTMLCanvasElement): LaserabilityReport {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const px = ctx.getImageData(0, 0, width, height).data;

  let black = 0;
  let transitions = 0;
  // Sample every other row for speed on large canvases.
  for (let y = 0; y < height; y += 2) {
    let prevBlack = false;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const isBlack = px[i] < 128;
      if (isBlack) black++;
      if (x > 0 && isBlack !== prevBlack) transitions++;
      prevBlack = isBlack;
    }
  }
  const sampled = (Math.ceil(height / 2)) * width;
  const blackRatio = black / sampled;
  // Transitions per sampled pixel: high = lots of tiny alternating detail.
  const detailScore = transitions / sampled;

  const warnings: string[] = [];
  if (blackRatio > 0.55) {
    warnings.push(
      "Lots of solid black — big filled areas engrave slowly and can scorch. Bold outlines beat heavy fills.",
    );
  } else if (blackRatio < 0.015) {
    warnings.push("The design is almost empty — try nudging the contrast slider.");
  }
  if (detailScore > 0.09) {
    warnings.push(
      "Very fine detail — tiny lines and textures tend to blur when lasered. Simple and bold engraves best.",
    );
  }
  return { blackRatio, detailScore, warnings };
}
