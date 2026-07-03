"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

interface ProductGalleryProps {
  gallery: string[];
  productName: string;
  discountPercent: number | null;
}

export default function ProductGallery({
  gallery,
  productName,
  discountPercent,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [mainRef, mainApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: true }),
  ]);

  const [thumbRef, thumbApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });

  const onThumbClick = useCallback(
    (index: number) => {
      if (!mainApi || !thumbApi) return;
      mainApi.scrollTo(index);
    },
    [mainApi, thumbApi]
  );

  const onSelect = useCallback(() => {
    if (!mainApi || !thumbApi) return;
    setSelectedIndex(mainApi.selectedScrollSnap());
    thumbApi.scrollTo(mainApi.selectedScrollSnap());
  }, [mainApi, thumbApi, setSelectedIndex]);

  useEffect(() => {
    if (!mainApi) return;
    mainApi.on("select", onSelect);
    mainApi.on("reInit", onSelect);
  }, [mainApi, onSelect]);

  const imageFallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = "none";
    if (target.parentElement) {
      const fallback = document.createElement("div");
      fallback.className =
        "w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400 absolute inset-0";
      fallback.innerHTML = `<svg class="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>صورة المنتج</span>`;
      target.parentElement.appendChild(fallback);
    }
  };

  const activeImage = gallery[0] || "";

  return (
    <>
      {gallery.length > 0 ? (
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Main Active Image Embla */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
            {discountPercent && (
              <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-lg">
                خصم {discountPercent}%
              </div>
            )}

            <div className="overflow-hidden" ref={mainRef} dir="ltr">
              <div className="flex touch-pan-y">
                {gallery.map((img, idx) => (
                  <div className="flex-[0_0_100%] min-w-0 relative" key={idx}>
                    <div className="relative w-full pt-[100%] sm:pt-[75%]">
                      <Image
                        src={img}
                        alt={`${productName} - ${idx + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={idx <= 1}
                        className="absolute inset-0 object-contain sm:object-cover"
                        onError={imageFallback}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons for Main Slider */}
            {gallery.length > 1 && (
              <>
                <button
                  onClick={() => mainApi?.scrollPrev()}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white text-amber-500 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition-all z-10"
                  aria-label="Previous image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => mainApi?.scrollNext()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white text-amber-500 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition-all z-10"
                  aria-label="Next image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Thumbnails Embla */}
          {gallery.length > 1 && (
            <div className="w-full overflow-hidden" ref={thumbRef} dir="ltr">
              <div className="flex gap-2 sm:gap-3 touch-pan-y">
                {gallery.map((img, idx) => (
                  <div
                    key={idx}
                    className="flex-[0_0_20%] min-w-0 sm:flex-[0_0_15%] cursor-pointer"
                    onClick={() => onThumbClick(idx)}
                  >
                    <div
                      className={`relative w-full pt-[100%] rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                        idx === selectedIndex
                          ? "border-amber-500 scale-105 shadow-md"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${productName} thumbnail ${idx + 1}`}
                        fill
                        sizes="100px"
                        className="absolute inset-0 object-cover"
                        onError={imageFallback}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeImage ? (
        <div className="relative w-full pt-[100%] sm:pt-[75%] rounded-2xl overflow-hidden mb-4 border border-gray-100 group bg-gray-50">
          {discountPercent && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-lg">
              خصم {discountPercent}%
            </div>
          )}
          <Image
            src={activeImage}
            alt={productName}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            loading="eager"
            className="absolute inset-0 object-contain sm:object-cover transition-transform duration-700"
            onError={imageFallback}
          />
        </div>
      ) : null}
    </>
  );
}
