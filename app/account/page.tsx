'use client';
import { useState } from 'react';
import {
  User,
  Bell,
  Lock,
  ShoppingBag,
  CreditCard,
  Settings,
} from 'lucide-react';

export default function AccountPage() {
  const [active, setActive] = useState('profile');
  const sections = [
    { id: 'profile', label: 'Profile', Icon: User },
    { id: 'password', label: 'Password', Icon: Lock },
    { id: 'purchases', label: 'Purchases', Icon: ShoppingBag },
    { id: 'transactions', label: 'Transactions', Icon: CreditCard },
  ];
  return (
    <div style={{ display: 'flex', height: '100%', background: '#f9fafb' }}>
      <div
        style={{
          width: '220px',
          background: 'white',
          borderRight: '1px solid #e5e7eb',
          padding: '24px 0',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: '700',
            padding: '0 20px 16px',
          }}
        >
          Account
        </h2>
        {sections.map((s) => {
          const Icon = s.Icon;
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 20px',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#2563eb' : '#374151',
                borderLeft: isActive
                  ? '3px solid #2563eb'
                  : '3px solid transparent',
              }}
            >
              <Icon size={16} />
              {s.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {active === 'profile' && (
          <div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '20px',
              }}
            >
              Profile Information
            </h3>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: '700',
                  margin: '0 auto 12px',
                }}
              >
                JT
              </div>
              <button
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Change Photo
              </button>
            </div>
            {[
              ['First Name', 'Jaimee'],
              ['Last Name', 'Smith'],
              ['Email', 'jaimee@email.com'],
              ['Phone', '+61 400 000 000'],
            ].map(([l, v]) => (
              <div key={l} style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    marginBottom: '4px',
                  }}
                >
                  {l}
                </label>
                <input
                  defaultValue={v}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
            <button
              style={{
                padding: '10px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Save Changes
            </button>
          </div>
        )}
        {active === 'password' && (
          <div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '20px',
              }}
            >
              Change Password
            </h3>
            {['Current Password', 'New Password', 'Confirm Password'].map(
              (l) => (
                <div key={l} style={{ marginBottom: '14px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      marginBottom: '4px',
                    }}
                  >
                    {l}
                  </label>
                  <input
                    type="password"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )
            )}
            <button
              style={{
                padding: '10px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Update Password
            </button>
          </div>
        )}
        {active === 'purchases' && (
          <div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '20px',
              }}
            >
              My Purchases
            </h3>
            {[
              {
                name: '12-Week Transformation',
                date: 'Jan 15, 2026',
                price: '--osc99',
                status: 'Active',
              },
              {
                name: 'Nutrition Coaching',
                date: 'Dec 1, 2025',
                price: '--osc49',
                status: 'Active',
              },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>{p.name}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {p.date} - {p.price}
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    background: '#dcfce7',
                    color: '#16a34a',
                    borderRadius: '20px',
                    fontSize: '12px',
                  }}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
        {active === 'transactions' && (
          <div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '20px',
              }}
            >
              Transactions
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  {['Date', 'Description', 'Amount', 'Status'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px',
                        fontSize: '13px',
                        color: '#6b7280',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    date: 'Jan 15',
                    desc: '12-Week Program',
                    amt: '---osc99',
                    st: 'Paid',
                  },
                  {
                    date: 'Dec 1',
                    desc: 'Nutrition Package',
                    amt: '---osc49',
                    st: 'Paid',
                  },
                ].map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 8px' }}>{t.date}</td>
                    <td style={{ padding: '12px 8px' }}>{t.desc}</td>
                    <td style={{ padding: '12px 8px' }}>{t.amt}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          background: '#dcfce7',
                          color: '#16a34a',
                          borderRadius: '20px',
                          fontSize: '12px',
                        }}
                      >
                        {t.st}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
