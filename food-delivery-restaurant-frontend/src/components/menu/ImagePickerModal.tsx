import { useState, useMemo } from 'react';
import { Search, X, Check, Image as ImageIcon, Sparkles } from 'lucide-react';

export interface GalleryImage {
  id: string;
  name: string;
  path: string;
  category: 'Biryani' | 'Starters' | 'Main Course' | 'Rice' | 'Seafood';
  foodType: 'VEG' | 'NON_VEG';
}

export const AVAILABLE_MENU_IMAGES: GalleryImage[] = [
  {
    id: 'chicken-biryani',
    name: 'Chicken Dum Biryani',
    path: '/menu/chicken-biryani.webp',
    category: 'Biryani',
    foodType: 'NON_VEG',
  },
  {
    id: 'mutton-biryani',
    name: 'Royal Mutton Biryani',
    path: '/menu/mutton-biryani.webp',
    category: 'Biryani',
    foodType: 'NON_VEG',
  },
  {
    id: 'veg-biryani',
    name: 'Special Veg Biryani',
    path: '/menu/veg-biryani.webp',
    category: 'Biryani',
    foodType: 'VEG',
  },
  {
    id: 'hyderabadi-biryani',
    name: 'Hyderabadi Biryani',
    path: '/menu/hyderabadi-biryani.webp',
    category: 'Biryani',
    foodType: 'NON_VEG',
  },
  {
    id: 'chicken-pulav',
    name: 'Chicken Pulav',
    path: '/menu/chicken-pulav.webp',
    category: 'Rice',
    foodType: 'NON_VEG',
  },
  {
    id: 'tandoori-pomfret',
    name: 'Tandoori Pomfret',
    path: '/menu/tandoori-pomfret.jpg',
    category: 'Seafood',
    foodType: 'NON_VEG',
  },
  {
    id: 'chicken-rozail-kebab',
    name: 'Chicken Rozali Kebab',
    path: '/menu/chicken-rozail-kebab.webp',
    category: 'Starters',
    foodType: 'NON_VEG',
  },
  {
    id: 'chicken-malai-tikka',
    name: 'Chicken Malai Tikka',
    path: '/menu/chicken-malai-tikka.webp',
    category: 'Starters',
    foodType: 'NON_VEG',
  },
  {
    id: 'afghani-chicken',
    name: 'Afghani Chicken',
    path: '/menu/afghani-chicken.webp',
    category: 'Starters',
    foodType: 'NON_VEG',
  },
  {
    id: 'chicken-kali-mirch',
    name: 'Chicken Kali Mirch',
    path: '/menu/chicken-kali-mirch.jpg',
    category: 'Main Course',
    foodType: 'NON_VEG',
  },
];

interface ImagePickerModalProps {
  isOpen: boolean;
  currentImage?: string;
  onSelect: (imagePath: string) => void;
  onClose: () => void;
}

export function ImagePickerModal({ isOpen, currentImage, onSelect, onClose }: ImagePickerModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    return ['all', 'Biryani', 'Starters', 'Rice', 'Main Course', 'Seafood'];
  }, []);

  const filteredImages = useMemo(() => {
    return AVAILABLE_MENU_IMAGES.filter((img) => {
      const matchesCategory = selectedCategory === 'all' || img.category === selectedCategory;
      const matchesSearch =
        img.name.toLowerCase().includes(search.toLowerCase()) ||
        img.category.toLowerCase().includes(search.toLowerCase()) ||
        img.path.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative card w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-scale-in overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                Choose Dish Image
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select high-resolution food photos stored in /public/menu/
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-2.5 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes (e.g. Biryani, Kebab, Pomfret)..."
              className="input pl-9 text-xs py-2 h-9 bg-white dark:bg-gray-800"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat === 'all' ? 'All Dishes' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Image Grid */}
        <div className="p-4 overflow-y-auto max-h-[50vh] flex-1">
          {filteredImages.length === 0 ? (
            <div className="py-12 text-center">
              <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No dishes found</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try another search keyword</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredImages.map((img) => {
                const isSelected = currentImage === img.path;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      onSelect(img.path);
                      onClose();
                    }}
                    className={`group relative flex flex-col text-left rounded-xl overflow-hidden border transition-all duration-200 p-1.5 ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-50/40 dark:bg-brand-500/10'
                        : 'border-gray-200 dark:border-gray-800 hover:border-brand-400 hover:shadow-md bg-white dark:bg-gray-800/60'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img
                        src={img.path}
                        alt={img.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Selected check badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-md animate-scale-in">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Food type pill */}
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[10px] text-white">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            img.foodType === 'VEG' ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                        <span>{img.foodType === 'VEG' ? 'Veg' : 'Non-Veg'}</span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="mt-1.5 px-0.5">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {img.name}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        {img.path}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{AVAILABLE_MENU_IMAGES.length} menu images available</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-xs px-3 py-1.5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
