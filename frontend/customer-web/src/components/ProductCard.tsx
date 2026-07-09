import { Link } from 'react-router-dom';
import { Product } from '../types';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const image = product.images[0] || 'https://picsum.photos/400/400';
  const hasDiscount = product.compareAtPrice > product.price;

  return (
    <Link to={`/products/${product.slug}`} className="card group overflow-hidden transition hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img src={image} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
        {product.featured && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">Featured</span>
        )}
        {hasDiscount && (
          <span className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">Sale</span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{product.categoryName}</p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-gray-900 group-hover:text-brand-600">{product.name}</h3>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">${product.compareAtPrice.toFixed(2)}</span>
          )}
        </div>
        {product.reviewCount > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-amber-500">
            {'★'.repeat(Math.round(product.averageRating))}
            <span className="text-gray-400">({product.reviewCount})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
