"use client";

import { useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { ArrowClockwiseIcon, ArrowCounterClockwiseIcon, ArrowsLeftRightIcon, CircleNotchIcon, ImageIcon, PlusIcon, StarIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { OutlineButton } from "@/components/shared/inventory-ui";
import { MAX_IMAGES } from "@/lib/api/inventory";
import { ACCEPT_ATTR, imageFileProblem, prepareImage, rotateImage } from "@/lib/images";
import { cn } from "@/lib/utils";

/**
 * Upload, preview, rotate, replace, remove and choose the primary product
 * image. Works on a list of image sources (primary first) and reports every
 * change through onChange; the caller decides when to save.
 */
export function ImageManager({ images, onChange, name, disabled, className }: { images: string[]; onChange: (next: string[]) => void; name: string; disabled?: boolean; className?: string }) {
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [announce, setAnnounce] = useState("");
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const current = images.length ? Math.min(selected, images.length - 1) : -1;
  const room = MAX_IMAGES - images.length;
  const label = name.trim() || "this item";

  const say = (text: string) => setAnnounce(text);

  const add = async (files: File[]) => {
    if (disabled || !files.length) return;
    const problems = files.map(imageFileProblem).filter(Boolean) as string[];
    let ok = files.filter((f) => !imageFileProblem(f));
    if (problems.length) toast.error(problems.length === 1 ? problems[0] : `${problems.length} files were skipped`, { description: problems.length > 1 ? "Use JPG, PNG, WebP or GIF images up to 5 MB each." : undefined });
    if (ok.length > room) {
      toast.error(`You can add ${room === 0 ? "no more" : `only ${room} more`} image${room === 1 ? "" : "s"}`, { description: `An item can have up to ${MAX_IMAGES} images.` });
      ok = ok.slice(0, room);
    }
    if (!ok.length) return;
    setBusy(ok.length === 1 ? "Adding image…" : `Adding ${ok.length} images…`);
    try {
      const urls = await Promise.all(ok.map(prepareImage));
      onChange([...images, ...urls]);
      setSelected(images.length);
      say(`${urls.length === 1 ? "Image" : `${urls.length} images`} added`);
    } catch (e) {
      toast.error("Couldn't add the image", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const replace = async (file: File | undefined) => {
    if (!file || current < 0) return;
    setBusy("Replacing image…");
    try {
      const url = await prepareImage(file);
      onChange(images.map((src, i) => (i === current ? url : src)));
      say(`Image ${current + 1} replaced`);
    } catch (e) {
      toast.error("Couldn't replace the image", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const rotate = async (direction: 1 | -1) => {
    if (current < 0) return;
    setBusy("Rotating…");
    try {
      const url = await rotateImage(images[current], direction);
      onChange(images.map((src, i) => (i === current ? url : src)));
      say(`Image rotated ${direction === 1 ? "clockwise" : "anticlockwise"}`);
    } catch (e) {
      toast.error("Couldn't rotate the image", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const remove = () => {
    if (current < 0) return;
    onChange(images.filter((_, i) => i !== current));
    setSelected(Math.max(0, current - 1));
    say(current === 0 && images.length > 1 ? "Image removed. The next image is now primary." : "Image removed");
  };

  const makePrimary = () => {
    if (current <= 0) return;
    onChange([images[current], ...images.filter((_, i) => i !== current)]);
    setSelected(0);
    say("Primary image changed");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void add(Array.from(e.dataTransfer.files));
  };

  const dropProps = disabled
    ? {}
    : {
        onDragOver: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragOver(true);
        },
        onDragLeave: (e: DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        },
        onDrop,
      };

  return (
    <div className={cn("relative min-w-0", className)} {...dropProps}>
      <input
        ref={addInput}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void add(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInput}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void replace(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {images.length === 0 ? (
        <button
          type="button"
          disabled={disabled || !!busy}
          onClick={() => addInput.current?.click()}
          className={cn(
            "flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action disabled:opacity-60",
            dragOver ? "border-brand bg-brand-surface" : "border-[#D0D5DD] bg-[#FAFAFB] hover:border-brand-hover hover:bg-brand-surface",
          )}
        >
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-inventory-surface text-inventory" aria-hidden>
            {busy ? <CircleNotchIcon size={20} className="animate-spin" /> : <UploadSimpleIcon size={20} weight="bold" />}
          </span>
          <span className="text-[13.5px] leading-5 font-semibold text-ink">{busy ?? "Drag & drop images or browse"}</span>
          <span className="max-w-[260px] text-[12px] leading-[18px] text-ink-muted">Up to {MAX_IMAGES} images, JPG, PNG, WebP or GIF, each up to 5 MB. The first image is the primary image.</span>
        </button>
      ) : (
        <>
          <div className={cn("relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-[#F5F6F8]", dragOver ? "border-brand ring-3 ring-brand-10" : "border-line")}>
            <Image src={images[current]} alt={`${label}, image ${current + 1} of ${images.length}`} fill sizes="(min-width: 1024px) 360px, 90vw" className="object-contain" />
            {current === 0 && (
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11.5px] font-semibold text-inventory-depth shadow-sm">
                <StarIcon size={12} weight="fill" aria-hidden /> Primary
              </span>
            )}
            {(busy || dragOver) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-[13px] font-medium text-ink">
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <CircleNotchIcon size={18} className="animate-spin" aria-hidden /> {busy}
                  </span>
                ) : (
                  "Drop to add images"
                )}
              </div>
            )}
          </div>

          {!disabled && (
            <div className="mt-2 flex flex-wrap gap-1.5" role="toolbar" aria-label="Selected image">
              <OutlineButton icon={StarIcon} className="h-8 px-2.5 text-[12.5px]" onClick={makePrimary} disabled={current === 0 || !!busy}>
                {current === 0 ? "Primary" : "Make primary"}
              </OutlineButton>
              <OutlineButton aria-label="Rotate anticlockwise" title="Rotate anticlockwise" className="h-8 w-8 px-0" onClick={() => void rotate(-1)} disabled={!!busy}>
                <ArrowCounterClockwiseIcon size={15} aria-hidden />
              </OutlineButton>
              <OutlineButton aria-label="Rotate clockwise" title="Rotate clockwise" className="h-8 w-8 px-0" onClick={() => void rotate(1)} disabled={!!busy}>
                <ArrowClockwiseIcon size={15} aria-hidden />
              </OutlineButton>
              <OutlineButton icon={ArrowsLeftRightIcon} className="h-8 px-2.5 text-[12.5px]" onClick={() => replaceInput.current?.click()} disabled={!!busy}>
                Replace
              </OutlineButton>
              <OutlineButton icon={TrashIcon} className="h-8 px-2.5 text-[12.5px] hover:border-[#FDA29B] hover:bg-[#FEF3F2] hover:text-[#B42318]" onClick={remove} disabled={!!busy}>
                Remove
              </OutlineButton>
            </div>
          )}

          <ul className="mt-3 grid grid-cols-5 gap-2" aria-label={`Images of ${label}`}>
            {images.map((src, i) => (
              <li key={`${i}-${src.length}-${src.slice(-24)}`}>
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-label={`Show image ${i + 1}${i === 0 ? " (primary)" : ""}`}
                  aria-pressed={i === current}
                  className={cn(
                    "relative block aspect-square w-full overflow-hidden rounded-lg border bg-[#F5F6F8] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action",
                    i === current ? "border-brand ring-2 ring-brand-10" : "border-line-soft hover:border-[#D0D5DD]",
                  )}
                >
                  <Image src={src} alt="" fill sizes="72px" className="object-cover" />
                  {i === 0 && (
                    <span className="absolute right-0.5 bottom-0.5 inline-flex size-4 items-center justify-center rounded-full bg-white text-inventory shadow-sm" aria-hidden>
                      <StarIcon size={10} weight="fill" />
                    </span>
                  )}
                </button>
              </li>
            ))}
            {!disabled && room > 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => addInput.current?.click()}
                  disabled={!!busy}
                  aria-label="Add images"
                  className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-[#D0D5DD] bg-[#FAFAFB] text-ink-muted transition-colors hover:border-brand-hover hover:bg-brand-surface hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action disabled:opacity-60"
                >
                  <PlusIcon size={18} weight="bold" aria-hidden />
                </button>
              </li>
            )}
          </ul>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] leading-4 text-ink-muted">
            <ImageIcon size={14} aria-hidden />
            {images.length} of {MAX_IMAGES} images{!disabled && " · drop files here to add more"}
          </p>
        </>
      )}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
