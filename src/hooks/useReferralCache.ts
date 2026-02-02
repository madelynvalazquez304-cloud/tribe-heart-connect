import { useState, useEffect, useCallback } from 'react';

const REFERRAL_STORAGE_KEY = 'tribeyangu_referral_code';
const REFERRAL_EXPIRY_KEY = 'tribeyangu_referral_expiry';
const REFERRAL_TTL_DAYS = 30; // 30 days cache

interface UseReferralCacheResult {
  referralCode: string | null;
  setReferralFromUrl: () => void;
  clearReferral: () => void;
  generateReferralLink: (code: string) => string;
}

export const useReferralCache = (): UseReferralCacheResult => {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Get current domain dynamically
  const getBaseUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  // Load cached referral on mount
  useEffect(() => {
    const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
    const expiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);
    
    if (stored && expiry) {
      const expiryDate = new Date(expiry);
      if (expiryDate > new Date()) {
        setReferralCode(stored);
      } else {
        // Expired, clear it
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        localStorage.removeItem(REFERRAL_EXPIRY_KEY);
      }
    }
  }, []);

  // Check URL for referral code and cache it
  const setReferralFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    
    if (ref) {
      // Store with 30-day expiry
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + REFERRAL_TTL_DAYS);
      
      localStorage.setItem(REFERRAL_STORAGE_KEY, ref);
      localStorage.setItem(REFERRAL_EXPIRY_KEY, expiryDate.toISOString());
      setReferralCode(ref);
    }
  }, []);

  const clearReferral = useCallback(() => {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    localStorage.removeItem(REFERRAL_EXPIRY_KEY);
    setReferralCode(null);
  }, []);

  const generateReferralLink = useCallback((code: string) => {
    return `${getBaseUrl()}/become-creator?ref=${code}`;
  }, [getBaseUrl]);

  return {
    referralCode,
    setReferralFromUrl,
    clearReferral,
    generateReferralLink
  };
};

// Get cached referral code (utility function)
export const getCachedReferralCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
  const expiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);
  
  if (stored && expiry) {
    const expiryDate = new Date(expiry);
    if (expiryDate > new Date()) {
      return stored;
    }
  }
  
  return null;
};
