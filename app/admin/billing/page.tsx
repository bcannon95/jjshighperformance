'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Invoice = {
  id: number;
  client_id: number | null;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  issued_at: string | null;
  paid_at: string | null;
};

type Subscription = {
  id: number;
  client_id: number | null;
  product_name: string | null;
  status: string | null;
  amount_cents: number | null;
  currency: string | null;
  billing_period: string | null;
  next_billing: string | null;
};

function formatMoney(cents: number | null, currency: string | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency ?? 'USD' });
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBilling() {
      const [{ data: invoiceRows }, { data: subscriptionRows }] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, client_id, amount_cents, currency, status, issued_at, paid_at')
          .order('issued_at', { ascending: false }),
        supabase
          .from('subscriptions')
          .select('id, client_id, product_name, status, amount_cents, currency, billing_period, next_billing')
          .order('next_billing', { ascending: true }),
      ]);

      setInvoices((invoiceRows as Invoice[]) ?? []);
      setSubscriptions((subscriptionRows as Subscription[]) ?? []);
      setLoading(false);
    }

    loadBilling();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
          Billing
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Subscriptions and invoices. This reflects billing records stored in the
          database, not a live payment processor feed.
        </p>
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-jj-grey/10 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Subscriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Amount</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Billing period</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Next billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
              {loading && [1,2].map(i => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-32" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-16" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-20" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-16" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-24" /></td>
                </tr>
              ))}
              {!loading && subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{sub.product_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200 capitalize">{sub.status ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200 hidden sm:table-cell">{formatMoney(sub.amount_cents, sub.currency)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200 capitalize hidden md:table-cell">{sub.billing_period ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200 hidden md:table-cell">{formatDate(sub.next_billing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && subscriptions.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No subscriptions yet.</div>
        )}
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-jj-grey/10 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Amount</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Issued</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
              {loading && [1,2,3].map(i => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-16" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-20" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-24" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-24" /></td>
                </tr>
              ))}
              {!loading && invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">#{invoice.id}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200 capitalize">{invoice.status ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200 hidden sm:table-cell">{formatMoney(invoice.amount_cents, invoice.currency)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200 hidden md:table-cell">{formatDate(invoice.issued_at)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200 hidden md:table-cell">{formatDate(invoice.paid_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && invoices.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No invoices yet.</div>
        )}
      </div>

      
    </div>
  );
}
