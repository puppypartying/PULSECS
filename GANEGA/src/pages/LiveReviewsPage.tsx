import React, { useState, useEffect } from 'react';
import { Search, Download, RefreshCw, Filter } from 'lucide-react';
import { Review } from '../types';

interface LiveReviewsPageProps {
  onSelectReview: (id: number) => void;
}

export const LiveReviewsPage: React.FC<LiveReviewsPageProps> = ({ onSelectReview }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const fetchReviews = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '15',
      sort,
    });
    if (search) params.append('search', search);
    if (rating) params.append('rating', rating);
    if (category) params.append('category', category);
    if (priority) params.append('priority', priority);

    fetch(`/api/reviews?${params.toString()}`)
      .then(res => res.json())
      .then(d => {
        let list: Review[] = d.reviews || [];
        if (status) {
          list = list.filter(r => (r.qc_status || 'NEW') === status);
        }
        setReviews(list);
        setTotal(d.total || 0);
      })
      .catch(err => console.error('Error fetching reviews:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, [page, sort, rating, category, priority, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReviews();
  };

  const clearFilters = () => {
    setSearch('');
    setRating('');
    setCategory('');
    setPriority('');
    setStatus('');
    setSort('newest');
    setPage(1);
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4 max-w-6xl pb-10">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
            Reviews
          </h2>
          <p className="text-xs text-zinc-500">
            Incoming user reviews stream normalized from Google Play
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export/reviews"
            download
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </a>

          <button
            onClick={fetchReviews}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 transition"
            title="Refresh reviews"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Row: Minimal & Table-First */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#090d16] border border-zinc-800 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Rating */}
          <select
            value={rating}
            onChange={e => { setRating(e.target.value); setPage(1); }}
            className="bg-[#090d16] border border-zinc-800 rounded-md px-2 py-1.5 text-zinc-300 focus:outline-none"
          >
            <option value="">All Ratings</option>
            <option value="1">1 Star</option>
            <option value="2">2 Stars</option>
            <option value="3">3 Stars</option>
            <option value="4">4 Stars</option>
            <option value="5">5 Stars</option>
          </select>

          {/* Category */}
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="bg-[#090d16] border border-zinc-800 rounded-md px-2 py-1.5 text-zinc-300 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="OTP">OTP</option>
            <option value="LOGIN_AUTHENTICATION">Login</option>
            <option value="APPLICATION_CRASH">Crash</option>
            <option value="REGISTRATION">Registration</option>
            <option value="PERFORMANCE">Performance</option>
            <option value="PAYMENT">Payment</option>
            <option value="SERVICE_AVAILABILITY">Service Avail</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={e => { setPriority(e.target.value); setPage(1); }}
            className="bg-[#090d16] border border-zinc-800 rounded-md px-2 py-1.5 text-zinc-300 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
            <option value="P4">P4</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="bg-[#090d16] border border-zinc-800 rounded-md px-2 py-1.5 text-zinc-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {(search || rating || category || priority || status) && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table-First Layout: Clean, Dense, Readable */}
      <div className="bg-[#0f141f] border border-zinc-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300 border-collapse">
            <thead className="bg-[#090d16] text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-800/80">
              <tr>
                <th className="py-2.5 px-4 font-medium">Timestamp</th>
                <th className="py-2.5 px-3 font-medium">Rating</th>
                <th className="py-2.5 px-4 font-medium">Issue</th>
                <th className="py-2.5 px-3 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium">Priority</th>
                <th className="py-2.5 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                    Loading records...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                    No matching reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectReview(r.id)}
                    className="hover:bg-zinc-800/40 transition cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 px-4 text-zinc-500 whitespace-nowrap font-mono text-[11px]">
                      {formatTime(r.review_created_at)}
                    </td>

                    {/* Rating */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`font-mono font-medium ${r.star_rating <= 2 ? 'text-red-400' : 'text-zinc-400'}`}>
                        {r.star_rating}★
                      </span>
                    </td>

                    {/* Issue & Text */}
                    <td className="py-2.5 px-4 max-w-md">
                      <div className="text-zinc-200 font-medium line-clamp-1">
                        {r.detected_issue || r.review_text}
                      </div>
                      <div className="text-zinc-500 text-[11px] line-clamp-1">
                        "{r.review_text}"
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400 text-[11px]">
                      {r.issue_category || 'OTHER'}
                    </td>

                    {/* Priority */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          r.priority === 'P1'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : r.priority === 'P2'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {r.priority || 'P4'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-right text-[11px]">
                      <span
                        className={`font-mono ${
                          r.qc_status === 'RESOLVED'
                            ? 'text-emerald-400'
                            : r.qc_status === 'INVESTIGATING'
                            ? 'text-zinc-200'
                            : 'text-zinc-400'
                        }`}
                      >
                        {r.qc_status || 'NEW'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Minimal Pagination */}
        <div className="px-4 py-2 bg-[#090d16] border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span>Showing {reviews.length} of {total} reviews</span>
          <div className="flex items-center gap-1 font-mono">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-700"
            >
              Prev
            </button>
            <span className="px-2">Page {page}</span>
            <button
              disabled={reviews.length < 15}
              onClick={() => setPage(p => p + 1)}
              className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
