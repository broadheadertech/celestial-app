'use client';

import React, { Suspense } from 'react';
import { Loader } from 'lucide-react';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import { ProductFormContentInner } from './ProductFormContent';

function ProductFormContent() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ProductFormContentInner />
    </SafeAreaProvider>
  );
}

export default function ProductFormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted">Loading product form...</p>
          </div>
        </div>
      </div>
    }>
      <ProductFormContent />
    </Suspense>
  );
}
