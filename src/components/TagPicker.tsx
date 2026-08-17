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

  const categoryTags = React.useMemo(() => {
    const seen = new Set<string>();
    const list: Tag[] = [];
    for (const t of allTags) {
      if (!t || t.category !== category) continue;
      const normalized = t.label.trim().toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        list.push(t);
      }
    }
    return list;
  }, [allTags, category]);

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
                  ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-sm'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-solid)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-[var(--accent-btn-text)]" />}
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
          className="flex-1 px-3.5 py-2 text-xs font-bold rounded-xl border border-[var(--border-solid)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition-all placeholder:text-[var(--text-muted)]"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newLabel.trim() || isAdding}
          className="px-3.5 py-2 text-xs font-black rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] hover:bg-[var(--accent-btn)] hover:text-[var(--accent-btn-text)] transition-all duration-150 active:scale-95 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Aggiungi</span>
        </button>
      </div>
    </div>
  );
};
