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
  const value = (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: currency ?? 'USD',
  });
  return value;
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
        <h1 className="text-2xl font-semibold text-jj-grey dark:text-white mb-1">
          Billing
        </h1>
        <p className="text-sm text-jj-grey/60 dark:text-gray-400">
          Subscriptions and invoices. This reflects billing records stored in the
          database, not a live payment processor feed.
        </p>
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-jj-grey/10 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-jj-grey dark:text-white">
            Subscriptions
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-jj-neutral dark:bg-gray-800 text-left text-jj-grey/60 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Billing period</th>
              <th className="px-4 py-3 font-medium">Next billing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
            {subscriptions.map((sub) => (
              <tr
                key={sub.id}
                className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3 text-jj-grey dark:text-gray-200">
                  {sub.product_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-jj-grey dark:text-gray-200 capitalize">
                  {sub.status ?? '—'}
                </td>
                <td className="px-4 py-3 text-jj-grey dark:text-gray-200">
                  {formatMoney(sub.amount_cents, sub.currency)}
                </td>
                <td className="px-4 py-3 text-jj-grey dark:text-gray-200 capitalize">
                  {sub.billing_period ?? '—'}
                </td>
                <td className="px-4 py-3 text-jj-grey dark:text-gray-200">
                  {sub.next_billing ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            Loading subscriptions...
          </div>
        )}

        {!loading && subscriptions.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            No subscriptions yet.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-jj-grey/10 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-jj-grey dark:text-white">
            Invoices
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-jj-neutral dark:bg-gray-800 text-left text-jj-grey/60 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice #</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Issued</th>
              <th className="px-4 py-3 font-medium">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3 text-jj-grey dark:text-gray-200">
                  #{invoice.id}
                </td>
                <td className="px-4 py-3 text-jj-grey dark:text-gray-200 capitalize">
                  {invoice.status ?? '—'}
                </td>
                <td className="px-4 py-3 text-jj-grey dark:text-gray-200">
                  {formatMoney(invoice.amount_cents, invoice.currency)}
                </td>
                <td className="px-4 py-3 text-jj-grey dark:text-gray-200">
                  {invoice.issued_at ?? '—'}
                </td>
                <td className="px-4 py-3 text-jj-grey dark:text-gray-200">
                  {invoice.paid_at ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            Loading invoices...
          </div>
        )}

        {!loading && invoices.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            No invoices yet.
          </div>
        )}
      </div>

      <p className="text-xs text-jj-grey/50 dark:text-gray-500">Admin view is read-only.</p>
    </div>
  );
}
