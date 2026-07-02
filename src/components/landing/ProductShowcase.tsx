"use client";

import Image from "next/image";

const galleryImages = [
  { src: "/images/product-1.jpg", alt: "جراب موبايل حلم - تصميم 1" },
  { src: "/images/product-2.jpg", alt: "جراب موبايل حلم - تصميم 2" },
  { src: "/images/product-3.jpg", alt: "جراب موبايل حلم - تصميم 3" },
];

export default function ProductShowcase() {
  return (
    <section className="relative py-24">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-950/20 to-transparent" />

      <div className="relative container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-white mb-4">
            شوف المنتج <span className="text-gradient">عن قرب</span>
          </h2>
          <p className="text-gray-400">
            صور حقيقية — اللي هتشوفه هو اللي هيوصلك
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {galleryImages.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer"
            >
              {/* Glassmorphism overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />

              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 33vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  if (target.parentElement) {
                    const fallback = document.createElement("div");
                    fallback.className =
                      "w-full h-full bg-dark-800 flex flex-col items-center justify-center text-gray-600";
                    fallback.innerHTML = `
                      <svg class="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p class="text-sm">صورة ${index + 1}</p>
                    `;
                    target.parentElement.appendChild(fallback);
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
