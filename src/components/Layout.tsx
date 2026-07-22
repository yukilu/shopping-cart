/**
 * 页面布局组件，包含底部导航
 */
import { type ReactNode } from 'react';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-1 ${showNav ? 'pb-14' : ''}`}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
