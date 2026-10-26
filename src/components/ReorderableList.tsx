import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';

interface ReorderableListProps<T> {
  items: T[];
  onReorder: (newOrder: T[]) => void;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string;
}

export default function ReorderableList<T>({
  items,
  onReorder,
  renderItem,
  getKey,
  getLabel,
}: ReorderableListProps<T>) {
  const moveItem = (index: number, offset: -1 | 1) => {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newOrder = [...items];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    onReorder(newOrder);
  };

  return (
    <div className="space-y-2 mt-2">
      {items.map((item, index) => (
        <div
          key={getKey(item)}
          className="flex items-stretch overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <div className="flex w-9 shrink-0 flex-col border-r border-gray-100 bg-gray-50/70">
            <button
              type="button"
              aria-label={`上移${getLabel(item)}`}
              title="上移"
              disabled={index === 0}
              onClick={() => moveItem(index, -1)}
              className="flex min-h-7 flex-1 items-center justify-center text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronUp size={18} />
            </button>
            <button
              type="button"
              aria-label={`下移${getLabel(item)}`}
              title="下移"
              disabled={index === items.length - 1}
              onClick={() => moveItem(index, 1)}
              className="flex min-h-7 flex-1 items-center justify-center border-t border-gray-100 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          <div className="min-w-0 flex-1">{renderItem(item)}</div>
        </div>
      ))}
    </div>
  );
}
