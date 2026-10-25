import type { SVGProps } from "react";

export type IconName =
  | "target"
  | "sound"
  | "muted"
  | "reset"
  | "pause"
  | "play"
  | "expand"
  | "collapse"
  | "help"
  | "close"
  | "left"
  | "right"
  | "arrow"
  | "check"
  | "spark"
  | "info";

const paths: Record<IconName, string[]> = {
  target: [
    "M12 2v4m0 12v4M2 12h4m12 0h4",
    "M19 8a8 8 0 1 0 0 8",
    "M16 12a4 4 0 1 1-4-4",
    "m12 12 8-8m-4 0h4v4",
  ],
  sound: ["M4 9v6h4l5 4V5L8 9H4Z", "M16 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"],
  muted: ["M4 9v6h4l5 4V5L8 9H4Z", "m17 9 5 6m0-6-5 6"],
  reset: ["M3 10a9 9 0 1 1 1.3 7", "M3 4v6h6"],
  pause: ["M8 5v14M16 5v14"],
  play: ["m8 5 11 7-11 7V5Z"],
  expand: ["M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"],
  collapse: ["M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"],
  help: [
    "M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5",
    "M12 17h.01",
    "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  ],
  close: ["m6 6 12 12M6 18 18 6"],
  left: ["m14 5-7 7 7 7"],
  right: ["m10 5 7 7-7 7"],
  arrow: ["M4 12h16m-6-6 6 6-6 6"],
  check: ["m5 12 4 4L19 6"],
  spark: ["m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"],
  info: ["M12 11v6m0-10h.01", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
};

export default function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name].map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
}
