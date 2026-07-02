import CheckoutForm from "@/components/landing/CheckoutForm";
import CheckoutSummary from "@/components/landing/CheckoutSummary";
import Footer from "@/components/landing/Footer";

/**
 * Direct Checkout Page — Arabic RTL
 * High-converting single-page funnel for 7alm mobile covers
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 py-12 lg:py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Logo / Header could go here */}
          <div className="flex justify-center mb-10">
            <h1 className="font-heading text-3xl font-bold text-gray-900 tracking-wider">
              حلم <span className="text-brand-500">7alm</span>
            </h1>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Right Column (RTL) - Product Summary & Urgency */}
            <div className="lg:col-span-7 space-y-6">
              <CheckoutSummary />
            </div>

            {/* Left Column (RTL) - Checkout Form */}
            <div className="lg:col-span-5 sticky top-8">
              <CheckoutForm />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
