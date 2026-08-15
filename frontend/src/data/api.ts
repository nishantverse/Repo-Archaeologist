import { type ScanData, isScanData } from '../types/scan-data';
import { MOCK_SCAN_DATA } from './mock-data';

const USE_MOCK = true; // Toggle to false when backend is ready

export async function fetchScanData(): Promise<ScanData> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_SCAN_DATA;
  }

  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!isScanData(data)) {
    throw new Error('Response format is invalid');
  }
  return data;
}
