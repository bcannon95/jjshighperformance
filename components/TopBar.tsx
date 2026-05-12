'use client';
import { useState } from 'react';
import { Bell, ChevronDown, User, LogOut } from 'lucide-react';

export default function TopBar() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-4 shrink-0 relative z-40">
      <div className="relative">
        <button
          onClick={() => {
            setShowNotifs(!showNotifs);
            setShowUser(false);
          }}
          className="relative p-2 text-gray-500 hover:text-gray-700"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        {showNotifs && (
          <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <button className="text-sm text-blue-500">View All</button>
              <button className="text-sm text-gray-500">
                Mark all as read
              </button>
            </div>
            <div className="px-4 py-3 border-b hover:bg-gray-50">
              <p className="text-sm font-semibold">Meal plan created</p>
              <p className="text-xs text-gray-500 mt-0.5">
                New meal plan just created.
              </p>
              <p className="text-xs text-gray-400 mt-1">19 Feb 2026</p>
            </div>
            <div className="px-4 py-3 hover:bg-gray-50">
              <p className="text-sm font-semibold">Nutrition Goal Created</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Your nutrition goal has been updated to 2600 calories per day.
              </p>
              <p className="text-xs text-gray-400 mt-1">19 Feb 2026</p>
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => {
            setShowUser(!showUser);
            setShowNotifs(false);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
        >
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">JT</span>
          </div>
          <span className="text-sm font-medium text-gray-700">
            Jaimee Tarlinton
          </span>
          <ChevronDown size={16} className="text-gray-400" />
        </button>
        {showUser && (
          <div className="absolute right-0 top-12 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
            <a
              href="/account"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700"
            >
              <User size={16} /> My Account
            </a>
            <hr className="my-1" />
            <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 w-full">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
