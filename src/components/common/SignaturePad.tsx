import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Eraser, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SignaturePadHandle {
  /** The drawn signature as a PNG blob, or null if the board is empty. */
  toBlob: () => Promise<Blob | null>;
  clear: () => void;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  /** Fired whenever the first stroke lands or the board is cleared. */
  onChange?: (hasSignature: boolean) => void;
  className?: string;
  height?: number;
}

/**
 * A white signing board the staff member draws on with a finger or a mouse.
 *
 * The canvas is sized to its container at the device pixel ratio so strokes
 * stay crisp on phones, and pointer events are used so touch, pen and mouse
 * all take the same path.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ onChange, className = "", height = 200 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const dirty = useRef(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);
    const [hasInk, setHasInk] = useState(false);

    /** Resize the backing store to the CSS box, preserving what was drawn. */
    const fitToContainer = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;

      // Keep existing strokes across a resize (e.g. phone rotation).
      const previous = dirty.current ? canvas.toDataURL() : null;

      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(height * ratio);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1a2744";

      if (previous) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, height);
        img.src = previous;
      }
    }, [height]);

    useEffect(() => {
      fitToContainer();
      window.addEventListener("resize", fitToContainer);
      return () => window.removeEventListener("resize", fitToContainer);
    }, [fitToContainer]);

    const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drawing.current = true;
      lastPoint.current = pointFrom(e);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext("2d");
      const from = lastPoint.current;
      if (!ctx || !from) return;

      const to = pointFrom(e);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      lastPoint.current = to;

      if (!dirty.current) {
        dirty.current = true;
        setHasInk(true);
        onChange?.(true);
      }
    };

    const endStroke = () => {
      drawing.current = false;
      lastPoint.current = null;
    };

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      // Reset in device pixels, ignoring the current transform.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      dirty.current = false;
      setHasInk(false);
      onChange?.(false);
    }, [onChange]);

    useImperativeHandle(
      ref,
      () => ({
        isEmpty: () => !dirty.current,
        clear,
        toBlob: () =>
          new Promise<Blob | null>((resolve) => {
            const canvas = canvasRef.current;
            if (!canvas || !dirty.current) return resolve(null);
            // Flatten onto white — a transparent PNG prints as a black box.
            const flat = document.createElement("canvas");
            flat.width = canvas.width;
            flat.height = canvas.height;
            const ctx = flat.getContext("2d");
            if (!ctx) return resolve(null);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, flat.width, flat.height);
            ctx.drawImage(canvas, 0, 0);
            flat.toBlob((blob) => resolve(blob), "image/png");
          }),
      }),
      [clear],
    );

    return (
      <div className={className}>
        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-white">
          <canvas
            ref={canvasRef}
            style={{ height, touchAction: "none" }}
            className="block w-full cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            onPointerCancel={endStroke}
          />
          {!hasInk && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="flex flex-col items-center gap-1.5 text-slate-400">
                <PenLine className="h-6 w-6" />
                <p className="text-sm font-medium">Sign here with your finger or mouse</p>
              </div>
            </div>
          )}
          {/* Signing baseline */}
          <div className="pointer-events-none absolute inset-x-8 bottom-9 border-b border-slate-300" />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {hasInk ? "Signature captured." : "Your signature appears on your ID card."}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasInk}>
            <Eraser className="mr-1.5 h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </div>
    );
  },
);
