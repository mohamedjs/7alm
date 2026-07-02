"use client";

import { useEffect, useState } from "react";

const GALLERY_IMAGES = [
  "/images/product-main.jpg",
  "/images/product-1.jpg",
  "/images/product-2.jpg",
  "/images/product-3.jpg",
];

const INITIAL_TIME_LEFT = 3600 * 2 + 14 * 60 + 20; // 2h 14m 20s
const INITIAL_VIEWERS = 38;

export interface FormattedTime {
  h: string;
  m: string;
  s: string;
}

function formatTime(seconds: number): FormattedTime {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    h: h.toString().padStart(2, "0"),
    m: m.toString().padStart(2, "0"),
    s: s.toString().padStart(2, "0"),
  };
}

/**
 * Countdown timer + live-viewers simulation for the urgency banner.
 * All the interval logic lives here so the component stays declarative.
 */
export function useUrgencyBanner() {
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME_LEFT);
  const [viewers, setViewers] = useState(INITIAL_VIEWERS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewers((prev) => {
        const change = Math.floor(Math.random() * 5) - 2;
        return Math.max(12, prev + change);
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return {
    time: formatTime(timeLeft),
    viewers,
  };
}

/**
 * Gallery image selection state for the product card.
 */
export function useProductGallery() {
  const [activeImage, setActiveImage] = useState(GALLERY_IMAGES[0]);
  return {
    galleryImages: GALLERY_IMAGES,
    activeImage,
    setActiveImage,
  };
}
