"use client";
import { useEffect, useRef, useState } from "react";
import type { MediaAsset, MediaReference } from "../domain/media";
import { mediaAssetSchema } from "../domain/media";
import { mediaRepository } from "../media/local";
import { imageDataUrl } from "../media/render";
export function MediaPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: MediaReference;
  onChange: (reference: MediaReference | undefined) => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const latestChange = useRef(onChange);
  useEffect(() => {
    latestChange.current = onChange;
  }, [onChange]);
  const assetId = value?.assetId;
  useEffect(() => {
    let active = true;
    function refresh() {
      Promise.all([
        mediaRepository.list(),
        assetId ? mediaRepository.get(assetId) : Promise.resolve(null),
      ])
        .then(([list, item]) => {
          if (active) {
            setAssets(list);
            setPreview(
              item ? imageDataUrl(item.asset.mimeType, item.bytes) : "",
            );
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }
    refresh();
    window.addEventListener("ecu-media-updated", refresh);
    return () => {
      active = false;
      window.removeEventListener("ecu-media-updated", refresh);
    };
  }, [assetId]); // Crop edits do not re-read image bytes.
  function select(assetId: string) {
    onChange(
      assetId
        ? {
            assetId,
            alt: assets.find((a) => a.id === assetId)?.name ?? "",
            caption: "",
            credit: "",
            focalPoint: { x: 0.5, y: 0.5 },
            fit: "cover",
          }
        : undefined,
    );
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        !file.size ||
        file.size > 8_000_000
      )
        throw new Error(
          "Choose a PNG, JPEG or WebP image up to 8 MB. SVG and other formats are unsupported.",
        );
      const bitmap = await createImageBitmap(file);
      const asset = mediaAssetSchema.parse({
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type,
        width: bitmap.width,
        height: bitmap.height,
        byteLength: file.size,
      });
      bitmap.close();
      await mediaRepository.put({
        asset,
        bytes: new Uint8Array(await file.arrayBuffer()),
      });
      window.dispatchEvent(new Event("ecu-media-updated"));
      setAssets(await mediaRepository.list());
      latestChange.current({
        assetId: asset.id,
        alt: file.name,
        caption: "",
        credit: "",
        focalPoint: { x: 0.5, y: 0.5 },
        fit: "cover",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to store image.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset className="my-4 min-w-0 rounded-lg border border-[#E5E5E5] p-3">
      <legend className="px-1 text-xs font-semibold">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          {label} — choose image
          <select
            value={value?.assetId ?? ""}
            onChange={(e) => select(e.target.value)}
          >
            <option value="">No image selected</option>
            {value && !assets.some((a) => a.id === value.assetId) && (
              <option value={value.assetId}>Missing image</option>
            )}
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.width} × {a.height})
              </option>
            ))}
          </select>
        </label>
        <label>
          Upload {label.toLowerCase()}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="muted mt-2">
        Upload PNG, JPEG or WebP files up to 8 MB. Images are saved in this
        browser. PDF exports have a 1 MB total limit, so choose smaller files
        when needed. Your images are never resized automatically.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {busy && <p role="status">Saving image…</p>}
      {value && (
        <>
          {preview ? (
            <div className="mt-3 flex justify-center bg-[#F5F5F5]">
              {/* Local data URLs need neither Next image optimization nor network access. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt={value.alt}
                className="h-44 w-full max-w-sm"
                style={{
                  objectFit: value.fit ?? "cover",
                  objectPosition: `${value.focalPoint.x * 100}% ${value.focalPoint.y * 100}%`,
                }}
              />
            </div>
          ) : (
            <p className="error">
              Selected image is unavailable in this browser.
            </p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              {label} description
              <input
                value={value.alt}
                maxLength={500}
                onChange={(e) => onChange({ ...value, alt: e.target.value })}
              />
            </label>
            <label>
              {label} fit
              <select
                value={value.fit ?? "cover"}
                onChange={(e) =>
                  onChange({
                    ...value,
                    fit: e.target.value as "cover" | "contain",
                  })
                }
              >
                <option value="cover">Fill frame / crop</option>
                <option value="contain">Show complete image</option>
              </select>
            </label>
            {(["x", "y"] as const).map((axis) => (
              <label key={axis}>
                {label} {axis === "x" ? "horizontal" : "vertical"} position (
                {Math.round(value.focalPoint[axis] * 100)}%)
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value.focalPoint[axis] * 100}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      focalPoint: {
                        ...value.focalPoint,
                        [axis]: Number(e.target.value) / 100,
                      },
                    })
                  }
                />
              </label>
            ))}
            <label>
              {label} caption
              <input
                value={value.caption}
                maxLength={1000}
                onChange={(e) =>
                  onChange({ ...value, caption: e.target.value })
                }
              />
            </label>
            <label>
              {label} credit
              <input
                value={value.credit}
                maxLength={300}
                onChange={(e) => onChange({ ...value, credit: e.target.value })}
              />
            </label>
          </div>
        </>
      )}
    </fieldset>
  );
}
