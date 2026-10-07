/**
 * Generates the demo artwork used by the seed: garment illustrations for
 * portfolios, transparent try-on overlays, fabric swatches and shop covers.
 * Everything is SVG, so the demo works offline with no stock-photo licences.
 *
 * Try-on overlay convention (shared with components/tryon):
 *   viewBox 0 0 300 500, shoulder line at y = 60 from x = 60 to x = 240.
 */

export type GarmentKind = "kurta" | "kameez_men" | "sherwani" | "waistcoat" | "kameez_women" | "frock" | "lehenga" | "abaya" | "kids";

type Palette = { base: string; shade: string; trim: string };

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

export const palette = (base: string, trim = "#c9a463"): Palette => ({ base, shade: shade(base, -0.12), trim });

/** Front silhouette + details, drawn in the 300×500 try-on coordinate space. */
function garment(kind: GarmentKind, p: Palette) {
  const stroke = `stroke="${p.shade}" stroke-width="2" stroke-linejoin="round"`;
  const dots = (x1: number, y1: number, x2: number, y2: number) =>
    `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${p.trim}" stroke-width="2.2" stroke-dasharray="0.1 6" stroke-linecap="round"/>`;
  const buttons = (x: number, from: number, n: number, gap: number) =>
    Array.from({ length: n }, (_, i) => `<circle cx="${x}" cy="${from + i * gap}" r="2.6" fill="${p.trim}"/>`).join("");

  switch (kind) {
    case "kurta":
    case "kameez_men":
    case "kids": {
      const hem = kind === "kids" ? 330 : kind === "kurta" ? 420 : 440;
      const body = `M122 46 Q150 58 178 46 L240 60 L284 214 L256 224 L232 122 L238 ${hem} Q150 ${hem + 8} 62 ${hem} L68 122 L44 224 L16 214 L60 60 Z`;
      const slit = `<path d="M66 ${hem - 70} L62 ${hem}" ${stroke} fill="none"/><path d="M234 ${hem - 70} L238 ${hem}" ${stroke} fill="none"/>`;
      const collar = `<path d="M122 46 L124 34 Q150 40 176 34 L178 46" fill="${p.base}" ${stroke}/>`;
      return `<path d="${body}" fill="${p.base}" ${stroke}/>${slit}${collar}<path d="M150 50 L150 150" stroke="${p.shade}" stroke-width="1.6"/>${buttons(150, 66, 4, 22)}${dots(132, 52, 132, 150)}${dots(168, 52, 168, 150)}<path d="M44 224 L16 214" stroke="${p.trim}" stroke-width="3"/><path d="M256 224 L284 214" stroke="${p.trim}" stroke-width="3"/>`;
    }
    case "sherwani": {
      const body = `M124 44 Q150 54 176 44 L240 60 L282 230 L254 238 L232 126 L246 470 Q150 482 54 470 L68 126 L46 238 L18 230 L60 60 Z`;
      return `<path d="${body}" fill="${p.base}" ${stroke}/><path d="M124 44 L124 26 Q150 32 176 26 L176 44" fill="${p.base}" stroke="${p.trim}" stroke-width="2"/><path d="M150 50 L150 476" stroke="${p.shade}" stroke-width="2"/>${buttons(150, 62, 9, 24)}<path d="M54 470 Q150 482 246 470" fill="none" stroke="${p.trim}" stroke-width="5"/>${dots(110, 120, 100, 460)}${dots(190, 120, 200, 460)}<path d="M120 26 Q150 34 180 26" stroke="${p.trim}" stroke-width="3" fill="none"/>`;
    }
    case "waistcoat": {
      const vest = `M120 46 L150 150 L180 46 L240 60 L236 128 Q232 150 238 172 L244 360 L160 372 L150 352 L140 372 L56 360 L62 172 Q68 150 64 128 L60 60 Z`;
      return `<path d="${vest}" fill="${p.base}" ${stroke}/><path d="M150 150 L150 352" stroke="${p.shade}" stroke-width="2"/>${buttons(150, 168, 6, 30)}<path d="M84 250 L120 250" stroke="${p.shade}" stroke-width="2"/><path d="M180 250 L216 250" stroke="${p.shade}" stroke-width="2"/><path d="M120 46 L150 150 L180 46" fill="none" stroke="${p.trim}" stroke-width="2.5"/>`;
    }
    case "kameez_women": {
      const body = `M118 48 Q150 92 182 48 L240 60 L272 176 L246 186 L230 120 Q228 170 236 230 L252 430 Q150 446 48 430 L64 230 Q72 170 70 120 L54 186 L28 176 L60 60 Z`;
      return `<path d="${body}" fill="${p.base}" ${stroke}/><path d="M118 48 Q150 92 182 48" fill="none" stroke="${p.trim}" stroke-width="4"/>${dots(110, 70, 150, 120)}${dots(190, 70, 150, 120)}<path d="M48 430 Q150 446 252 430" fill="none" stroke="${p.trim}" stroke-width="4"/>${dots(56, 410, 244, 410)}<path d="M246 186 L272 176" stroke="${p.trim}" stroke-width="3"/><path d="M28 176 L54 186" stroke="${p.trim}" stroke-width="3"/>`;
    }
    case "frock": {
      const body = `M118 48 Q150 86 182 48 L240 60 L270 190 L246 198 L228 124 L226 196 Q300 360 296 470 Q150 492 4 470 Q0 360 74 196 L72 124 L54 198 L30 190 L60 60 Z`;
      const pleats = [60, 100, 150, 200, 240].map((x) => `<path d="M${150 + (x - 150) * 0.3} 200 Q${x} 340 ${x + (x - 150) * 0.25} 474" fill="none" stroke="${p.shade}" stroke-width="1.4" opacity="0.7"/>`).join("");
      return `<path d="${body}" fill="${p.base}" ${stroke}/>${pleats}<path d="M74 196 Q150 210 226 196" fill="none" stroke="${p.trim}" stroke-width="5"/><path d="M118 48 Q150 86 182 48" fill="none" stroke="${p.trim}" stroke-width="3.5"/><path d="M4 470 Q150 492 296 470" fill="none" stroke="${p.trim}" stroke-width="6"/>${dots(10, 452, 290, 452)}`;
    }
    case "lehenga": {
      const choli = `M116 50 Q150 84 184 50 L240 60 L262 136 L240 142 L230 112 L232 168 Q150 178 68 168 L70 112 L60 142 L38 136 L60 60 Z`;
      const skirt = `M76 196 Q150 206 224 196 Q298 330 300 482 Q150 500 0 482 Q2 330 76 196 Z`;
      return `<path d="${skirt}" fill="${p.base}" ${stroke}/><path d="${choli}" fill="${p.shade}" ${stroke}/><path d="M0 482 Q150 500 300 482" fill="none" stroke="${p.trim}" stroke-width="10"/>${dots(4, 460, 296, 460)}${dots(30, 420, 270, 420)}<path d="M68 168 Q150 178 232 168" fill="none" stroke="${p.trim}" stroke-width="4"/><path d="M116 50 Q150 84 184 50" fill="none" stroke="${p.trim}" stroke-width="3"/>`;
    }
    case "abaya": {
      const body = `M124 44 Q150 60 176 44 L240 60 L298 300 L256 312 L232 140 L262 486 Q150 498 38 486 L68 140 L44 312 L2 300 L60 60 Z`;
      return `<path d="${body}" fill="${p.base}" ${stroke}/><path d="M150 54 L150 490" stroke="${p.shade}" stroke-width="1.6"/><path d="M256 312 L298 300" stroke="${p.trim}" stroke-width="4"/><path d="M2 300 L44 312" stroke="${p.trim}" stroke-width="4"/>${dots(140, 60, 140, 480)}${dots(160, 60, 160, 480)}`;
    }
  }
}

