import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, PenLine } from "lucide-react";

interface SignaturePadProps {
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}

export default function SignaturePad({ value, onChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasSigned, setHasSigned] = useState(false);

  const getCanvas = () => canvasRef.current;
  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      const canvas = getCanvas();
      if (!canvas) return;
      isDrawing.current = true;
      lastPos.current = getPos(e, canvas);
    },
    [disabled]
  );

  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current || disabled) return;
      e.preventDefault();
      const canvas = getCanvas();
      const ctx = getCtx();
      if (!canvas || !ctx || !lastPos.current) return;

      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#1a2d3f";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      lastPos.current = pos;
    },
    [disabled]
  );

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    const canvas = getCanvas();
    if (!canvas) return;
    setHasSigned(true);
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", endDraw);

    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mouseleave", endDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", endDraw);
    };
  }, [startDraw, draw, endDraw]);

  useEffect(() => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    if (value && value.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
        setHasSigned(true);
      };
      img.src = value;
    }
  }, []);

  const handleClear = () => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div
        className={`relative rounded-xl border-2 transition-colors ${
          hasSigned
            ? "border-[#24384e]"
            : "border-dashed border-stone-300 hover:border-stone-400"
        } bg-white overflow-hidden`}
        style={{ height: 140 }}
      >
        {!hasSigned && !disabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-40">
            <PenLine className="h-7 w-7 text-stone-400 mb-1" />
            <span className="text-sm text-stone-400">Draw your signature here</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          style={{ display: "block" }}
          data-testid="signature-canvas"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400">
          {hasSigned
            ? "Signature captured — clear to redraw"
            : "Use your mouse or finger to sign above"}
        </p>
        {hasSigned && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-stone-400 hover:text-destructive h-7 gap-1"
            data-testid="button-clearSignature"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
