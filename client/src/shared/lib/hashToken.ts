import { useEffect, useState } from 'react';

const readTokenFromHash = () => new URLSearchParams(window.location.hash.slice(1)).get('token');

/**
 * The one-time token that email links carry in the URL hash (`#token=…`). Read once, then
 * removed from the address bar so it isn't left in history or shared by accident. Reading and
 * clearing are separate so a double-run initializer (StrictMode) still sees the token.
 */
export const useHashToken = () => {
  const [token] = useState(readTokenFromHash);
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname + window.location.search);
    }
  }, []);
  return token;
};
