import { useEffect, useState } from 'react';

import { apiClient } from '@/shared/api';

export type AuthFeatures = { email: boolean };

let featuresPromise: Promise<AuthFeatures> | null = null;

// Server capabilities that depend on its configuration (email needs a mail provider).
// Fetched once per page load; failures read as "disabled".
const loadAuthFeatures = () => {
  featuresPromise ??= apiClient<AuthFeatures>('/auth/features', { skipAuthRefresh: true }).catch(
    () => ({ email: false }),
  );
  return featuresPromise;
};

export const resetAuthFeaturesCache = () => {
  featuresPromise = null;
};

export const useAuthFeatures = () => {
  const [features, setFeatures] = useState<AuthFeatures | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadAuthFeatures().then((value) => {
      if (!cancelled) setFeatures(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return features;
};
