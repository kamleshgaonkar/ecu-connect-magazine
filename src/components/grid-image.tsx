"use client";
import { useEffect, useState } from "react";
import type { Block } from "../domain/issue";
import { mediaRepository } from "../media/local";

export function GridImage({ block }: { block: Block }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true,
      objectUrl: string | undefined;
    const asset = block.image?.assetId;
    if (asset)
      void mediaRepository
        .get(asset)
        .then((value) => {
          if (!active || !value) return;
          objectUrl = URL.createObjectURL(
            new Blob([Uint8Array.from(value.bytes)], {
              type: value.asset.mimeType,
            }),
          );
          setUrl(objectUrl);
        })
        .catch(() => {});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [block.image?.assetId]);
  return url ? (
    <span className="grid-cell-image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={block.image?.alt ?? "Story image"}
        style={{
          objectFit: block.image?.fit ?? "cover",
          objectPosition:
            (block.image?.focalPoint.x ?? 0.5) * 100 +
            "% " +
            (block.image?.focalPoint.y ?? 0.5) * 100 +
            "%",
        }}
      />
    </span>
  ) : (
    <span>{block.image?.alt || "Choose an image"}</span>
  );
}
