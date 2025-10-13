"use client";
import { useEffect, useMemo, useRef } from "react";

export function HTMLRender({ html, className = "", height }: { html: string; className?: string; height?: number }) {
  const srcDoc = useMemo(() => {
    return `<!doctype html><html><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><style>html,body{margin:0;background:transparent;color:#fff}*,*:before,*:after{box-sizing:border-box}</style></head><body>${html}</body></html>`;
  }, [html]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    function adjust() {
      try {
        const doc = iframe.contentDocument;
        const body = doc?.body;
        const root = doc?.documentElement;
        const contentHeight = Math.max(
          body?.scrollHeight || 0,
          body?.offsetHeight || 0,
          root?.clientHeight || 0,
          root?.scrollHeight || 0,
          root?.offsetHeight || 0
        );
        if (contentHeight) {
          const min = typeof height === "number" ? height : 0;
          iframe.style.height = Math.max(contentHeight, min) + "px";
        }
      } catch {}
    }
    const onLoad = () => {
      adjust();
      // Adjust again after render
      setTimeout(adjust, 50);
      setTimeout(adjust, 200);
    };
    iframe.addEventListener("load", onLoad);
    // Try adjust in case it's already loaded via srcDoc
    onLoad();
    return () => {
      iframe.removeEventListener("load", onLoad);
    };
  }, [srcDoc, height]);

  return (
    <iframe
      ref={iframeRef}
      className={"w-full rounded-md border border-white/10 bg-transparent " + className}
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}


