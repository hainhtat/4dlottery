"use client";

import { useEffect, useId, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const EMBEDDED_FPS = 10;
const EMBEDDED_BOX = 240;
const FULLSCREEN_FPS = 16;
const FULLSCREEN_QRBOX_RATIO = 0.78;

function buildScanConfig(variant: "embedded" | "fullscreen") {
  if (variant === "embedded") {
    return {
      fps: EMBEDDED_FPS,
      qrbox: { width: EMBEDDED_BOX, height: EMBEDDED_BOX },
      aspectRatio: 1,
    };
  }

  return {
    fps: FULLSCREEN_FPS,
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
      const edge = Math.floor(
        Math.min(viewfinderWidth, viewfinderHeight) * FULLSCREEN_QRBOX_RATIO
      );
      return { width: edge, height: edge };
    },
  };
}

export function AgentQrScanner({
  active,
  variant = "embedded",
  onScan,
  onError,
}: {
  active: boolean;
  variant?: "embedded" | "fullscreen";
  onScan: (decodedText: string) => void;
  onError?: (message: string) => void;
}) {
  const reactId = useId();
  const elementId = `agent-qr-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const isFullscreen = variant === "fullscreen";

  useEffect(() => {
    if (!active) return;

    handledRef.current = false;
    let cancelled = false;
    const scanner = new Html5Qrcode(elementId, { verbose: false });
    scannerRef.current = scanner;

    const config = buildScanConfig(variant);

    void scanner
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (handledRef.current || cancelled) return;
          handledRef.current = true;
          onScan(decodedText);
        },
        () => {
          /* per-frame decode miss — ignore */
        }
      )
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Camera unavailable";
        onError?.(message);
      });

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (!instance) return;
      void instance
        .stop()
        .then(() => instance.clear())
        .catch(() => {
          try {
            instance.clear();
          } catch {
            /* ignore */
          }
        });
    };
  }, [active, elementId, onScan, onError, variant]);

  if (!active) {
    return null;
  }

  return (
    <div
      id={elementId}
      className={
        isFullscreen ? "agent-qr-mount agent-qr-mount--fullscreen" : "agent-qr-mount"
      }
      style={{
        width: "100%",
        minHeight: isFullscreen ? undefined : 280,
        height: isFullscreen ? "100%" : undefined,
        borderRadius: isFullscreen ? 0 : 12,
        overflow: "hidden",
        background: "#0f172a",
      }}
    />
  );
}
