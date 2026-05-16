"use client";

import { useEffect, useRef } from "react";

/**
 * Landing-page demo player. Plays the product demo as a clean, chrome-less
 * looping clip: muted + autoplay (so browsers allow it), loops forever,
 * and runs at 2x so the demo feels snappy. playbackRate must be set via
 * JS — it's not an HTML attribute — hence this small client component.
 */
export function DemoVideo() {
  const ref = useRef(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.playbackRate = 2;
    // Some browsers reset playbackRate when the source (re)loads; re-apply.
    const reapply = () => {
      v.playbackRate = 2;
    };
    v.addEventListener("loadedmetadata", reapply);
    v.addEventListener("play", reapply);
    return () => {
      v.removeEventListener("loadedmetadata", reapply);
      v.removeEventListener("play", reapply);
    };
  }, []);

  return (
    <div className="surface overflow-hidden rounded-2xl shadow-[0_40px_140px_-40px_rgba(0,0,0,0.45)]">
      <video
        ref={ref}
        src="/brand/demo.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="block w-full bg-black"
      >
        Your browser doesn&apos;t support embedded video.{" "}
        <a href="/brand/demo.mp4" className="underline underline-offset-4">
          Download the demo
        </a>
        .
      </video>
    </div>
  );
}
