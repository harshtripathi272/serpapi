"use client";

import { useState } from "react";

// Site icon via Google's favicon service, with a lettered tile if it fails to load.
export function Favicon({ domain, size = 20 }: { domain: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed || !domain) {
    return (
      <span
        className="inline-flex flex-none items-center justify-center rounded-md bg-fill font-bold uppercase text-sub"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        {domain.charAt(0) || "?"}
      </span>
    );
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="flex-none rounded-md bg-fill"
      style={{ width: size, height: size }}
    />
  );
}
