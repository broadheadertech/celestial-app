'use client';

import React from 'react';
import {
  Star,
  Plus,
  Minus,
  ShoppingCart,
  Image as ImageIcon,
  Zap,
  TrendingUp
} from 'lucide-react';
import { formatCurrency, getStockStatus } from '@/lib/utils';
import { Product } from '@/types';
import Button from './Button';

interface ProductCardProps {
  product: Product;
  cartItem?: { quantity: number } | null;
  viewMode?: 'grid' | 'list';
  onAddToCart: (product: Product) => void;
  onQuantityChange: (product: Product, change: number) => void;
  onClick?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartItem,
  viewMode = 'grid',
  onAddToCart,
  onQuantityChange,
  onClick,
}) => {
  const stockStatus = getStockStatus(product.stock);
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  // Enhanced image component with better fallback
  const ProductImage = ({ className }: { className: string }) => (
    <div className={`relative ${className} bg-gradient-to-br from-secondary to-secondary/80 overflow-hidden group`}>
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-info/10 flex items-center justify-center ${product.image ? 'hidden' : ''}`}>
        <ImageIcon className="w-8 h-8 text-white/30" />
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Quick view button */}
      {onClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick(product);
          }}
          className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 flex items-center justify-center"
        >
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
            <Zap className="w-4 h-4 text-white" />
          </div>
        </button>
      )}
    </div>
  );

  // Compact badge component
  const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'discount' | 'new' | 'limited' }) => {
    const variants = {
      default: 'bg-primary/80 text-white border border-primary/20',
      discount: 'bg-red-500/80 text-white border border-red-500/20',
      new: 'bg-green-500/80 text-white border border-green-500/20',
      limited: 'bg-orange-500/80 text-white border border-orange-500/20'
    };

    return (
      <span className={`${variants[variant]} text-[9px] font-medium px-1.5 py-0.5 rounded-full shadow-sm backdrop-blur-sm`}>
        {children}
      </span>
    );
  };

  // List view layout
  if (viewMode === 'list') {
    return (
      <div className="bg-secondary/60 backdrop-blur-sm border border-white/5 rounded-xl p-3 hover:border-primary/30 hover:bg-secondary/80 transition-all duration-300 group">
        <div className="flex gap-3">
          <ProductImage className="w-16 h-16 rounded-lg flex-shrink-0" />

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              <div className="flex gap-1 flex-shrink-0">
                {product.badge && <Badge>{product.badge}</Badge>}
                {hasDiscount && <Badge variant="discount">-{discountPercent}%</Badge>}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {product.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-warning text-warning" />
                  <span className="text-white/70">{product.rating}</span>
                </div>
              )}
              <span className={`${stockStatus.textColor} font-medium`}>
                {product.stock > 5 ? `${product.stock} in stock` : stockStatus.status}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">{formatCurrency(product.price)}</span>
                {hasDiscount && (
                  <span className="text-xs text-white/50 line-through">
                    {formatCurrency(product.originalPrice!)}
                  </span>
                )}
              </div>

              {cartItem ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onQuantityChange(product, -1)}
                    className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Minus className="w-3 h-3 text-white" />
                  </button>
                  <span className="text-white font-medium text-sm min-w-[1.5rem] text-center">
                    {cartItem.quantity}
                  </span>
                  <button
                    onClick={() => onQuantityChange(product, 1)}
                    disabled={cartItem.quantity >= product.stock}
                    className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:bg-primary/80 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onAddToCart(product)}
                  disabled={product.stock === 0}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view layout - Professional e-commerce design
  return (
    <div className="bg-secondary/40 backdrop-blur-sm border border-white/5 rounded-lg overflow-hidden hover:border-primary/20 hover:bg-secondary/60 hover:shadow-lg transition-all duration-300 group">
      {/* Image Section */}
      <div className="relative">
        <ProductImage className="aspect-square" />

        {/* Badges overlay */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-start">
          <div className="flex flex-col gap-0.5">
            {product.badge && <Badge>{product.badge}</Badge>}
          </div>
          <div className="flex flex-col gap-0.5">
            {/* Stock Badge */}
            <Badge variant={
              product.stock === 0 ? 'limited' :
              product.stock <= 5 ? 'limited' :
              product.stock <= 15 ? 'new' : 'default'
            }>
              {product.stock === 0 ? 'Out' : `${product.stock} left`}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-2 space-y-1.5">
        {/* Title */}
        <h3 className="font-medium text-white text-xs line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center">
          {product.rating && (
            <div className="flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-warning text-warning" />
              <span className="text-white/60 font-medium text-[10px]">{product.rating}</span>
            </div>
          )}
        </div>

        {/* Price Section */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="font-bold text-white text-sm">{formatCurrency(product.price)}</span>
            {hasDiscount && (
              <span className="text-[10px] text-white/40 line-through">
                {formatCurrency(product.originalPrice!)}
              </span>
            )}
          </div>
        </div>

        {/* Action Section */}
        <div className="pt-0.5">
          {cartItem ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onQuantityChange(product, -1)}
                  className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Minus className="w-2.5 h-2.5 text-white" />
                </button>
                <span className="text-white font-medium text-xs min-w-[1rem] text-center">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={() => onQuantityChange(product, 1)}
                  disabled={cartItem.quantity >= product.stock}
                  className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:bg-primary/80 transition-colors"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
              <span className="text-[10px] text-primary font-medium">In Cart</span>
            </div>
          ) : (
            <Button
              size="xs"
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
              className="w-full hover:shadow-md transition-shadow"
            >
              <ShoppingCart className="w-2.5 h-2.5 mr-1" />
              {product.stock === 0 ? 'Out of Stock' : 'Add'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;