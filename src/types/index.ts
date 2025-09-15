export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  description: string;
  quantity: number;
  unit: string;
}

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer?: Customer;
  items: OrderItem[];
  collectionDate: string;
  collectionTime?: string;
  additionalNotes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'collected';
  createdAt: string;
  updatedAt: string;
}

export interface StaffNote {
  id: string;
  orderId: string;
  staffName: string;
  timestamp: string;
  content: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export type CalendarViewMode = 'day' | 'week' | 'month';

export type ViewType = 'dashboard' | 'customers' | 'orders' | 'calendar' | 'settings';