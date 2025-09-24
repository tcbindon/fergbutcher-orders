import { useState, useEffect } from 'react';
import { ChristmasProduct } from '../types';
import { useGoogleSheets } from './useGoogleSheets';
import errorLogger from '../services/errorLogger';

// Fallback Christmas products (used when Google Sheets is not available)
const fallbackChristmasProducts: ChristmasProduct[] = [
  {
    id: '1',
    name: 'Half Ham',
    unit: 'kg',
    description: 'Traditional half ham'
  },
  {
    id: '2',
    name: 'Whole Ham',
    unit: 'kg',
    description: 'Full traditional ham'
  },
  {
    id: '3',
    name: '4kg Turkey',
    unit: 'each',
    description: '4kg fresh turkey'
  },
  {
    id: '4',
    name: '6kg Turkey',
    unit: 'each',
    description: '6kg fresh turkey'
  },
  {
    id: '5',
    name: 'Dressing service',
    unit: 'service',
    description: 'Professional dressing service'
  },
  {
    id: '6',
    name: 'Gravy',
    unit: 'portion',
    description: 'Traditional gravy'
  },
  {
    id: '7',
    name: 'Stuffing',
    unit: 'portion',
    description: 'Traditional stuffing'
  },
  {
    id: '8',
    name: 'Pigs in Blankets',
    unit: 'kg',
    description: 'Sausages wrapped in bacon'
  }
];

export const useChristmasProducts = () => {
  const [products, setProducts] = useState<ChristmasProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const { isConnected, fetchChristmasProducts } = useGoogleSheets();

  // Cache key for localStorage
  const CACHE_KEY = 'fergbutcher_christmas_products';
  const CACHE_EXPIRY_KEY = 'fergbutcher_christmas_products_expiry';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Load products from cache or fetch from Google Sheets
  useEffect(() => {
    loadProducts();
  }, [isConnected]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      // First, try to load from cache
      const cachedProducts = loadFromCache();
      if (cachedProducts) {
        setProducts(cachedProducts);
        setLastFetch(new Date(localStorage.getItem(CACHE_EXPIRY_KEY) || Date.now()));
        setLoading(false);
        errorLogger.debug('Loaded Christmas products from cache');
        return;
      }

      // If Google Sheets is connected, try to fetch from there
      if (isConnected) {
        try {
          const fetchedProducts = await fetchChristmasProducts();
          if (fetchedProducts && fetchedProducts.length > 0) {
            setProducts(fetchedProducts);
            saveToCache(fetchedProducts);
            setLastFetch(new Date());
            errorLogger.info(`Fetched ${fetchedProducts.length} Christmas products from Google Sheets`);
          } else {
            // If no products returned, use fallback
            setProducts(fallbackChristmasProducts);
            errorLogger.warn('No Christmas products found in Google Sheets, using fallback products');
          }
        } catch (fetchError) {
          console.error('Error fetching Christmas products:', fetchError);
          setError('Failed to fetch Christmas products from Google Sheets');
          setProducts(fallbackChristmasProducts);
          errorLogger.error('Failed to fetch Christmas products, using fallback', fetchError);
        }
      } else {
        // If not connected to Google Sheets, use fallback products
        setProducts(fallbackChristmasProducts);
        errorLogger.info('Google Sheets not connected, using fallback Christmas products');
      }
    } catch (err) {
      console.error('Error loading Christmas products:', err);
      setError('Failed to load Christmas products');
      setProducts(fallbackChristmasProducts);
      errorLogger.error('Error loading Christmas products, using fallback', err);
    } finally {
      setLoading(false);
    }
  };

  // Load products from localStorage cache
  const loadFromCache = (): ChristmasProduct[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
      
      if (cached && expiry) {
        const expiryTime = parseInt(expiry);
        const now = Date.now();
        
        if (now < expiryTime) {
          return JSON.parse(cached);
        } else {
          // Cache expired, remove it
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_EXPIRY_KEY);
        }
      }
    } catch (err) {
      console.error('Error loading from cache:', err);
      // Clear corrupted cache
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
    }
    
    return null;
  };

  // Save products to localStorage cache
  const saveToCache = (productsToCache: ChristmasProduct[]) => {
    try {
      const expiry = Date.now() + CACHE_DURATION;
      localStorage.setItem(CACHE_KEY, JSON.stringify(productsToCache));
      localStorage.setItem(CACHE_EXPIRY_KEY, expiry.toString());
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  };

  // Manually refresh products from Google Sheets
  const refreshProducts = async (): Promise<boolean> => {
    if (!isConnected) {
      setError('Google Sheets not connected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedProducts = await fetchChristmasProducts();
      if (fetchedProducts && fetchedProducts.length > 0) {
        setProducts(fetchedProducts);
        saveToCache(fetchedProducts);
        setLastFetch(new Date());
        errorLogger.info(`Refreshed ${fetchedProducts.length} Christmas products from Google Sheets`);
        return true;
      } else {
        setError('No Christmas products found in Google Sheets');
        return false;
      }
    } catch (err) {
      console.error('Error refreshing Christmas products:', err);
      setError('Failed to refresh Christmas products');
      errorLogger.error('Failed to refresh Christmas products', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get a specific Christmas product by ID
  const getProductById = (id: string): ChristmasProduct | undefined => {
    return products.find(product => product.id === id);
  };

  // Get a specific Christmas product by name
  const getProductByName = (name: string): ChristmasProduct | undefined => {
    return products.find(product => product.name.toLowerCase() === name.toLowerCase());
  };

  // Check if an item is a Christmas product
  const isChristmasProduct = (itemName: string): boolean => {
    return products.some(product => product.name.toLowerCase() === itemName.toLowerCase());
  };

  // Get Christmas product for an order item
  const getChristmasProductForItem = (itemName: string): ChristmasProduct | undefined => {
    return products.find(product => product.name.toLowerCase() === itemName.toLowerCase());
  };

  // Clear cache (useful for debugging or forcing refresh)
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
    errorLogger.debug('Christmas products cache cleared');
  };

  // Check if cache is expired
  const isCacheExpired = (): boolean => {
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    if (!expiry) return true;
    
    return Date.now() >= parseInt(expiry);
  };

  return {
    products,
    loading,
    error,
    lastFetch,
    refreshProducts,
    getProductById,
    getProductByName,
    isChristmasProduct,
    getChristmasProductForItem,
    clearCache,
    isCacheExpired,
    isUsingFallback: !isConnected || products === fallbackChristmasProducts
  };
};