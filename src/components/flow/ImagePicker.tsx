"use client";

import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useRef, useState } from "react";

import { useI18n } from "@/i18n/client";

export type Uploaded = { key: string; preview: string };

/** Shrinks a photo in the browser (max 1600 px, JPEG) so it uploads fast on mobile data. */
async function shrink(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const keepAlpha = file.type === "image/png" && file.size < 2_000_000;
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), keepAlpha ? "image/png" : "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

export function ImagePicker({ label, max, items, onChange }: { label: string; max: number; items: Uploaded[]; onChange: (items: Uploaded[]) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files) return;
    setError(null);
    const list = Array.from(files).slice(0, max - items.length);
    setBusy(list.length);
    const added: Uploaded[] = [];
    for (const file of list) {
      try {
        const blob = await shrink(file);
        const fd = new FormData();
        fd.append("file", blob, file.name);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "generic");
        added.push({ key: data.key, preview: URL.createObjectURL(blob) });
      } catch (e) {
        const code = e instanceof Error ? e.message : "generic";
        setError((t.flow.errors.upload as Record<string, string>)[code] ?? t.flow.errors.upload.generic);
      } finally {
        setBusy((n) => n - 1);
      }
    }
    onChange([...items, ...added]);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-3">
        {items.map((it) => (
          <div key={it.key} className="relative size-20 overflow-hidden rounded-2xl border border-line-2 bg-ink-3 sm:size-24">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={it.preview} alt="" className="size-full object-cover" />
            <button type="button" onClick={() => onChange(items.filter((x) => x.key !== it.key))} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-ink/80 text-ivory backdrop-blur hover:bg-bad" aria-label={t.flow.business.remove}>
              <X className="size-4" />
            </button>
          </div>
        ))}
        {Array.from({ length: busy }, (_, i) => (
          <div key={`b${i}`} className="grid size-20 place-items-center rounded-2xl border border-dashed border-line-2 sm:size-24" aria-label={t.flow.business.uploading}>
            <LoaderCircle className="size-5 animate-spin text-gold" />
          </div>
        ))}
        {items.length + busy < max && (
          <button type="button" onClick={() => input.current?.click()} className="grid size-20 place-items-center rounded-2xl border border-dashed border-line-2 text-sand transition hover:border-ember hover:text-ember sm:size-24">
            <span className="grid justify-items-center gap-1 text-[11px] font-semibold">
              <ImagePlus className="size-5" />
              {t.flow.business.addPhoto}
            </span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} hidden onChange={(e) => add(e.target.files)} />
      {error && <p className="error">{error}</p>}
    </div>
  );
}
