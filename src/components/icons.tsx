import type { ReactNode } from "react";

export type IconName =
  | "sun"
  | "snowflake"
  | "rain"
  | "storm"
  | "flower"
  | "moon"
  | "zap"
  | "newspaper"
  | "tree"
  | "globe";

const CLOUD = <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />;

const PATHS: Record<IconName, ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  snowflake: (
    <path d="M2 12h20M12 2v20m8-6-4-4 4-4M4 8l4 4-4 4m12-12-4 4-4-4m8 16-4-4-4 4" />
  ),
  rain: (
    <>
      {CLOUD}
      <path d="M16 13v6M8 13v6M12 15v6" />
    </>
  ),
  storm: (
    <>
      {CLOUD}
      <path d="M13 9 7 15.5h4.5L10 21l6-6.5h-4.5L13 9z" />
    </>
  ),
  flower: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="17" cy="12" r="2.4" />
      <circle cx="14.5" cy="16.3" r="2.4" />
      <circle cx="9.5" cy="16.3" r="2.4" />
      <circle cx="7" cy="12" r="2.4" />
      <circle cx="9.5" cy="7.7" r="2.4" />
      <circle cx="14.5" cy="7.7" r="2.4" />
    </>
  ),
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  newspaper: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h6M9 19h3" />
    </>
  ),
  tree: <path d="M12 3 8 10h3L6 18h12l-5-8h3L12 3zM9 18h6v3H9z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
