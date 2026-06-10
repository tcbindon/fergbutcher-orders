import React from 'react';
import { Clock, CheckCircle, Package, XCircle } from 'lucide-react';

export type OrderStatus = 'pending' | 'confirmed' | 'prepared' | 'collected' | 'cancelled';

// Single source of truth for all status colors across the app.
// All values are derived from the official Fergbutcher brand palette.
export const STATUS_BADGE: Record<OrderStatus, string> = {
  pending:   'bg-fergbutcher-gold-100 text-fergbutcher-gold-700 border-fergbutcher-gold-300',
  confirmed: 'bg-fergbutcher-green-50 text-fergbutcher-green-400 border-fergbutcher-green-200',
  prepared:  'bg-fergbutcher-green-100 text-fergbutcher-green-600 border-fergbutcher-green-300',
  collected: 'bg-fergbutcher-green-600 text-white border-fergbutcher-green-700',
  cancelled: 'bg-fergbutcher-gold-100 text-fergbutcher-gold-600 border-fergbutcher-gold-200',
};

// Dot colors for calendar cells and legend indicators
export const STATUS_DOT: Record<OrderStatus, string> = {
  pending:   'bg-fergbutcher-gold-400',
  confirmed: 'bg-fergbutcher-green-300',
  prepared:  'bg-fergbutcher-green-500',
  collected: 'bg-fergbutcher-green-600',
  cancelled: 'bg-fergbutcher-gold-300',
};

export const getStatusBadge = (status: string): string =>
  STATUS_BADGE[status as OrderStatus] ?? 'bg-fergbutcher-black-100 text-fergbutcher-black-700 border-fergbutcher-black-200';

export const getStatusDot = (status: string): string =>
  STATUS_DOT[status as OrderStatus] ?? 'bg-fergbutcher-black-300';

export const getStatusIcon = (status: string, size: 'sm' | 'md' = 'sm'): React.ReactElement => {
  const cls = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  switch (status) {
    case 'pending':   return <Clock      className={`${cls} text-fergbutcher-gold-600`} />;
    case 'confirmed': return <CheckCircle className={`${cls} text-fergbutcher-green-400`} />;
    case 'prepared':  return <CheckCircle className={`${cls} text-fergbutcher-green-600`} />;
    case 'collected': return <Package    className={`${cls} text-fergbutcher-green-600`} />;
    case 'cancelled': return <XCircle    className={`${cls} text-fergbutcher-gold-500`} />;
    default:          return <Clock      className={`${cls} text-fergbutcher-black-400`} />;
  }
};
