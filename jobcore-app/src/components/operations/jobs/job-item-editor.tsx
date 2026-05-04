"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface JobItemDraft {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface JobItemEditorProps {
  initialItems?: JobItemDraft[];
  name?: string;
}

export function JobItemEditor({ initialItems = [], name = "items" }: JobItemEditorProps) {
  const [items, setItems] = useState<JobItemDraft[]>(
    initialItems.length > 0
      ? initialItems
      : [{ key: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" }]
  );

  const add = () =>
    setItems((prev) => [...prev, { key: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" }]);

  const remove = (key: string) =>
    setItems((prev) => prev.filter((i) => i.key !== key));

  const update = (key: string, field: keyof Omit<JobItemDraft, "key">, value: string) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));

  const total = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      {/* Header row */}
      <div className="grid grid-cols-12 gap-2 px-1">
        <span className="col-span-6 text-xs font-medium text-[#6b7280]">Description</span>
        <span className="col-span-2 text-xs font-medium text-[#6b7280]">Qty</span>
        <span className="col-span-3 text-xs font-medium text-[#6b7280]">Unit Price</span>
        <span className="col-span-1" />
      </div>

      {items.map((item) => {
        const subtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
        return (
          <div key={item.key} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-6">
              <Input
                value={item.description}
                onChange={(e) => update(item.key, "description", e.target.value)}
                placeholder="Labor, materials…"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="0"
                step="0.001"
                value={item.quantity}
                onChange={(e) => update(item.key, "quantity", e.target.value)}
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => update(item.key, "unitPrice", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <button
                type="button"
                onClick={() => remove(item.key)}
                disabled={items.length === 1}
                className="p-1.5 rounded text-[#9ca3af] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {subtotal > 0 && (
              <div className="col-span-12 text-right text-xs text-[#9ca3af] pr-8 -mt-1">
                {formatCurrency(subtotal)}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add item
        </Button>
        {total > 0 && (
          <p className="text-sm font-semibold text-[#0a0a0a]">
            Total: {formatCurrency(total)}
          </p>
        )}
      </div>
    </div>
  );
}
