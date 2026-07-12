import { notFound } from "next/navigation";
import { productService } from "@/features/products/products.service";
import ProductCheckoutFunnel from "@/components/landing/ProductCheckoutFunnel";
import Footer from "@/components/landing/Footer";
import type { Metadata } from "next";

export const revalidate = 1800; // 30 minutes in seconds

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic metadata based on the product
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await productService.getProductBySlug(slug);
  if (!product) return { title: "منتج غير موجود" };

  const title = `${product.name} | حلم 7alm`;
  const description = product.description || `اطلب ${product.name} الآن من حلم`;
  const images = product.main_image ? [{ url: product.main_image }] : [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://7alm.com';
  const url = `${appUrl}/${product.slug}`;

  return {
    title,
    description,
    keywords: `حلم, 7alm, ${product.name}, ${product.slug}`,
    openGraph: {
      title,
      description,
      siteName: 'حلم 7alm',
      images,
      type: 'website',
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product.main_image ? [product.main_image] : [],
    },
  };
}

/**
 * Dynamic Product Landing Page — /[slug]
 * Server Component that fetches product by slug and renders the checkout funnel
 */
export default async function ProductLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await productService.getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Build gallery: main_image first, then gallery images
  const gallery = [
    ...(product.main_image ? [product.main_image] : []),
    ...(product.gallery || []),
  ];

  // Calculate discount percentage if compare_at_price exists
  const discountPercent = product.compare_at_price
    ? Math.round(
        ((product.compare_at_price - product.price) / product.compare_at_price) *
          100
      )
    : null;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 py-6 lg:py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Logo / Header */}
          <div className="flex justify-center mb-6 lg:mb-10">
            <h1 className="font-heading text-3xl font-bold text-gray-900 tracking-wider">
              حلم <span className="text-brand-500">7alm</span>
            </h1>
          </div>

          <ProductCheckoutFunnel
            product={product}
            discountPercent={discountPercent}
            gallery={gallery}
          />
        </div>
      </div>
      <Footer />
    </main>
  );
}
