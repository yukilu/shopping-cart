import { Input } from '@nutui/nutui-react';
import type { Platform } from '@shared/types';

export interface PurchaseDetails {
  price: string;
  platform_id: number | null;
  shop: string;
}

interface PurchaseDetailsDialogProps {
  open: boolean;
  itemName: string;
  platforms: Platform[];
  value: PurchaseDetails;
  error: string;
  submitting: boolean;
  onChange: (value: PurchaseDetails) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function PurchaseDetailsDialog({
  open,
  itemName,
  platforms,
  value,
  error,
  submitting,
  onChange,
  onConfirm,
  onClose,
}: PurchaseDetailsDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-5"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-dialog-title"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="purchase-dialog-title" className="text-lg font-semibold text-ink">填写购买信息</h2>
        <p className="mt-1 text-sm text-gray-400">标记“{itemName}”为已购</p>

        <div className="mt-4 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm text-gray-500">实际购买价格 <span className="text-red-500">*</span></span>
            <Input
              type="number"
              value={value.price}
              onChange={(price) => onChange({ ...value, price })}
              placeholder="请输入价格"
              className="h-11 rounded-lg border-gray-200 bg-white text-sm text-ink"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-gray-500">购买平台（选填）</span>
            <div className="flex flex-wrap gap-2">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  aria-pressed={value.platform_id === platform.id}
                  onClick={() => onChange({
                    ...value,
                    platform_id: value.platform_id === platform.id ? null : platform.id,
                  })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    value.platform_id === platform.id
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {platform.name}
                </button>
              ))}
            </div>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-gray-500">购买店铺</span>
            <Input
              type="text"
              value={value.shop}
              onChange={(shop) => onChange({ ...value, shop })}
              placeholder="选填"
              className="h-11 rounded-lg border-gray-200 bg-white text-sm text-ink"
            />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className="h-11 flex-1 rounded-xl bg-primary text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? '保存中...' : '确认已购'}
          </button>
        </div>
      </section>
    </div>
  );
}
