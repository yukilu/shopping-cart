/**
 * 日期选择器 - 基于 NutUI DatePicker 实现
 */
import { DatePicker as NutDatePicker } from '@nutui/nutui-react';

interface DatePickerProps {
  open: boolean;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  onClose: () => void;
}

export default function DatePicker({ open, value, onChange, onClose }: DatePickerProps) {
  const initialValue = value ? new Date(value) : new Date();

  return (
    <NutDatePicker
      visible={open}
      title="选择日期"
      type="date"
      showChinese
      value={initialValue}
      onConfirm={(_options, selectedValue) => {
        // selectedValue 是 [year, month, day] 格式
        const [year, month, day] = selectedValue;
        const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(formatted);
        onClose();
      }}
      onCancel={onClose}
      onClose={onClose}
    />
  );
}
