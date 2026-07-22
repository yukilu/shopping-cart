/**
 * 移动端下拉刷新组件
 */
import { useState, useRef, useEffect, ReactNode, forwardRef, useImperativeHandle } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const PullRefreshInner = ({ onRefresh, children, className = '' }: PullRefreshProps, ref: React.Ref<HTMLDivElement>) => {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => scrollRef.current!);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    if (distance > 0) {
      setPulling(true);
      setPullDistance(distance * 0.5);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= 80 && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      ref={scrollRef}
      className={`h-full overflow-y-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉刷新指示器 */}
      <div
        className="w-full transition-all duration-200 flex items-center justify-center"
        style={{
          height: Math.max(0, pullDistance),
          opacity: pulling || refreshing ? 1 : 0,
        }}
      >
        {refreshing ? (
          <RefreshCw size={24} className="text-primary animate-spin" />
        ) : pullDistance >= 80 ? (
          <div className="flex items-center gap-1">
            <RefreshCw size={24} className="text-primary" />
            <span className="text-sm text-primary">释放刷新</span>
          </div>
        ) : (
          pullDistance > 0 && (
            <div className="flex items-center gap-1">
              <RefreshCw size={24} className="text-gray-400" />
              <span className="text-sm text-gray-400">下拉刷新</span>
            </div>
          )
        )}
      </div>
      {children}
    </div>
  );
};

const PullRefresh = forwardRef(PullRefreshInner);
export default PullRefresh;
