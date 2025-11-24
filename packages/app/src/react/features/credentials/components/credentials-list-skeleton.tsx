/**
 * CredentialsListSkeleton Component
 * 
 * Loading skeleton for credentials list table
 */

import React from 'react';

interface CredentialsListSkeletonProps {
  /**
   * Number of skeleton rows to display
   * @default 3
   */
  rows?: number;
}

export function CredentialsListSkeleton({ rows = 3 }: CredentialsListSkeletonProps) {
  return (
    <div className="animate-pulse">
      {/* Table Header */}
      <div className="flex items-center border-b pb-2 mb-2">
        <div className="w-1/3 pr-4">
          <div className="h-3 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="w-1/3 px-4">
          <div className="h-3 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="w-1/3 pl-4 flex justify-end">
          <div className="h-3 w-16 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center border-t py-3"
        >
          {/* Connection Name Column */}
          <div className="w-1/3 pr-4">
            <div className="h-4 bg-gray-100 rounded" style={{ width: `${60 + Math.random() * 30}%` }}></div>
          </div>

          {/* Provider Column */}
          <div className="w-1/3 px-4">
            <div className="h-4 bg-gray-100 rounded" style={{ width: `${50 + Math.random() * 20}%` }}></div>
          </div>

          {/* Actions Column */}
          <div className="w-1/3 pl-4 flex justify-end gap-1">
            <div className="h-8 w-8 bg-gray-100 rounded"></div>
            <div className="h-8 w-8 bg-gray-100 rounded"></div>
          </div>
        </div>
      ))}

      {/* Loading Message */}
      <div className="flex items-center justify-center py-6 border-t">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
          <p className="text-sm">Loading connections...</p>
        </div>
      </div>
    </div>
  );
}

