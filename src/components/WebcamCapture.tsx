"use client";

import { useEffect, useRef, useState } from "react";

interface WebcamCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

/**
 * Live webcam preview with a capture button. Produces a JPEG File so it can go
 * through the same upload path as a picked photo.
 *
 * Note: browsers only allow camera access in a secure context (https, or
 * localhost). It works at http://localhost:3000 on the PC, but not over a
 * plain http:// LAN address -- phones should use the regular photo picker,
 * which opens the native camera anyway.
 */
export default function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Camera isn't available here. Webcam capture needs https or localhost -- use Choose File instead."
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was blocked. Allow camera access in your browser's address bar and try again."
            : name === "NotFoundError"
              ? "No webcam found on this device."
              : "Couldn't start the webcam."
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: "image/jpeg" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onCapture(file);
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-black/10">
      {error ? (
        <p className="bg-red-50 px-3 py-3 text-sm text-red-700">{error}</p>
      ) : (
        <video
          ref={videoRef}
          playsInline
          muted
          className="aspect-square w-full bg-black object-cover"
        />
      )}
      <div className="flex gap-2 p-2">
        {!error && (
          <button
            type="button"
            onClick={capture}
            disabled={!ready}
            className="flex-1 rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {ready ? "Take photo" : "Starting camera..."}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-black/15 px-3 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
