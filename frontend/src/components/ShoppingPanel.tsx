import { ProductResult } from '../types/events';

interface ShoppingPanelProps {
  products: ProductResult[];
  total: number;
}

export function ShoppingPanel({ products, total }: ShoppingPanelProps) {
  if (products.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center p-8">
        Furniture recommendations will appear here...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {products.map((product, i) => (
        <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-white">{product.name}</h4>
            <p className="text-xs text-gray-400">{product.source}</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-green-400">${product.price}</span>
            {product.url && (
              <a href={product.url} target="_blank" rel="noreferrer" className="block text-xs text-blue-400 hover:underline">
                View
              </a>
            )}
          </div>
        </div>
      ))}
      {total > 0 && (
        <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
          <span className="text-sm text-gray-400">Estimated Total</span>
          <span className="text-lg font-bold text-white">${total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
