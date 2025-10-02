import { Suspense } from 'react';
import ProductDetailsClient from './ProductDetailsClient';

export default function ProductDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div>
      </div>
    }>
      <ProductDetailsClient />
    </Suspense>
  );
}
