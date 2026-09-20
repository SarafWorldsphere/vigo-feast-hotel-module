import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MenuItem, ItemAvailability, Category } from '@/data/mockData';
import { FoodImage } from '@/components/ui/FoodImage';
import {
  Plus, Search, GripVertical, Eye, EyeOff, Clock, Star, X,
  ChevronUp, ChevronDown, Pencil, Check, ImagePlus, Leaf, Drumstick, Egg,
  Loader2, Images, AlertCircle,
} from 'lucide-react';
import { ImagePickerModal } from '@/components/menu/ImagePickerModal';
import { MenuItemCreateRequest } from '@/services/api';

export function MenuPage() {
  const { menuItems, categories, loadCategories, updateMenuItem, updateMenuItemAvailability, addMenuItem, createMenuItem, reorderCategories, toggleCategoryVisible, addCategory, addToast } = useApp();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState<number | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<number | null>(null);
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState<string | null>(null);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (index: number) => setDraggedCategory(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverCategory(index);
  };
  const handleDrop = (index: number) => {
    if (draggedCategory === null || draggedCategory === index) return;
    const newCategories = [...categories];
    const [moved] = newCategories.splice(draggedCategory, 1);
    newCategories.splice(index, 0, moved);
    reorderCategories(newCategories);
    setDraggedCategory(null);
    setDragOverCategory(null);
    addToast({ type: 'success', title: 'Categories reordered', message: 'New order saved' });
  };

  const availabilityConfig: Record<ItemAvailability, { label: string; bg: string; text: string }> = {
    AVAILABLE: { label: 'Available', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' },
    OUT_OF_STOCK: { label: 'Out of Stock', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400' },
    TEMP_UNAVAILABLE: { label: 'Temp Unavailable', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
  };

  const cycleAvailability = async (item: MenuItem) => {
    const cycle: ItemAvailability[] = ['AVAILABLE', 'TEMP_UNAVAILABLE', 'OUT_OF_STOCK'];
    const nextIndex = (cycle.indexOf(item.availability) + 1) % cycle.length;
    const next = cycle[nextIndex];
    const previous = item.availability;

    // Instant optimistic UI update (0ms perceived delay)
    updateMenuItem(item.id, { availability: next });
    addToast({ type: next === 'AVAILABLE' ? 'success' : 'info', title: availabilityConfig[next].label, message: item.name });

    try {
      await updateMenuItemAvailability(item.id, next);
    } catch (error) {
      // Roll back to previous state if the request fails
      updateMenuItem(item.id, { availability: previous });
      addToast({ type: 'error', title: 'Availability update failed', message: error instanceof Error ? error.message : 'Please try again' });
    }
  };

  const handleAddItem = (newItem: Partial<MenuItem> | MenuItem) => {
    addMenuItem(newItem as MenuItem);
    setIsAddingItem(false);
    addToast({ type: 'success', title: 'Item added', message: (newItem as MenuItem).name });
  };

  const handleAddCategory = async (name: string, visible: boolean) => {
    await addCategory(name, visible);
    await loadCategories();
    setShowCategoryModal(false);
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu items..."
          className="input pl-10"
        />
      </div>

      {/* Categories */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">CATEGORIES — DRAG TO REORDER</h3>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn-ghost text-xs p-1.5"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
        {categories.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-3 text-center">
            No categories in database yet. Click &quot;Add Category&quot; to organize your menu.
          </p>
        ) : (
          <div className="space-y-1">
            {categories.map((cat, index) => (
              <div
                key={cat.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => { setDraggedCategory(null); setDragOverCategory(null); }}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                  dragOverCategory === index ? 'bg-brand-50 dark:bg-brand-500/10 border-2 border-dashed border-brand-400' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                } ${draggedCategory === index ? 'opacity-40' : ''}`}
              >
                <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing" />
                <button
                  onClick={() => toggleCategoryVisible(cat.id)}
                  className={`p-1 rounded-lg transition-colors ${cat.visible ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}
                >
                  {cat.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <span className={`text-sm font-medium flex-1 ${cat.visible ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600 line-through'}`}>
                  {cat.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{cat.itemCount} items</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category filter pills + Add Item button */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            All Items
          </button>
          {categories.filter(c => c.visible).map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.name
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsAddingItem(true)}
          className="btn-primary text-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {search ? 'No dishes match your search' : 'No menu items in database'}
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm">
              {search
                ? `No items found matching "${search}". Try searching for something else.`
                : 'Your menu has no items yet. Click "Add Item" to add dishes directly to your database.'}
            </p>
          </div>
          {!search && (
            <button
              onClick={() => setIsAddingItem(true)}
              className="btn-primary text-xs px-4 py-2 mt-1"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredItems.map((item, i) => {
            const avail = availabilityConfig[item.availability];
            return (
              <div
                key={item.id}
                className="card overflow-hidden hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5 animate-slide-up group"
                style={{ animationDelay: `${i * 30}ms` }}
              >
              <div className="relative h-32 overflow-hidden">
                <FoodImage image={item.image} name={item.name} className="w-full h-full" />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => cycleAvailability(item)}
                    disabled={updatingAvailabilityId === item.id}
                    className={`badge ${avail.bg} ${avail.text} backdrop-blur-sm shadow-sm transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-wait`}
                  >
                    {updatingAvailabilityId === item.id ? 'Updating…' : avail.label}
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs text-white font-medium">{item.rating}</span>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{item.name}</h4>
                  <button
                    onClick={() => setEditingItem(item)}
                    className="text-gray-400 hover:text-brand-500 transition-colors shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 line-clamp-1">{item.description}</p>
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-gray-900 dark:text-white">₹{item.price}</p>
                  <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Clock className="w-3 h-3" />
                    {item.prepTime}m
                  </span>
                </div>
                {item.variants && item.variants.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {item.variants.map(v => (
                      <span key={v.name} className="badge px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        {v.name} ₹{v.price}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Edit modal */}
      {editingItem && (
        <ItemEditorModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updates) => {
            updateMenuItem(editingItem.id, updates);
            setEditingItem(null);
            addToast({ type: 'success', title: 'Item updated', message: editingItem.name });
          }}
        />
      )}

      {/* Add item modal */}
      {isAddingItem && (
        <ItemEditorModal
          mode="add"
          categories={categories}
          defaultCategory={activeCategory === 'all' ? (categories[0]?.name ?? 'Main Course') : activeCategory}
          onClose={() => setIsAddingItem(false)}
          onSave={handleAddItem}
        />
      )}

      {/* Add category modal */}
      {showCategoryModal && (
        <AddCategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSave={handleAddCategory}
        />
      )}
    </div>
  );
}

function AddCategoryModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (name: string, visible: boolean) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [visible, setVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const quickPresets = ['Biryani', 'Starters', 'Main Course', 'Desserts', 'Beverages', 'Breads', 'Sides', 'Snacks'];

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Category name must not be empty');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onSave(trimmed, visible);
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative card w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-2xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="font-bold text-base text-gray-900 dark:text-white">Add Category</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Organize your menu into sections</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Category Name</label>
            <input
              className={`input mt-1.5 ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Starters"
              autoFocus
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            {error && (
              <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
              Quick Suggestions (Click to Select)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset) => {
                const isSelected = name.trim().toLowerCase() === preset.toLowerCase();
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setName(preset);
                      if (error) setError('');
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-brand-500 text-white shadow-sm ring-2 ring-brand-500/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              {visible ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {visible ? 'Visible to customers' : 'Hidden from customers'}
              </span>
            </div>
            <button
              onClick={() => setVisible(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${visible ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}
              disabled={isSubmitting}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${visible ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900">
          <button onClick={onClose} disabled={isSubmitting} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemEditorModal({ item, mode, defaultCategory, categories = [], onClose, onSave }: {
  item?: MenuItem;
  mode?: 'edit' | 'add';
  defaultCategory?: string;
  categories?: Category[];
  onClose: () => void;
  onSave: (updates: Partial<MenuItem> | MenuItem) => Promise<void> | void;
}) {
  const isAdd = mode === 'add';
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item?.price !== undefined ? String(item.price) : '');
  const [prepTime, setPrepTime] = useState(item?.prepTime !== undefined ? String(item.prepTime) : '');
  const [availability, setAvailability] = useState<ItemAvailability>(item?.availability ?? 'AVAILABLE');
  const [category, setCategory] = useState(item?.category ?? defaultCategory ?? (categories[0]?.name || 'Main Course'));
  const [image, setImage] = useState(item?.image_url || item?.image || '');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [foodType, setFoodType] = useState<'VEG' | 'NON_VEG' | 'EGG'>(item?.foodType ?? 'VEG');
  const [allergens, setAllergens] = useState<string[]>(item?.allergens ?? []);
  const [variants, setVariants] = useState(item?.variants ?? []);
  const [addOnGroups, setAddOnGroups] = useState(item?.addOnGroups ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availOptions: { value: ItemAvailability; label: string }[] = [
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'TEMP_UNAVAILABLE', label: 'Temp Unavailable' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  ];

  const foodTypeOptions: { value: 'VEG' | 'NON_VEG' | 'EGG'; label: string; icon: typeof Leaf }[] = [
    { value: 'VEG', label: 'Veg', icon: Leaf },
    { value: 'NON_VEG', label: 'Non-Veg', icon: Drumstick },
    { value: 'EGG', label: 'Egg', icon: Egg },
  ];

  const commonAllergens = ['Dairy', 'Nuts', 'Gluten', 'Soy', 'Seafood', 'Sesame'];

  const toggleAllergen = (a: string) => {
    setAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter an item name');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (price === '' || isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Please enter a valid price (e.g. 240)');
      return;
    }

    const parsedPrepTime = parseInt(prepTime, 10);
    if (prepTime === '' || isNaN(parsedPrepTime) || parsedPrepTime < 0) {
      setError('Please enter preparation time in minutes (e.g. 15)');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (isAdd) {
        const newItem: MenuItem = {
          id: `m-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: trimmedName,
          description: description.trim(),
          price: parsedPrice,
          category: category || defaultCategory || 'Main Course',
          prepTime: parsedPrepTime,
          availability,
          image: image || 'placeholder',
          image_url: image || undefined,
          rating: 5.0,
          totalOrders: 0,
          foodType,
          allergens: allergens.length > 0 ? allergens : undefined,
          variants: variants.length > 0 ? variants : undefined,
          addOnGroups: addOnGroups.length > 0 ? addOnGroups : undefined,
        };
        await onSave(newItem);
      } else {
        await onSave({
          name: trimmedName,
          description: description.trim(),
          price: parsedPrice,
          category,
          prepTime: parsedPrepTime,
          availability,
          image: image || 'placeholder',
          image_url: image || undefined,
          foodType,
          allergens,
          variants,
          addOnGroups,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save item. Please check backend connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative card w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-bold text-base text-gray-900 dark:text-white">{isAdd ? 'Add Item' : 'Edit Item'}</h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Image picker section */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Item Image</label>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                >
                  Remove image
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3.5">
              <div className="relative w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                {image ? (
                  <FoodImage image={image} name={name || 'Item preview'} className="w-full h-full" />
                ) : (
                  <ImagePlus className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                )}
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 transition-all"
                >
                  <Images className="w-3.5 h-3.5" />
                  Choose Image
                </button>
                {image ? (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono truncate max-w-[200px]" title={image}>
                    {image}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    Select from available dish photos
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</label>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
            <select
              className="input mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.length > 0 ? (
                categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))
              ) : (
                <option value={category || 'Main Course'}>
                  {category || 'Main Course'}
                </option>
              )}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
            <textarea className="input mt-1 resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Price (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                className="input mt-1"
                placeholder="e.g. 240"
                value={price}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setPrice(val);
                  }
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Prep Time (min)</label>
              <input
                type="text"
                inputMode="numeric"
                className="input mt-1"
                placeholder="e.g. 15"
                value={prepTime}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*$/.test(val)) {
                    setPrepTime(val);
                  }
                }}
              />
            </div>
          </div>

          {/* Food type */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Food Type</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {foodTypeOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFoodType(opt.value)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      foodType === opt.value
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allergens */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Allergen Tags</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {commonAllergens.map(a => (
                <button
                  key={a}
                  onClick={() => toggleAllergen(a)}
                  className={`badge px-2.5 py-1.5 text-xs transition-all ${
                    allergens.includes(a)
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Availability</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {availOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAvailability(opt.value)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    availability === opt.value
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Variants</label>
              <button
                onClick={() => setVariants([...variants, { name: '', price: 0 }])}
                className="btn-ghost text-xs p-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Variant name"
                    value={v.name}
                    onChange={(e) => setVariants(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input w-24"
                    placeholder="₹"
                    value={v.price === 0 ? '' : v.price}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setVariants(prev => prev.map((x, idx) => idx === i ? { ...x, price: val === '' ? 0 : Number(val) } : x));
                      }
                    }}
                  />
                  <button
                    onClick={() => setVariants(prev => prev.filter((_, idx) => idx !== i))}
                    className="btn-ghost p-2 text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {variants.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-600">No variants</p>}
            </div>
          </div>

          {/* Add-on groups */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Add-on Groups</label>
              <button
                onClick={() => setAddOnGroups([...addOnGroups, { name: '', min: 0, max: 1, options: [] }])}
                className="btn-ghost text-xs p-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {addOnGroups.map((group, gi) => (
                <div key={gi} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Group name (e.g. Extra Toppings)"
                      value={group.name}
                      onChange={(e) => setAddOnGroups(prev => prev.map((x, idx) => idx === gi ? { ...x, name: e.target.value } : x))}
                    />
                    <button
                      onClick={() => setAddOnGroups(prev => prev.filter((_, idx) => idx !== gi))}
                      className="btn-ghost p-2 text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400">Min</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="input py-1.5 text-sm"
                        value={group.min}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*$/.test(val)) {
                            setAddOnGroups(prev => prev.map((x, idx) => idx === gi ? { ...x, min: val === '' ? 0 : Number(val) } : x));
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400">Max</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="input py-1.5 text-sm"
                        value={group.max}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*$/.test(val)) {
                            setAddOnGroups(prev => prev.map((x, idx) => idx === gi ? { ...x, max: val === '' ? 0 : Number(val) } : x));
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {group.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          className="input flex-1 py-1.5 text-sm"
                          placeholder="Option name"
                          value={opt.name}
                          onChange={(e) => setAddOnGroups(prev => prev.map((x, idx) => idx === gi ? {
                            ...x,
                            options: x.options.map((o, oidx) => oidx === oi ? { ...o, name: e.target.value } : o)
                          } : x))}
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          className="input w-20 py-1.5 text-sm"
                          placeholder="₹"
                          value={opt.price === 0 ? '' : opt.price}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setAddOnGroups(prev => prev.map((x, idx) => idx === gi ? {
                                ...x,
                                options: x.options.map((o, oidx) => oidx === oi ? { ...o, price: val === '' ? 0 : Number(val) } : o)
                              } : x));
                            }
                          }}
                        />
                        <button
                          onClick={() => setAddOnGroups(prev => prev.map((x, idx) => idx === gi ? {
                            ...x,
                            options: x.options.filter((_, oidx) => oidx !== oi)
                          } : x))}
                          className="btn-ghost p-1.5 text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setAddOnGroups(prev => prev.map((x, idx) => idx === gi ? {
                        ...x,
                        options: [...x.options, { name: '', price: 0 }]
                      } : x))}
                      className="btn-ghost text-xs p-1"
                    >
                      <Plus className="w-3 h-3" /> Add Option
                    </button>
                  </div>
                </div>
              ))}
              {addOnGroups.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-600">No add-on groups</p>}
            </div>
          </div>
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900 z-10">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAdd ? 'Adding Item...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isAdd ? 'Add Item' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Image Picker Gallery Modal */}
      <ImagePickerModal
        isOpen={isPickerOpen}
        currentImage={image}
        onSelect={(selectedPath) => setImage(selectedPath)}
        onClose={() => setIsPickerOpen(false)}
      />
    </div>
  );
}
