import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  mockOffers, offerTypeConfig, mockCategories,
  Offer, OfferType, OfferStatus,
} from '@/data/mockData';
import { PageSkeleton } from '@/components/ui/Skeletons';
import {
  Plus, Pencil, Pause, Play, Trash2, X, Check, Calendar, Tag, Percent,
  IndianRupee, TrendingUp, Gift, Clock,
} from 'lucide-react';

type Tab = 'active' | 'scheduled' | 'expired';

const tabs: { id: Tab; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'expired', label: 'Expired' },
];

function getOfferStatus(offer: Offer): OfferStatus {
  const now = new Date('2026-09-06T15:00:00');
  const start = new Date(offer.startAt);
  const end = new Date(offer.endAt);
  if (now < start) return 'SCHEDULED';
  if (now > end) return 'EXPIRED';
  return 'ACTIVE';
}

export function OffersPage() {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');
  const [offers, setOffers] = useState<Offer[]>(mockOffers);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <PageSkeleton />;

  const filtered = offers.filter((o) => {
    const status = getOfferStatus(o);
    if (tab === 'active') return status === 'ACTIVE';
    if (tab === 'scheduled') return status === 'SCHEDULED';
    return status === 'EXPIRED';
  });

  const tabCounts = {
    active: offers.filter((o) => getOfferStatus(o) === 'ACTIVE').length,
    scheduled: offers.filter((o) => getOfferStatus(o) === 'SCHEDULED').length,
    expired: offers.filter((o) => getOfferStatus(o) === 'EXPIRED').length,
  };

  const handleToggle = (id: string) => {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, isActive: !o.isActive } : o)));
    const offer = offers.find((o) => o.id === id);
    addToast({ type: 'info', title: offer?.isActive ? 'Offer paused' : 'Offer activated', message: offer?.name ?? '' });
  };

  const handleDelete = (id: string) => {
    const offer = offers.find((o) => o.id === id);
    setOffers((prev) => prev.filter((o) => o.id !== id));
    addToast({ type: 'success', title: 'Offer deleted', message: offer?.name ?? '' });
  };

  const handleSave = (offer: Offer) => {
    if (editingOffer) {
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? offer : o)));
      addToast({ type: 'success', title: 'Offer updated', message: offer.name });
    } else {
      setOffers((prev) => [...prev, offer]);
      addToast({ type: 'success', title: 'Offer created', message: offer.name });
    }
    setEditingOffer(null);
    setShowCreateModal(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 scrollbar-thin">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === t.id ? 'bg-white/20 dark:bg-gray-900/20' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                {tabCounts[t.id]}
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => { setEditingOffer(null); setShowCreateModal(true); }} className="btn-primary text-sm shrink-0">
          <Plus className="w-4 h-4" /> Create Offer
        </button>
      </div>

      {/* Offer cards */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Gift className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No offers in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((offer, i) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              index={i}
              onToggle={() => handleToggle(offer.id)}
              onEdit={() => { setEditingOffer(offer); setShowCreateModal(true); }}
              onDelete={() => handleDelete(offer.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {showCreateModal && (
        <OfferEditorModal
          offer={editingOffer}
          onClose={() => { setShowCreateModal(false); setEditingOffer(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function OfferCard({ offer, index, onToggle, onEdit, onDelete }: {
  offer: Offer;
  index: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeCfg = offerTypeConfig[offer.offerType];
  const status = getOfferStatus(offer);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div
      className="card p-4 animate-slide-up hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{offer.name}</h4>
          <span className={`badge mt-1.5 px-2 py-0.5 text-[10px] ${typeCfg.bg} ${typeCfg.text}`}>
            {typeCfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="btn-ghost p-1.5 text-gray-400 hover:text-brand-500">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {status === 'ACTIVE' && (
            <button onClick={onToggle} className="btn-ghost p-1.5 text-gray-400 hover:text-amber-500">
              {offer.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={onDelete} className="btn-ghost p-1.5 text-gray-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Discount info */}
      <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
          {offer.offerType === 'PERCENTAGE' ? (
            <Percent className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          ) : (
            <IndianRupee className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {offer.offerType === 'PERCENTAGE' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {offer.maxDiscountAmount > 0 && `Max ₹${offer.maxDiscountAmount} · `}
            {offer.minimumOrderAmount > 0 ? `Min order ₹${offer.minimumOrderAmount}` : 'No minimum order'}
          </p>
        </div>
      </div>

      {/* Validity */}
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-3">
        <Calendar className="w-3.5 h-3.5" />
        {formatDate(offer.startAt)} — {formatDate(offer.endAt)}
      </div>

      {/* Applicable items/categories */}
      {(offer.applicableItems.length > 0 || offer.applicableCategories.length > 0) && (
        <div className="flex items-center gap-1 flex-wrap mb-3">
          <Tag className="w-3 h-3 text-gray-400" />
          {offer.applicableItems.map((item) => (
            <span key={item} className="badge px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              {item}
            </span>
          ))}
          {offer.applicableCategories.map((cat) => (
            <span key={cat} className="badge px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Usage stats */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Times used</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{offer.usageCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
            <IndianRupee className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Discount given</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">₹{offer.totalDiscountGiven.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Active toggle */}
      {status === 'ACTIVE' && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {offer.isActive ? 'Active & visible to customers' : 'Paused — hidden from customers'}
          </span>
          <button
            onClick={onToggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${offer.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${offer.isActive ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      )}
      {status === 'SCHEDULED' && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          Scheduled — starts {formatDate(offer.startAt)}
        </div>
      )}
      {status === 'EXPIRED' && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500 font-medium">
          <Clock className="w-3.5 h-3.5" />
          Expired on {formatDate(offer.endAt)}
        </div>
      )}
    </div>
  );
}

function OfferEditorModal({ offer, onClose, onSave }: {
  offer: Offer | null;
  onClose: () => void;
  onSave: (offer: Offer) => void;
}) {
  const isEdit = !!offer;
  const [name, setName] = useState(offer?.name ?? '');
  const [offerType, setOfferType] = useState<OfferType>(offer?.offerType ?? 'PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(offer?.discountValue ?? 10);
  const [maxDiscount, setMaxDiscount] = useState(offer?.maxDiscountAmount ?? 0);
  const [minOrder, setMinOrder] = useState(offer?.minimumOrderAmount ?? 0);
  const [startAt, setStartAt] = useState(offer?.startAt.slice(0, 16) ?? '2026-09-07T00:00');
  const [endAt, setEndAt] = useState(offer?.endAt.slice(0, 16) ?? '2026-09-14T23:59');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(offer?.applicableCategories ?? []);
  const [selectedItems, setSelectedItems] = useState<string[]>(offer?.applicableItems ?? []);

  const offerTypes: { value: OfferType; label: string }[] = [
    { value: 'PERCENTAGE', label: 'Percentage' },
    { value: 'FLAT', label: 'Flat' },
    { value: 'MIN_ORDER', label: 'Min Order' },
    { value: 'ITEM', label: 'Item' },
    { value: 'COMBO', label: 'Combo' },
    { value: 'BUY_X_GET_Y', label: 'Buy X Get Y' },
  ];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const toggleItem = (item: string) => {
    setSelectedItems((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: offer?.id ?? `o-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      offerType,
      discountValue,
      maxDiscountAmount: maxDiscount,
      minimumOrderAmount: minOrder,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      isActive: true,
      applicableItems: selectedItems,
      applicableCategories: selectedCategories,
      usageCount: offer?.usageCount ?? 0,
      totalDiscountGiven: offer?.totalDiscountGiven ?? 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative card w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-bold text-base text-gray-900 dark:text-white">{isEdit ? 'Edit Offer' : 'Create Offer'}</h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Offer Name</label>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend Special 20% Off" autoFocus />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Offer Type</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {offerTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setOfferType(t.value)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    offerType === t.value
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {offerType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount (₹)'}
              </label>
              <input type="number" className="input mt-1" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Max Discount Cap (₹)</label>
              <input type="number" className="input mt-1" value={maxDiscount} onChange={(e) => setMaxDiscount(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Minimum Order Amount (₹)</label>
            <input type="number" className="input mt-1" value={minOrder} onChange={(e) => setMinOrder(Number(e.target.value))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Start Date & Time</label>
              <input type="datetime-local" className="input mt-1" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">End Date & Time</label>
              <input type="datetime-local" className="input mt-1" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>

          {/* Applicable categories */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Applicable Categories</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {mockCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.name)}
                  className={`badge px-3 py-1.5 text-xs transition-all ${
                    selectedCategories.includes(cat.name)
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Applicable items */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Applicable Items</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Chicken Biryani', 'Margherita Pizza', 'Paneer Butter Masala', 'Masala Dosa', 'Chocolate Brownie', 'Cold Coffee'].map((item) => (
                <button
                  key={item}
                  onClick={() => toggleItem(item)}
                  className={`badge px-3 py-1.5 text-xs transition-all ${
                    selectedItems.includes(item)
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()} className="btn-primary flex-1">
            <Check className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Offer'}
          </button>
        </div>
      </div>
    </div>
  );
}
