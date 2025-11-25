/**
 * CredentialFormSkeleton Component
 * 
 * Loading skeleton for credential form while resolving vault keys
 */

import React from 'react';

export function CredentialFormSkeleton() {
  return (
    <div className="grid gap-4 py-4 animate-pulse">
      {/* Connection Name Field Skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <div className="h-10 w-full bg-gray-100 rounded border border-gray-200"></div>
      </div>

      {/* Credential Fields Skeleton (2-3 fields) */}
      {[1, 2].map((index) => (
        <div key={index} className="space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="h-10 w-full bg-gray-100 rounded border border-gray-200"></div>
        </div>
      ))}

      {/* Loading Message */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
          <p className="text-sm">Loading credential data...</p>
        </div>
      </div>
    </div>
  );
}

