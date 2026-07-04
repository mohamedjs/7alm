"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface FullscreenGalleryProps {
  images: string[];
  productName: string;
  startIndex: number;
  onClose: () => void;
}

/**
 * Fullscreen image lightbox — opens on top of everything (fixed inset-0),
 * black background, user can swipe/scroll through all images.
 *
 * On mobile: vertical scroll through images (native momentum scrolling).
 * On desktop: same scroll + left/right arrow buttons.
 *
 * Closes on: X button, Escape key, or clicking the dark backdrop outside
 * an image.
 */
export default function FullscreenGallery({
  images,
  productName,
  startIndex,
  onClose,
}: FullscreenGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape to close + arrow navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrentIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowRight") setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [images.length, onClose]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  // Scroll to the selected image
  useEffect(() => {
    const el = document.getElementById(`fs-img-${currentIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  // Track which image is currently in view via IntersectionObserver
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setCurrentIndex(idx);
          }
        });
      },
      { threshold: [0.5] }
    );

    images.forEach((_, i) => {
      const el = document.getElementById(`fs-img-${i}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [images]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      style={{ backgroundColor: "#000000" }}
    >
      {/* Top bar: counter + close */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white shrink-0"
        style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
      >
        <span className="text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Scrollable image area */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden snap-y snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            id={`fs-img-${idx}`}
            data-index={idx}
            className="w-full min-h-screen flex items-center justify-center snap-center p-4"
            onClick={(e) => {
              // Click on backdrop (not the image itself) closes
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <div className="relative w-full max-w-3xl aspect-square">
              <Image
                src={img}
                alt={`${productName} - ${idx + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
                priority={idx === startIndex}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom: thumbnail strip + nav buttons */}
      {images.length > 1 && (
        <div
          className="shrink-0 py-3 px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
        >
          <div className="flex items-center gap-2 justify-center">
            {/* Prev */}
            <button
              onClick={goPrev}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors shrink-0"
              aria-label="Previous"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>

            {/* Thumbnails */}
            <div
              className="flex gap-2 overflow-x-auto py-1"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    idx === currentIndex
                      ? "border-brand-500 opacity-100 scale-105"
                      : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                  style={
                    idx === currentIndex
                      ? { borderColor: "#dd6253" }
                      : undefined
                  }
                >
                  <Image
                    src={img}
                    alt={`${productName} thumb ${idx + 1}`}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Next */}
            <button
              onClick={goNext}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors shrink-0"
              aria-label="Next"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
