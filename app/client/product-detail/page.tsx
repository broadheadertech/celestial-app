import { Suspense } from 'react';
import ProductDetailClient from './ProductDetailClient';

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="dk dk-member">
        <div className="dk-member-empty" role="status" style={{ margin: 24 }}>
          <p>Loading product details...</p>
        </div>
      </div>
    }>
      <ProductDetailClient />
    </Suspense>
  );
}
