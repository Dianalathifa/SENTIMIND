// src/routes/hooks/use-router.ts

import { useMemo } from 'react';
import { useNavigate } from 'react-router'; // Pastikan ini 'react-router-dom' jika Anda menggunakannya

// ----------------------------------------------------------------------

export function useRouter() {
  const navigate = useNavigate();

  const router = useMemo(
    () => ({
      back: () => navigate(-1),
      forward: () => navigate(1),
      refresh: () => navigate(0),
      /**
       * Navigates to a new URL.
       * @param href The URL to navigate to.
       * @param state Optional: An object to pass as state to the new location.
       */
      push: (href: string, state?: any) => { // <--- PERUBAHAN DI SINI: tambahkan 'state?: any'
        navigate(href, { state }); // <--- PERUBAHAN DI SINI: teruskan objek state
      },
      /**
       * Replaces the current entry in the history stack with a new one.
       * @param href The URL to replace the current one with.
       * @param state Optional: An object to pass as state to the new location.
       */
      replace: (href: string, state?: any) => { // <--- PERUBAHAN DI SINI: tambahkan 'state?: any'
        navigate(href, { replace: true, state }); // <--- PERUBAHAN DI SINI: teruskan objek state
      },
    }),
    [navigate]
  );

  return router;
}
