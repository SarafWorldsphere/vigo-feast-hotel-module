import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  complaintTypeConfig, complaintStatusConfig,
  Complaint, ComplaintType, ComplaintStatus,
} from '@/data/mockData';
import { complaintTypeToReason } from '@/components/refunds/RefundModal';
import { RefundStatusChip } from '@/components/ui/StatusChip';
import { useRestaurantFeedback, type FeedbackItem } from '@/hooks';
import { CountUp } from '@/components/ui/CountUp';
import { PageSkeleton } from '@/components/ui/Skeletons';
import {
  Star, MessageSquare, AlertCircle, Check, X, Send, Loader2, ArrowRight, RefreshCw, User, RotateCcw,
} from 'lucide-react';

type Tab = 'reviews' | 'complaints';

export function ReviewsPage() {
  const { addToast, complaints, loadComplaints, highlightedComplaintId } = useApp();
  const [tab, setTab] = useState<Tab>(highlightedComplaintId ? 'complaints' : 'reviews');

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  useEffect(() => {
    if (highlightedComplaintId) {
      setTab('complaints');
    }
  }, [highlightedComplaintId]);

  const {
    reviews,
    averageRating,
    totalReviews,
    distribution,
    isLoading: isFeedbackLoading,
    error: feedbackError,
    refetch: refetchFeedback,
  } = useRestaurantFeedback();

  return (
    <div className="animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 mb-4 scrollbar-thin">
        <button
          onClick={() => setTab('reviews')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            tab === 'reviews'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Star className="w-4 h-4" />
          Reviews
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            tab === 'reviews' ? 'bg-white/20 dark:bg-gray-900/20' : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            {totalReviews}
          </span>
        </button>
        <button
          onClick={() => setTab('complaints')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            tab === 'complaints'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Complaints
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            tab === 'complaints' ? 'bg-white/20 dark:bg-gray-900/20' : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            {complaints.length}
          </span>
        </button>
      </div>

      {tab === 'reviews' && (
        <ReviewsTab
          reviews={reviews}
          averageRating={averageRating}
          totalReviews={totalReviews}
          distribution={distribution}
          isLoading={isFeedbackLoading}
          error={feedbackError}
          refetch={refetchFeedback}
        />
      )}
      {tab === 'complaints' && <ComplaintsTab addToast={addToast} />}
    </div>
  );
}

function ReviewsTab({
  reviews,
  averageRating,
  totalReviews,
  distribution,
  isLoading,
  error,
  refetch,
}: {
  reviews: FeedbackItem[];
  averageRating: number;
  totalReviews: number;
  distribution: { stars: number; count: number; pct: number }[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<any>;
}) {
  if (isLoading && reviews.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="card p-4 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
          <span>Failed to load reviews: {error}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="font-semibold underline ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Rating hero + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Average rating hero */}
        <div className="card p-5 flex flex-col items-center justify-center animate-slide-up relative">
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">OVERALL RATING</span>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading}
              className="btn-ghost p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Refresh reviews"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-500' : ''}`} />
            </button>
          </div>
          <CountUp
            value={averageRating}
            decimals={1}
            duration={1200}
            className="text-5xl font-bold text-gray-900 dark:text-white"
          />
          <div className="flex items-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.round(averageRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300 dark:text-gray-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Based on <span className="font-semibold text-gray-600 dark:text-gray-300">{totalReviews}</span> review{totalReviews === 1 ? '' : 's'}
          </p>
        </div>

        {/* Distribution chart */}
        <div className="card p-5 lg:col-span-2 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">RATING DISTRIBUTION</h3>
          <div className="space-y-2.5">
            {distribution.map((d, i) => (
              <div key={d.stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12 shrink-0">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{d.stars}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${d.pct}%`, transitionDelay: `${i * 100}ms` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12 text-right shrink-0">
                  {d.count} ({d.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review feed */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="card p-12 text-center animate-fade-in">
            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">No customer reviews yet</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
              Customer ratings and feedback for delivered orders will appear here once customers submit reviews.
            </p>
          </div>
        ) : (
          reviews.map((review, i) => (
            <ReviewCard key={review.feedback_id} review={review} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review, index }: { review: FeedbackItem; index: number }) {
  const { addToast } = useApp();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDate = (iso?: string | null) => {
    if (!iso) return 'Recent';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowReply(false);
      addToast({ type: 'success', title: 'Reply saved', message: `Response noted for Order #${review.order_id}` });
    }, 600);
  };

  return (
    <div
      className="card p-4 animate-slide-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Customer (Order #{review.order_id})</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Order #{review.order_id} • {formatDate(review.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < review.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300 dark:text-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
            {review.comments && review.comments.trim() ? (
              review.comments
            ) : (
              <span className="italic text-gray-400 dark:text-gray-500 text-xs">Rated without written comments.</span>
            )}
          </p>

          {/* Reply box */}
          {showReply && (
            <div className="mt-3 animate-fade-in">
              <textarea
                className="input resize-none text-sm"
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your response or internal note..."
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowReply(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button onClick={handleReply} disabled={loading || !replyText.trim()} className="btn-primary text-xs">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Save Reply
                </button>
              </div>
            </div>
          )}

          {/* Reply button */}
          {!showReply && (
            <button
              onClick={() => setShowReply(true)}
              className="btn-ghost text-xs mt-3 p-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ComplaintsTab({ addToast }: { addToast: any }) {
  const {
    complaints,
    updateComplaint,
    loadComplaints,
    refunds,
    openRefundModal,
    viewRefund,
    highlightedComplaintId,
    setHighlightedComplaintId,
  } = useApp();

  const [filter, setFilter] = useState<ComplaintType | 'ALL'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filters: { id: ComplaintType | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'MISSING_ITEM', label: 'Missing Item' },
    { id: 'WRONG_ITEM', label: 'Wrong Item' },
    { id: 'FOOD_QUALITY', label: 'Food Quality' },
    { id: 'PACKAGING', label: 'Packaging' },
    { id: 'TEMPERATURE', label: 'Temperature' },
    { id: 'DELIVERY', label: 'Delivery' },
    { id: 'OTHER', label: 'Other' },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadComplaints();
    setTimeout(() => setIsRefreshing(false), 400);
    addToast({
      type: 'info',
      title: 'Complaints Refreshed',
      message: 'Latest complaints synchronized with backend.',
    });
  };

  const filtered = filter === 'ALL' ? complaints : complaints.filter((c) => c.type === filter);

  const handleResolve = async (id: string, resolution: string) => {
    if (!resolution.trim()) return;
    try {
      await updateComplaint(id, {
        status: 'RESOLVED',
        resolution,
        resolvedAt: new Date().toISOString(),
      });
      addToast({ type: 'success', title: 'Complaint resolved', message: 'Resolution note saved' });
    } catch {
      addToast({ type: 'error', title: 'Action failed', message: 'Could not resolve complaint' });
    }
  };

  const handleStatusChange = async (id: string, status: ComplaintStatus) => {
    let note: string | undefined = undefined;
    if (status === 'REJECTED') {
      const reason = window.prompt('Please enter a rejection reason:');
      if (!reason || !reason.trim()) {
        addToast({ type: 'warning', title: 'Rejection cancelled', message: 'A rejection reason is required' });
        return;
      }
      note = reason.trim();
    }
    try {
      await updateComplaint(id, { status, resolution: note });
      addToast({
        type: 'info',
        title: 'Status updated',
        message: `Marked as ${complaintStatusConfig[status]?.label || status}`,
      });
    } catch {
      addToast({ type: 'error', title: 'Update failed', message: 'Could not update complaint status' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with filter chips and refresh button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin flex-1 min-w-0">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Complaint cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No complaints in this category</p>
          </div>
        ) : (
          filtered.map((complaint, i) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              index={i}
              onResolve={handleResolve}
              onStatusChange={handleStatusChange}
              refunds={refunds}
              openRefundModal={openRefundModal}
              viewRefund={viewRefund}
              highlightedComplaintId={highlightedComplaintId}
              setHighlightedComplaintId={setHighlightedComplaintId}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ComplaintCard({
  complaint,
  index,
  onResolve,
  onStatusChange,
  refunds,
  openRefundModal,
  viewRefund,
  highlightedComplaintId,
  setHighlightedComplaintId,
}: {
  complaint: Complaint;
  index: number;
  onResolve: (id: string, resolution: string) => void;
  onStatusChange: (id: string, status: ComplaintStatus) => void;
  refunds: any[];
  openRefundModal: (defaults?: any) => void;
  viewRefund: (id: string) => void;
  highlightedComplaintId: string | null;
  setHighlightedComplaintId: (id: string | null) => void;
}) {
  const [showResolve, setShowResolve] = useState(false);
  const [resolutionText, setResolutionText] = useState(complaint.resolution ?? '');
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isHighlighted = highlightedComplaintId === complaint.id;

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => {
        setHighlightedComplaintId(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, setHighlightedComplaintId]);

  const typeCfg = complaintTypeConfig[complaint.type] || complaintTypeConfig.OTHER;
  const statusCfg = complaintStatusConfig[complaint.status] || complaintStatusConfig.OPEN;

  const formatDate = (iso?: string | null) => {
    if (!iso) return 'Recent';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Find linked refund by order_id / orderShortId
  const cleanOrderId = (complaint.order_id || complaint.orderShortId || '').replace(/^#/, '');
  const linkedRefund = refunds.find(
    (r) =>
      (r.order_id || '').replace(/^#/, '') === cleanOrderId ||
      (r.order_short_id || '').replace(/^#/, '') === cleanOrderId
  );

  const handleResolve = () => {
    if (!resolutionText.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowResolve(false);
      onResolve(complaint.id, resolutionText);
    }, 800);
  };

  const handleIssueRefund = () => {
    openRefundModal({
      orderId: complaint.orderShortId || complaint.order_id,
      customerName: complaint.customerName,
      reason: complaintTypeToReason[complaint.type] || '',
      complaintId: complaint.id,
    });
  };

  return (
    <div
      ref={cardRef}
      className={`card p-4 transition-all duration-300 animate-slide-up ${
        isHighlighted
          ? 'ring-2 ring-brand-500 shadow-xl shadow-brand-500/10 bg-brand-50/30 dark:bg-brand-500/10'
          : ''
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{complaint.orderShortId}</p>
              <span className={`badge px-2 py-0.5 text-[10px] ${typeCfg.bg} ${typeCfg.text}`}>
                {typeCfg.label}
              </span>
              {isHighlighted && (
                <span className="badge px-1.5 py-0.5 text-[9px] bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 font-bold animate-pulse">
                  Targeted Complaint
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {complaint.customerName} • {formatDate(complaint.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge px-2 py-0.5 text-[10px] ${statusCfg.bg} ${statusCfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${complaint.status === 'OPEN' ? 'animate-pulse' : ''}`} />
            {statusCfg.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{complaint.description}</p>

      {/* Existing resolution / rejection note */}
      {complaint.resolution && !showResolve && (
        <div
          className={`p-3 rounded-xl border mb-3 ${
            complaint.status === 'REJECTED'
              ? 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20'
              : 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            {complaint.status === 'REJECTED' ? (
              <>
                <X className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Rejection Reason</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Resolution</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{complaint.resolution}</p>
          {complaint.resolvedAt && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {complaint.status === 'REJECTED' ? 'Rejected' : 'Resolved'} on {formatDate(complaint.resolvedAt)}
            </p>
          )}
        </div>
      )}

      {/* Resolve input */}
      {showResolve && (
        <div className="animate-fade-in mb-3">
          <textarea
            className="input resize-none text-sm"
            rows={3}
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            placeholder="Describe the resolution or action taken..."
            autoFocus
          />
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowResolve(false)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={handleResolve} disabled={loading || !resolutionText.trim()} className="btn-success text-xs">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Mark Resolved
              </button>
            </div>
            {!linkedRefund && complaint.status === 'RESOLVED' && (
              <button
                type="button"
                onClick={handleIssueRefund}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-brand-500" />
                Issue Refund
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action buttons & Refund Connection */}
      {((!showResolve && complaint.status !== 'REJECTED') || linkedRefund) && (
        <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            {!showResolve && complaint.status !== 'RESOLVED' && complaint.status !== 'REJECTED' && (
              <>
                <button
                  onClick={() => setShowResolve(true)}
                  className="btn-success text-xs"
                >
                  <Check className="w-3.5 h-3.5" /> Resolve
                </button>
                {complaint.status === 'OPEN' && (
                  <button
                    onClick={() => onStatusChange(complaint.id, 'UNDER_REVIEW')}
                    className="btn-secondary text-xs"
                  >
                    Mark Under Review
                  </button>
                )}
                <button
                  onClick={() => onStatusChange(complaint.id, 'REJECTED')}
                  className="btn-secondary text-xs text-red-500"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </>
            )}
          </div>

          {/* Refund Status Badge OR Issue Refund Button */}
          <div>
            {linkedRefund ? (
              <button
                type="button"
                onClick={() => viewRefund(linkedRefund.id)}
                className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all text-xs cursor-pointer border border-gray-200 dark:border-gray-700"
                title="Click to view linked refund drawer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-brand-500 group-hover:-rotate-45 transition-transform" />
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  Refund:
                </span>
                <RefundStatusChip status={linkedRefund.status} size="sm" />
                <ArrowRight className="w-3 h-3 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (!linkedRefund && complaint.status === 'RESOLVED') ? (
              <button
                type="button"
                onClick={handleIssueRefund}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-brand-500" />
                Issue Refund
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
