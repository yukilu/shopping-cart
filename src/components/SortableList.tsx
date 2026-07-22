/**
 * 可拖拽排序列表组件 - 支持原生 HTML5 拖拽和触摸事件
 */
import { useState, useRef, useCallback, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

interface SortableListProps<T> {
  items: T[];
  onReorder: (newOrder: T[]) => void;
  renderItem: (item: T, dragHandleProps: object) => ReactNode;
  getKey: (item: T) => string | number;
}

export default function SortableList<T>({ items, onReorder, renderItem, getKey }: SortableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const touchStartY = useRef<number>(0);
  const touchCurrentIndex = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const newItems = [...items];
      const [moved] = newItems.splice(dragIndex, 1);
      newItems.splice(overIndex, 0, moved);
      onReorder(newItems);
    }
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, items, onReorder]);

  const handleDragLeave = useCallback(() => {
    setOverIndex(null);
  }, []);

  // Touch support
  const getItemElement = useCallback((index: number): HTMLElement | null => {
    if (!listRef.current) return null;
    return listRef.current.children[index] as HTMLElement | null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentIndex.current = index;
    setDragIndex(index);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragIndex === null || !listRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const y = touch.clientY;
    const rect = listRef.current.getBoundingClientRect();
    const relativeY = y - rect.top + listRef.current.scrollTop;

    for (let i = 0; i < listRef.current.children.length; i++) {
      const child = listRef.current.children[i] as HTMLElement;
      const childRect = child.getBoundingClientRect();
      const childMid = childRect.top + childRect.height / 2 - rect.top + listRef.current.scrollTop;

      if (relativeY < childMid) {
        setOverIndex(i);
        return;
      }
    }
    setOverIndex(listRef.current.children.length - 1);
  }, [dragIndex]);

  const handleTouchEnd = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const newItems = [...items];
      const [moved] = newItems.splice(dragIndex, 1);
      newItems.splice(overIndex, 0, moved);
      onReorder(newItems);
    }
    setDragIndex(null);
    setOverIndex(null);
    touchCurrentIndex.current = null;
  }, [dragIndex, overIndex, items, onReorder]);

  return (
    <div className="space-y-2 mt-2" ref={listRef}>
      {items.map((item, index) => {
        const isDragging = dragIndex === index;
        const isOver = overIndex === index && dragIndex !== index;

        return (
          <div
            key={getKey(item)}
            className={`relative transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
            draggable={false}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
          >
            {/* Drop indicator line */}
            {isOver && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded-full z-10 -translate-y-1" />
            )}
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="touch-none"
            >
              {renderItem(item, {
                'aria-label': '拖拽排序',
                className: 'cursor-grab active:cursor-grabbing touch-none',
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { GripVertical };
