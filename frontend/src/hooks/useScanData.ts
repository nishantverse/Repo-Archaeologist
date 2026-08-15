import { useState, useEffect } from 'react';
import type { ScanData } from '../types/scan-data';
import { fetchScanData } from '../data/api';

export type ScanDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: ScanData };

export function useScanData(): ScanDataState {
  const [state, setState] = useState<ScanDataState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetchScanData()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'success', data });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'An unknown error occurred';
          setState({ status: 'error', message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
