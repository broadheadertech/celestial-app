import { Suspense } from 'react';
import ProductDetailClient from './ProductDetailClient';

// Add generateStaticParams for static export
export async function generateStaticParams() {
  // For static export, we'll return an empty array or known product IDs
  // In a real app, you might fetch these from an API or database
  return [
    { id: 'placeholder1' },
    { id: 'placeholder2' },
    { id: 'placeholder3' },
    // Add more placeholder IDs as needed
  ];
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00] mx-auto mb-4"></div>
          <p className="text-white font-medium">Loading product details...</p>
        </div>
      </div>
    }>
      <ProductDetailClient />
    </Suspense>
  );
}