"use client";

import { useEffect, useId, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_FPS = 10;
const SCANNER_BOX = 240;

export function AgentQrScanner({
  active,
  onScan,
  onError,
}: {
  active: boolean;
  onScan: (decodedText: string) => void;
  onError?: (message: string) => void;
}) {
  const reactId = useId();
  const elementId = `agent-qr-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    handledRef.current = false;
    let cancelled = false;
    const scanner = new Html5Qrcode(elementId, { verbose: false });
    scannerRef.current = scanner;

    const config = {
      fps: SCANNER_FPS,
      qrbox: { width: SCANNER_BOX, height: SCANNER_BOX },
      aspectRatio: 1,
    };

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
  }, [active, elementId, onScan, onError]);

  if (!active) {
    return null;
  }

  return (
    <div
      id={elementId}
      style={{
        width: "100%",
        minHeight: 280,
        borderRadius: 12,
        overflow: "hidden",
        background: "#0f172a",
      }}
    />
  );
}
