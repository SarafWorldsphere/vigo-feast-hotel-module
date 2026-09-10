import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  mockReviews, reviewStats, mockComplaints,
  complaintTypeConfig, complaintStatusConfig,
  Review, Complaint, ComplaintType, ComplaintStatus,
} from '@/data/mockData';
import { CountUp } from '@/components/ui/CountUp';
import { PageSkeleton } from '@/components/ui/Skeletons';
import {
  Star, MessageSquare, AlertCircle, Check, X, Send, Loader2, ArrowRight,
} from 'lucide-react';

type Tab = 'reviews' | 'complaints';

export function ReviewsPage() {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('reviews');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <PageSkeleton />;

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
            {mockReviews.length}
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
            {mockComplaints.length}
          </span>
        </button>
      </div>

      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'complaints' && <ComplaintsTab addToast={addToast} />}
    </div>
  );
}

function ReviewsTab() {
  const stats = reviewStats;

  return (
    <div className="space-y-4">
      {/* Rating hero + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Average rating hero */}
        <div className="card p-5 flex flex-col items-center justify-center animate-slide-up">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">OVERALL RATING</p>
          <CountUp
            value={stats.averageRating}
            decimals={1}
            duration={1200}
            className="text-5xl font-bold text-gray-900 dark:text-white"
          />
          <div className="flex items-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.round(stats.averageRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300 dark:text-gray-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Based on <span className="font-semibold text-gray-600 dark:text-gray-300">{stats.totalReviews}</span> reviews
          </p>
        </div>

        {/* Distribution chart */}
        <div className="card p-5 lg:col-span-2 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">RATING DISTRIBUTION</h3>
          <div className="space-y-2.5">
            {stats.distribution.map((d, i) => (
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
        {mockReviews.map((review, i) => (
          <ReviewCard key={review.id} review={review} index={i} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const { addToast } = useApp();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState(review.response ?? '');
  const [loading, setLoading] = useState(false);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowReply(false);
      addToast({ type: 'success', title: 'Reply posted', message: `Response to ${review.customerName}` });
    }, 800);
  };

  return (
    <div
      className="card p-4 animate-slide-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {review.customerName.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{review.customerName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {review.orderShortId} • {formatDate(review.createdAt)}
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
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{review.comment}</p>

          {/* Existing response */}
          {review.response && !showReply && (
            <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">Restaurant Response</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{review.response}</p>
            </div>
          )}

          {/* Reply box */}
          {showReply && (
            <div className="mt-3 animate-fade-in">
              <textarea
                className="input resize-none text-sm"
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your response..."
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowReply(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button onClick={handleReply} disabled={loading || !replyText.trim()} className="btn-primary text-xs">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Post Reply
                </button>
              </div>
            </div>
          )}

          {/* Reply button */}
          {!showReply && !review.response && (
            <button
              onClick={() => setShowReply(true)}
              className="btn-ghost text-xs mt-3 p-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Reply
            </button>
          )}
          {!showReply && review.response && (
            <button
              onClick={() => setShowReply(true)}
              className="btn-ghost text-xs mt-3 p-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Edit Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ComplaintsTab({ addToast }: { addToast: (t: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void }) {
  const [filter, setFilter] = useState<ComplaintType | 'ALL'>('ALL');
  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);

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

  const filtered = filter === 'ALL' ? complaints : complaints.filter((c) => c.type === filter);

  const handleResolve = (id: string, resolution: string) => {
    if (!resolution.trim()) return;
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: 'RESOLVED' as ComplaintStatus, resolution, resolvedAt: new Date().toISOString() }
          : c
      )
    );
    addToast({ type: 'success', title: 'Complaint resolved', message: 'Resolution note saved' });
  };

  const handleStatusChange = (id: string, status: ComplaintStatus) => {
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    addToast({ type: 'info', title: 'Status updated', message: `Marked as ${complaintStatusConfig[status].label}` });
  };

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
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
            />
          ))
        )}
      </div>
    </div>
  );
}

function ComplaintCard({ complaint, index, onResolve, onStatusChange }: {
  complaint: Complaint;
  index: number;
  onResolve: (id: string, resolution: string) => void;
  onStatusChange: (id: string, status: ComplaintStatus) => void;
}) {
  const [showResolve, setShowResolve] = useState(false);
  const [resolutionText, setResolutionText] = useState(complaint.resolution ?? '');
  const [loading, setLoading] = useState(false);

  const typeCfg = complaintTypeConfig[complaint.type];
  const statusCfg = complaintStatusConfig[complaint.status];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleResolve = () => {
    if (!resolutionText.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowResolve(false);
      onResolve(complaint.id, resolutionText);
    }, 800);
  };

  return (
    <div
      className="card p-4 animate-slide-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{complaint.orderShortId}</p>
              <span className={`badge px-2 py-0.5 text-[10px] ${typeCfg.bg} ${typeCfg.text}`}>
                {typeCfg.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {complaint.customerName} • {formatDate(complaint.createdAt)}
            </p>
          </div>
        </div>
        <span className={`badge px-2 py-0.5 text-[10px] ${statusCfg.bg} ${statusCfg.text} shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${complaint.status === 'OPEN' ? 'animate-pulse' : ''}`} />
          {statusCfg.label}
        </span>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{complaint.description}</p>

      {/* Existing resolution */}
      {complaint.resolution && !showResolve && (
        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Resolution</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{complaint.resolution}</p>
          {complaint.resolvedAt && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Resolved on {formatDate(complaint.resolvedAt)}</p>
          )}
        </div>
      )}

      {/* Resolve input */}
      {showResolve && (
        <div className="animate-fade-in">
          <textarea
            className="input resize-none text-sm"
            rows={3}
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            placeholder="Describe the resolution or action taken..."
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowResolve(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleResolve} disabled={loading || !resolutionText.trim()} className="btn-success text-xs">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Mark Resolved
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showResolve && complaint.status !== 'RESOLVED' && complaint.status !== 'REJECTED' && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setShowResolve(true)}
            className="btn-success text-xs flex-1"
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
        </div>
      )}
    </div>
  );
}
