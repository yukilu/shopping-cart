/**
 * 通用弹窗组件 - 基于 NutUI Popup 实现（底部弹出）
 */
import { type ReactNode } from 'react';
import { Popup } from '@nutui/nutui-react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ open, title, onClose, children }: ModalProps) {
  return (
    <Popup
      visible={open}
      position="bottom"
      round
      closeable
      closeIconPosition="top-right"
      closeIcon={<X size={18} className="text-gray-400" />}
      title={title || ''}
      onClose={onClose}
      destroyOnClose
    >
      <div className="px-4 pb-6 pt-2">{children}</div>
    </Popup>
  );
}
