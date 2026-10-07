import Image, { type ImageProps } from "next/image";

/**
 * next/image everywhere for automatic resizing + modern formats, except SVG
 * illustrations which are served as-is (they're already vector and tiny).
 */
export function SmartImage(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  const unoptimized = src.endsWith(".svg") || props.unoptimized;
  return <Image {...props} unoptimized={unoptimized} alt={props.alt ?? ""} />;
}