/** Transparent overlay for camera try-on. */
export function tryOnSvg(kind: GarmentKind, base: string, trim?: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 500" width="300" height="500">${garment(kind, palette(base, trim))}</svg>`;
}

/** Lookbook card for the portfolio (portrait 600×750). */
export function lookbookSvg(kind: GarmentKind, base: string, opts: { bg?: string; trim?: string; trouser?: string } = {}) {
  const p = palette(base, opts.trim);
  const bg = opts.bg ?? "#efe7da";
  const showTrouser = opts.trouser && ["kurta", "kameez_men", "kameez_women", "kids", "waistcoat"].includes(kind);
  const trouser = showTrouser
    ? `<path d="M98 380 L202 380 L214 610 L176 610 L152 430 L148 430 L124 610 L86 610 Z" fill="${opts.trouser}" stroke="${shade(opts.trouser!, -0.12)}" stroke-width="2"/>`
    : "";
  const underKurta = kind === "waistcoat" ? garment("kurta", palette("#f4f0e6", "#e9e1d0")) : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750">
<defs>
<radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${shade(bg, 0.05)}"/><stop offset="1" stop-color="${shade(bg, -0.05)}"/></radialGradient>
<pattern id="w" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0H6M0 3H6" stroke="#000" stroke-opacity="0.025"/><path d="M0 0V6M3 0V6" stroke="#000" stroke-opacity="0.02"/></pattern>
<filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#17140f" flood-opacity="0.18"/></filter>
</defs>
<rect width="600" height="750" fill="url(#g)"/><rect width="600" height="750" fill="url(#w)"/>
<ellipse cx="300" cy="722" rx="180" ry="14" fill="#17140f" opacity="0.07"/>
<g transform="translate(127.5 30) scale(1.15)" filter="url(#s)">${trouser}${underKurta}${garment(kind, p)}</g>
<path d="M300 22 L300 70" stroke="#a5803f" stroke-width="1.2"/><circle cx="300" cy="74" r="4" fill="none" stroke="#a5803f" stroke-width="1.2"/>
</svg>`;
}

const weave = (id: string, color: string, opacity: number, size = 4) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><path d="M0 0H${size}" stroke="${color}" stroke-opacity="${opacity}"/><path d="M0 0V${size}" stroke="${color}" stroke-opacity="${opacity * 0.8}"/></pattern>`;

/** Fabric swatch (square) with a texture matching the material. */
export function swatchSvg(material: string, hex: string) {
  const dark = shade(hex, -0.18);
  const light = shade(hex, 0.18);
  let overlay = "";
  switch (material) {
    case "silk":
    case "organza":
      overlay = `<rect width="400" height="400" fill="url(#sheen)"/>`;
      break;
    case "velvet":
      overlay = `<rect width="400" height="400" fill="url(#deep)"/>`;
      break;
    case "lawn":
    case "chiffon":
      overlay = Array.from({ length: 36 }, (_, i) => {
        const x = (i % 6) * 70 + (Math.floor(i / 6) % 2) * 35 + 18;
        const y = Math.floor(i / 6) * 70 + 22;
        return `<g transform="translate(${x} ${y})" fill="${light}" opacity="0.75"><circle r="6"/><circle cx="9" r="4"/><circle cx="-9" r="4"/><circle cy="9" r="4"/><circle cy="-9" r="4"/></g>`;
      }).join("");
      break;
    case "jamawar":
      overlay = Array.from({ length: 16 }, (_, i) => {
        const x = (i % 4) * 100 + 50;
        const y = Math.floor(i / 4) * 100 + 50;
        return `<path transform="translate(${x} ${y}) rotate(${(i * 37) % 360})" d="M0 -22 C18 -22 22 4 6 16 C-2 22 -14 16 -12 6 C-10 -2 0 0 0 -8 C0 -14 -8 -16 -8 -16 C-6 -20 -3 -22 0 -22 Z" fill="${light}" stroke="#c9a463" stroke-width="1.2" opacity="0.85"/>`;
      }).join("");
      break;
    case "khaddar":
    case "karandi":
      overlay = Array.from({ length: 70 }, (_, i) => `<path d="M0 ${i * 6 + ((i * 7) % 3)} H400" stroke="${i % 3 ? dark : light}" stroke-opacity="0.18" stroke-width="${1 + (i % 2)}"/>`).join("");
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
<defs>${weave("wv", "#000", 0.06)}
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.05"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/></linearGradient>
<radialGradient id="deep" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity="0.12"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient>
</defs>
<rect width="400" height="400" fill="${hex}"/>${overlay}<rect width="400" height="400" fill="url(#wv)"/>
</svg>`;
}

/** Shop cover: soft gradient, linen weave and a stitched curve. */
export function coverSvg(a: string, b: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420" width="1200" height="420" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>${weave("lw", "#000", 0.035, 5)}</defs>
<rect width="1200" height="420" fill="url(#c)"/><rect width="1200" height="420" fill="url(#lw)"/>
<path d="M-20 300 C 260 160, 520 420, 820 240 S 1160 120, 1240 180" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="10 9"/>
<path d="M-20 340 C 300 220, 560 460, 860 290 S 1180 170, 1240 230" fill="none" stroke="#c9a463" stroke-opacity="0.6" stroke-width="1.5"/>
<g transform="translate(980 70)" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="2"><circle cx="0" cy="0" r="44"/><circle cx="0" cy="0" r="30" stroke-dasharray="3 6"/><path d="M-10 -60 L60 60"/></g>
</svg>`;
}
