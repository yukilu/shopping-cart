/**
 * 确认对话框组件 - 基于 NutUI Dialog 实现
 */
import { Dialog } from '@nutui/nutui-react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      visible={open}
      title={title}
      content={message}
      confirmText={confirmText}
      cancelText={cancelText}
      closeIcon={false}
      onClose={onCancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
