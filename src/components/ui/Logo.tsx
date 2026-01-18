"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 24 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      {/* Note shape */}
      <path
        d="M3 1h10l3 3v14H3V1z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Folded corner */}
      <path
        d="M13 1v3h3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Note text lines */}
      <line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="5" y1="8.5" x2="9" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.3" />
      <line x1="5" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.3" />

      {/* Mini calculator in corner */}
      <rect x="13" y="12" width="10" height="11" rx="2" fill="currentColor" fillOpacity="0.9"/>
      {/* Calculator screen */}
      <rect x="14.5" y="13.5" width="7" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.3"/>
      {/* Calculator buttons */}
      <rect x="14.5" y="17" width="1.5" height="1.5" rx="0.3" fill="currentColor" fillOpacity="0.4"/>
      <rect x="16.5" y="17" width="1.5" height="1.5" rx="0.3" fill="currentColor" fillOpacity="0.4"/>
      <rect x="18.5" y="17" width="1.5" height="1.5" rx="0.3" fill="currentColor" fillOpacity="0.4"/>
      <rect x="20.5" y="17" width="1.5" height="1.5" rx="0.3" fill="currentColor" fillOpacity="0.6"/>
      <rect x="14.5" y="19.5" width="1.5" height="1.5" rx="0.3" fill="currentColor" fillOpacity="0.4"/>
      <rect x="16.5" y="19.5" width="1.5" height="1.5" rx="0.3" fill="currentColor" fillOpacity="0.4"/>
      <rect x="18.5" y="19.5" width="1.5" height="1.5" rx="0.3" fill="currentColor" fillOpacity="0.4"/>
      <rect x="20.5" y="19.5" width="1.5" height="1.5" rx="0.3" fill="currentColor" fillOpacity="0.6"/>
    </svg>
  );
}
