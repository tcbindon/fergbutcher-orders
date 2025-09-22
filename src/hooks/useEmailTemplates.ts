import { useState, useEffect } from 'react';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: 'order-received',
    name: 'Order Request Received',
    subject: 'Order Request Received - Fergbutcher',
    body: `Dear {firstName},

Thank you for your order request! We have received your order and will review it shortly.

Order Details:
{orderItems}

Collection Date: {collectionDate}
Collection Time: {collectionTime}

We will confirm your order within 24 hours.

Best regards,
Fergbutcher Team`
  },
  {
    id: 'order-confirmed',
    name: 'Order Confirmed',
    subject: 'Order Confirmed - Ready for Collection',
    body: `Dear {firstName},

Great news! Your order has been confirmed and will be ready for collection.

Order Details:
{orderItems}

Collection Date: {collectionDate}
Collection Time: {collectionTime}

Please arrive at your scheduled collection time. We look forward to seeing you!

Best regards,
Fergbutcher Team`
  },
  {
    id: 'collection-reminder',
    name: 'Collection Reminder',
    subject: 'Reminder: Order Collection Tomorrow',
    body: `Dear {firstName},

This is a friendly reminder that your order is ready for collection tomorrow.

Order Details:
{orderItems}

Collection Date: {collectionDate}
Collection Time: {collectionTime}

We look forward to seeing you!

Best regards,
Fergbutcher Team`
  }
];

export const useEmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [loading, setLoading] = useState(true);

  // Load templates from localStorage on mount
  useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem('fergbutcher_email_templates');
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      }
    } catch (error) {
      console.error('Error loading email templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save templates to localStorage whenever templates change
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('fergbutcher_email_templates', JSON.stringify(templates));
      } catch (error) {
        console.error('Error saving email templates:', error);
      }
    }
  }, [templates, loading]);

  const updateTemplate = (id: string, updates: Partial<Omit<EmailTemplate, 'id'>>) => {
    setTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, ...updates } : template
    ));
  };

  const getTemplate = (id: string) => {
    return templates.find(template => template.id === id);
  };

  const resetToDefaults = () => {
    setTemplates(defaultTemplates);
  };

  return {
    templates,
    loading,
    updateTemplate,
    getTemplate,
    resetToDefaults
  };
};