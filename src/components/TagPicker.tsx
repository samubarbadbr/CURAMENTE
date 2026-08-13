import React, { useState } from 'react';
import { Tag } from '../types';
import { Plus, Check } from 'lucide-react';

interface TagPickerProps {
  category: 'emotion' | 'physical_symptom';
  allTags: Tag[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onAddCustomTag: (category: 'emotion' | 'physical_symptom', label: string) => Promise<void>;
  placeholder?: string;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  category,
  allTags,
  selectedTagIds,
  onToggleTag,
  onAddCustomTag,
  placeholder = 'Aggiungi nuovo...',
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const categoryTags = allTags.filter((t) => t.category === category);

  const handleAdd = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    if (!newLabel.trim()) return;
    setIsAdding(true);
    await onAddCustomTag(category, newLabel.trim());
    setNewLabel('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categoryTags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggleTag(tag.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all duration-150 border active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-[#5B67CA] text-white border-[#5B67CA] shadow-sm'
                  : 'bg-white dark:bg-[#212E27] text-[#14241B] dark:text-[#EEF3EF] border-[#C8D4CB] dark:border-[#2B3A31] hover:bg-[#E8EFEA] dark:hover:bg-[#2B3A31]'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
              <span>{tag.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd(e);
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3.5 py-2 text-xs font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:outline-none focus:ring-2 focus:ring-[#5B67CA] transition-all placeholder:text-[#6C7A72] dark:placeholder:text-[#A7B6AC]"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newLabel.trim() || isAdding}
          className="px-3.5 py-2 text-xs font-black rounded-xl bg-[#E8EFEA] dark:bg-[#2B3A31] border border-[#C8D4CB] dark:border-[#2B3A31] text-[#14241B] dark:text-[#EEF3EF] hover:bg-[#5B67CA] hover:text-white dark:hover:bg-[#5B67CA] dark:hover:text-white transition-all duration-150 active:scale-95 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Aggiungi</span>
        </button>
      </div>
    </div>
  );
};
