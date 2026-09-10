import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ChefHat,
  Check,
  ArrowLeft,
  ArrowRight,
  Store,
  FileText,
  UtensilsCrossed,
  UploadCloud,
  ClipboardCheck,
  Building2,
  CreditCard,
  Hash,
  FileCheck,
  Image as ImageIcon,
  Pencil,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { apiGetCuisines, CuisineOption, RegistrationSubmitRequest } from '@/services/api';

// 5 Steps (Owner details decoupled and shown as read-only summary chip at top)
const steps = [
  { id: 0, label: 'Restaurant', icon: Store },
  { id: 1, label: 'Legal', icon: FileText },
  { id: 2, label: 'Cuisines', icon: UtensilsCrossed },
  { id: 3, label: 'Documents', icon: UploadCloud },
  { id: 4, label: 'Review', icon: ClipboardCheck },
];

interface FormData {
  // Restaurant (Step 0)
  restaurantName: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;

  // Legal & Bank (Step 1)
  fssai: string;
  gst: string;
  pan: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;

  // Cuisines (Step 2)
  cuisines: string[];

  // Documents (Step 3)
  documents: {
    fssaiCert: boolean;
    panCard: boolean;
    cheque: boolean;
    photo: boolean;
  };
}

export function RegisterPage() {
  const { owner, setAuthView, submitRegistration, darkMode, toggleDarkMode } = useApp();

  const [step, setStep] = useState(0);
  const [availableCuisines, setAvailableCuisines] = useState<CuisineOption[]>([]);
  const [loadingCuisines, setLoadingCuisines] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // In-memory local form state (starts directly at Restaurant details)
  const [data, setData] = useState<FormData>(() => ({
    restaurantName: '',
    description: '',
    address: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    fssai: '',
    gst: '',
    pan: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
    cuisines: [],
    documents: { fssaiCert: false, panCard: false, cheque: false, photo: false },
  }));

  // Fetch available cuisines via GET /api/v1/cuisines
  useEffect(() => {
    let isMounted = true;
    setLoadingCuisines(true);
    apiGetCuisines()
      .then((list) => {
        if (isMounted) {
          setAvailableCuisines(list);
          if (data.cuisines.length === 0 && list.length >= 2) {
            setData((prev) => ({
              ...prev,
              cuisines: [list[0].id, list[1].id],
            }));
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoadingCuisines(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const update = (field: keyof FormData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const toggleCuisine = (cuisineId: string) => {
    setData((prev) => {
      const exists = prev.cuisines.includes(cuisineId);
      const next = exists
        ? prev.cuisines.filter((id) => id !== cuisineId)
        : [...prev.cuisines, cuisineId];
      return { ...prev, cuisines: next };
    });
    setError('');
  };

  const validateStep = (s: number): boolean => {
    // Step 0: Restaurant Details
    if (s === 0) {
      if (!data.restaurantName.trim()) {
        setError('Restaurant name is required');
        return false;
      }
      if (!data.address.trim()) {
        setError('Street address is required');
        return false;
      }
      if (!data.city.trim()) {
        setError('City is required');
        return false;
      }
      if (data.pincode.trim().length < 6) {
        setError('Valid 6-digit postal code / pincode is required');
        return false;
      }
    }
    // Step 1: Legal & Bank
    if (s === 1) {
      if (!data.fssai.trim()) {
        setError('FSSAI license number is required');
        return false;
      }
      if (!data.pan.trim()) {
        setError('PAN number is required');
        return false;
      }
      if (!data.bankName.trim()) {
        setError('Bank name is required');
        return false;
      }
      if (!data.accountNumber.trim()) {
        setError('Account number is required');
        return false;
      }
      if (!data.ifsc.trim()) {
        setError('IFSC code is required');
        return false;
      }
    }
    // Step 2: Cuisines
    if (s === 2) {
      if (data.cuisines.length === 0) {
        setError('Select at least one cuisine type for your restaurant');
        return false;
      }
    }
    // Step 3: Documents
    if (s === 3) {
      const d = data.documents;
      if (!d.fssaiCert || !d.panCard || !d.cheque || !d.photo) {
        setError('Please upload all 4 required verification documents');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setError('');
    setStep((s) => Math.min(s + 1, steps.length - 1));
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Action on Step 4 (Review): calls POST /api/v1/restaurants/registration/submit
  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);

    const payload: RegistrationSubmitRequest = {
      restaurant: {
        name: data.restaurantName,
        description: data.description || undefined,
        address_line1: data.address,
        city: data.city,
        state: data.state || 'Karnataka',
        postal_code: data.pincode,
        phone: owner?.phone && owner.phone.trim().length >= 10 ? owner.phone.trim() : undefined,
        email: owner?.email && owner.email.includes('@') ? owner.email.trim() : undefined,
      },
      business_details: {
        fssai_license_no: data.fssai.trim(),
        gst_number: data.gst.trim() || undefined,
        pan_number: data.pan.trim().toUpperCase(),
        bank_name: data.bankName.trim(),
        account_number: data.accountNumber.trim(),
        ifsc_code: data.ifsc.trim().toUpperCase(),
        upi_id: data.upiId.trim() || undefined,
      },
      cuisine_ids: data.cuisines,
      documents: [
        {
          document_type: 'FSSAI_CERTIFICATE',
          file_url: 'https://storage.narayani.com/docs/fssai_certificate.pdf',
          file_name: 'fssai_certificate.pdf',
          mime_type: 'application/pdf',
        },
        {
          document_type: 'PAN_CARD',
          file_url: 'https://storage.narayani.com/docs/pan_card.jpg',
          file_name: 'pan_card.jpg',
          mime_type: 'image/jpeg',
        },
        {
          document_type: 'BANK_PROOF',
          file_url: 'https://storage.narayani.com/docs/cancelled_cheque.pdf',
          file_name: 'cancelled_cheque.pdf',
          mime_type: 'application/pdf',
        },
        {
          document_type: 'RESTAURANT_PHOTO',
          file_url: 'https://storage.narayani.com/docs/restaurant_photo.jpg',
          file_name: 'restaurant_photo.jpg',
          mime_type: 'image/jpeg',
        },
      ],
    };

    try {
      await submitRegistration(payload);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve cuisine names for review
  const selectedCuisineNames = availableCuisines
    .filter((c) => data.cuisines.includes(c.id))
    .map((c) => c.name);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
      </div>

      {/* Dark mode button */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 btn-ghost p-2 z-10"
        aria-label="Toggle theme"
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      <div className="relative w-full max-w-xl animate-slide-up flex flex-col max-h-[calc(100vh-4rem)]">
        {/* Header with Narayani logo mark */}
        <div className="flex flex-col items-center mb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-elevated mb-2">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Restaurant Registration Wizard</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Step {step + 1} of {steps.length}: {steps[step].label}
          </p>
        </div>

        {/* Logged-In Owner Read-Only Identity Summary Chip (decoupled from wizard form) */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
              {owner?.name ? owner.name.charAt(0).toUpperCase() : 'O'}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-gray-900 dark:text-white truncate block">
                {owner?.name || 'Rahul Sharma'}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate block">
                {owner?.email || 'owner@restaurant.com'} • {owner?.phone || '+91 98765 43210'}
              </span>
            </div>
          </div>
          <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] shrink-0 font-medium">
            <UserCheck className="w-3 h-3 text-emerald-500" /> Owner Verified
          </span>
        </div>

        {/* 5-Step Stepper Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isDone = i < step;
              const isCurrent = i === step;
              const isLast = i === steps.length - 1;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (i < step) setStep(i);
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isDone
                          ? 'bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600'
                          : isCurrent
                          ? 'bg-brand-500 text-white ring-4 ring-brand-500/20'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Icon className="w-4 h-4" />}
                    </button>
                    <span
                      className={`text-[10px] font-medium hidden sm:block ${
                        isCurrent
                          ? 'text-gray-900 dark:text-white font-semibold'
                          : isDone
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`flex-1 h-0.5 mx-1.5 sm:mx-2 mb-4 transition-all duration-300 ${
                        i < step ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Form Card */}
        <div className="card flex flex-col overflow-hidden flex-1 min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
            {/* Step 0: Restaurant Details (Starts directly here) */}
            {step === 0 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Restaurant Name *</label>
                  <input
                    className="input mt-1"
                    value={data.restaurantName}
                    onChange={(e) => update('restaurantName', e.target.value)}
                    placeholder="e.g. Narayani Kitchen & Sweets"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description (Optional)</label>
                  <textarea
                    className="input mt-1 resize-none"
                    rows={2}
                    value={data.description}
                    onChange={(e) => update('description', e.target.value)}
                    placeholder="Authentic North & South Indian delicacies made fresh daily."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Street Address *</label>
                  <textarea
                    className="input mt-1 resize-none"
                    rows={2}
                    value={data.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="Shop No. 4, MG Road, 2nd Cross"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">City *</label>
                    <input
                      className="input mt-1"
                      value={data.city}
                      onChange={(e) => update('city', e.target.value)}
                      placeholder="Bangalore"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">State</label>
                    <input
                      className="input mt-1"
                      value={data.state}
                      onChange={(e) => update('state', e.target.value)}
                      placeholder="Karnataka"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Postal Code / Pincode *</label>
                  <input
                    className="input mt-1"
                    value={data.pincode}
                    onChange={(e) => update('pincode', e.target.value)}
                    placeholder="560001"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Legal & Bank */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">FSSAI License No. *</label>
                    <input
                      className="input mt-1"
                      value={data.fssai}
                      onChange={(e) => update('fssai', e.target.value)}
                      placeholder="12345678901234"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">GST Number (Optional)</label>
                    <input
                      className="input mt-1"
                      value={data.gst}
                      onChange={(e) => update('gst', e.target.value)}
                      placeholder="29ABCDE1234F1Z5"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">PAN Number *</label>
                  <input
                    className="input mt-1"
                    value={data.pan}
                    onChange={(e) => update('pan', e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                  />
                </div>

                {/* Bank Details for Settlements Card */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider">
                      BANK DETAILS FOR SETTLEMENTS
                    </h4>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Bank Name *</label>
                    <input
                      className="input mt-1"
                      value={data.bankName}
                      onChange={(e) => update('bankName', e.target.value)}
                      placeholder="HDFC Bank"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Account Number *</label>
                      <input
                        className="input mt-1"
                        value={data.accountNumber}
                        onChange={(e) => update('accountNumber', e.target.value)}
                        placeholder="50100234567890"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">IFSC Code *</label>
                      <input
                        className="input mt-1"
                        value={data.ifsc}
                        onChange={(e) => update('ifsc', e.target.value.toUpperCase())}
                        placeholder="HDFC0001234"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">UPI ID (Optional)</label>
                    <input
                      className="input mt-1"
                      value={data.upiId}
                      onChange={(e) => update('upiId', e.target.value)}
                      placeholder="narayani@hdfcbank"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Cuisines */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Select Cuisines</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Choose the cuisine categories offered by your restaurant. Select at least one.
                  </p>
                </div>

                {loadingCuisines ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {availableCuisines.map((c) => {
                      const isSelected = data.cuisines.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCuisine(c.id)}
                          className={`badge px-3.5 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-brand-500 text-white shadow-sm ring-2 ring-brand-500/30'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span>Options loaded from /api/v1/cuisines</span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">
                    {data.cuisines.length} selected
                  </span>
                </div>
              </div>
            )}

            {/* Step 3: Document Upload */}
            {step === 3 && (
              <div className="space-y-3 animate-fade-in">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Upload Verification Documents</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Click each item to simulate uploading required compliance documents.
                  </p>
                </div>

                <UploadCard
                  label="FSSAI Certificate"
                  description="Food safety license certificate (PDF/JPG)"
                  icon={FileCheck}
                  uploaded={data.documents.fssaiCert}
                  onUpload={() => update('documents', { ...data.documents, fssaiCert: true })}
                />
                <UploadCard
                  label="PAN Card"
                  description="Business or proprietor PAN card"
                  icon={CreditCard}
                  uploaded={data.documents.panCard}
                  onUpload={() => update('documents', { ...data.documents, panCard: true })}
                />
                <UploadCard
                  label="Cancelled Cheque / Bank Proof"
                  description="Account number & IFSC proof"
                  icon={Hash}
                  uploaded={data.documents.cheque}
                  onUpload={() => update('documents', { ...data.documents, cheque: true })}
                />
                <UploadCard
                  label="Restaurant Photo / Logo"
                  description="Storefront photo or brand logo"
                  icon={ImageIcon}
                  uploaded={data.documents.photo}
                  onUpload={() => update('documents', { ...data.documents, photo: true })}
                />
              </div>
            )}

            {/* Step 4: Review & Final Submit */}
            {step === 4 && (
              <div className="space-y-3 animate-fade-in">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                    Review your application summary before final submission. All restaurant details, legal filings, cuisines, and documents will be submitted together in one transaction.
                  </p>
                </div>

                {/* Linked Owner Summary Card (Read-only) */}
                <div className="card p-4 bg-gray-50/70 dark:bg-gray-800/40">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                      OWNER ACCOUNT (AUTHENTICATED)
                    </h4>
                    <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]">
                      Verified
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400 dark:text-gray-500">Name</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{owner?.name || 'Rahul Sharma'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 dark:text-gray-500">Email</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{owner?.email || 'owner@restaurant.com'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 dark:text-gray-500">Phone</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{owner?.phone || '+91 98765 43210'}</span>
                    </div>
                  </div>
                </div>

                <ReviewSection
                  title="Restaurant Details"
                  onEdit={() => setStep(0)}
                  rows={[
                    { label: 'Name', value: data.restaurantName },
                    { label: 'Description', value: data.description || 'Not provided' },
                    { label: 'Address', value: `${data.address}, ${data.city} (${data.state}) - ${data.pincode}` },
                  ]}
                />

                <ReviewSection
                  title="Legal & Settlement"
                  onEdit={() => setStep(1)}
                  rows={[
                    { label: 'FSSAI License', value: data.fssai },
                    { label: 'GST Number', value: data.gst || 'Not provided' },
                    { label: 'PAN Number', value: data.pan },
                    { label: 'Settlement Bank', value: `${data.bankName} • ${data.accountNumber} (${data.ifsc})` },
                    { label: 'UPI ID', value: data.upiId || 'Not provided' },
                  ]}
                />

                <ReviewSection
                  title="Selected Cuisines"
                  onEdit={() => setStep(2)}
                  rows={[
                    {
                      label: 'Cuisines',
                      value: selectedCuisineNames.length > 0 ? selectedCuisineNames.join(', ') : 'None selected',
                    },
                  ]}
                />

                <ReviewSection
                  title="Uploaded Documents"
                  onEdit={() => setStep(3)}
                  rows={[
                    { label: 'FSSAI Certificate', value: data.documents.fssaiCert ? 'Uploaded' : 'Pending' },
                    { label: 'PAN Card', value: data.documents.panCard ? 'Uploaded' : 'Pending' },
                    { label: 'Bank Proof', value: data.documents.cheque ? 'Uploaded' : 'Pending' },
                    { label: 'Restaurant Photo', value: data.documents.photo ? 'Uploaded' : 'Pending' },
                  ]}
                />
              </div>
            )}

            {error && <p className="text-xs text-red-500 mt-3 animate-fade-in font-medium">{error}</p>}
          </div>

          {/* Wizard Footer Navigation */}
          <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="btn-secondary flex-1"
                disabled={submitting}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className="btn-secondary flex-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary flex-1"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Submit for Verification
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Already have an account?{' '}
          <button
            onClick={() => setAuthView('login')}
            className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

function UploadCard({
  label,
  description,
  icon: Icon,
  uploaded,
  onUpload,
}: {
  label: string;
  description?: string;
  icon: typeof FileCheck;
  uploaded: boolean;
  onUpload: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onUpload}
      className={`w-full p-4 rounded-xl border-2 border-dashed transition-all text-left ${
        uploaded
          ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5'
          : 'border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-500/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            uploaded ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          {uploaded ? <Check className="w-5 h-5 text-emerald-500" /> : <Icon className="w-5 h-5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold ${
              uploaded ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'
            }`}
          >
            {label}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {uploaded ? 'Uploaded successfully' : description || 'Tap to upload (mock)'}
          </p>
        </div>
        {!uploaded && <UploadCloud className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
      </div>
    </button>
  );
}

function ReviewSection({
  title,
  onEdit,
  rows,
}: {
  title: string;
  onEdit: () => void;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">
          {title.toUpperCase()}
        </h4>
        <button
          type="button"
          onClick={onEdit}
          className="btn-ghost text-xs p-1 gap-1 text-brand-600 dark:text-brand-400"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start justify-between gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{r.label}</span>
            <span className="text-xs font-medium text-gray-900 dark:text-white text-right">{r.value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
