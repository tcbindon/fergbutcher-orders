import { Order, Customer, OrderItem } from '../types';
import { toast } from '../components/Toast';

interface EmailData {
  firstName: string;
  lastName: string;
  email: string;
  orderItems: string;
  collectionDate: string;
  collectionTime: string;
  additionalNotes?: string;
  orderId: string;
}

export const populateTemplate = (template: string, data: EmailData): string => {
  return template
    .replace(/\{firstName\}/g, data.firstName)
    .replace(/\{lastName\}/g, data.lastName)
    .replace(/\{email\}/g, data.email)
    .replace(/\{orderItems\}/g, data.orderItems)
    .replace(/\{collectionDate\}/g, data.collectionDate)
    .replace(/\{collectionTime\}/g, data.collectionTime)
    .replace(/\{additionalNotes\}/g, data.additionalNotes || '')
    .replace(/\{orderId\}/g, data.orderId);
};

export const formatOrderItems = (items: OrderItem[]): string => {
  return items.map(item => 
    `• ${item.description} (${item.quantity.toLocaleString('en-NZ')} ${item.unit})`
  ).join('\n');
};

export const formatCollectionDate = (dateString: string | null): string => {
  if (!dateString) return 'No date set';
  return new Date(dateString).toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatCollectionTime = (timeString?: string): string => {
  return timeString || 'TBC';
};

export const generateEmailData = (order: Order, customer: Customer): EmailData => {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    orderItems: formatOrderItems(order.items),
    collectionDate: formatCollectionDate(order.collectionDate),
    collectionTime: formatCollectionTime(order.collectionTime),
    additionalNotes: order.additionalNotes,
    orderId: order.id
  };
};

export const generateMailtoLink = (to: string, subject: string, body: string): string => {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  
  return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
};

export const openEmailClient = (to: string, subject: string, body: string): void => {
  const mailtoLink = generateMailtoLink(to, subject, body);

  if (mailtoLink.length > 2000) {
    toast.warning('Email content is too long for mailto link. Consider shortening the order details.');
    return;
  }

  try {
    window.open(mailtoLink);
  } catch (error) {
    console.error('Error opening email client:', error);
    toast.error('Unable to open email client. Please check that you have a default email application configured.');
  }
};