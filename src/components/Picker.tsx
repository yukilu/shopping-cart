/**
 * Picker 选择器 - 基于 NutUI Picker 实现
 */
import { Picker as NutPicker, type PickerOptions, type PickerValue } from '@nutui/nutui-react';

interface PickerOption {
  label: string;
  value: string | number;
}

interface PickerProps {
  open: boolean;
  title?: string;
  options: PickerOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  onClose: () => void;
}

export default function Picker({ open, title, options, value, onChange, onClose }: PickerProps) {
  // NutUI Picker 的 options 是 PickerOptions[] (二维数组，支持多列)
  // 我们的单列选择器需要包装成 [[...options]]
  const nutOptions: PickerOptions[] = [options.map((o) => ({ label: o.label, value: o.value }))];

  // value 也需要包装成数组
  const nutValue: PickerValue[] = [value];

  return (
    <NutPicker
      visible={open}
      title={title || '请选择'}
      options={nutOptions}
      value={nutValue}
      onConfirm={(_selectedOptions, selectedValue) => {
        const v = selectedValue[0];
        if (v !== null && v !== undefined) {
          onChange(v);
        }
        onClose();
      }}
      onCancel={onClose}
      onClose={onClose}
    />
  );
}
