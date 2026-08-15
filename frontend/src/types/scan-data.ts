// src/types/scan-data.ts

export interface DebtItem {
  type: string;
  severity: string; // 'high' | 'medium' | 'low' or unknown
  file: string;
  details: string;
}

export interface ScanData {
  repoName: string;
  scannedAt: string; // ISO 8601 date-time
  tokensSavedPercentage: number; // 0–100 inclusive
  entrypoint: string;
  inferredStack: string;
  flow: string[];
  techDebt: DebtItem[];
  humanSummary: string;
  kiroSteering: string;
}

export function isDebtItem(value: unknown): value is DebtItem {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.type === 'string' &&
    typeof obj.severity === 'string' &&
    typeof obj.file === 'string' &&
    typeof obj.details === 'string'
  );
}

export function isScanData(value: unknown): value is ScanData {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.repoName === 'string' &&
    typeof obj.scannedAt === 'string' &&
    typeof obj.tokensSavedPercentage === 'number' &&
    typeof obj.entrypoint === 'string' &&
    typeof obj.inferredStack === 'string' &&
    Array.isArray(obj.flow) &&
    obj.flow.every((item) => typeof item === 'string') &&
    Array.isArray(obj.techDebt) &&
    obj.techDebt.every(isDebtItem) &&
    typeof obj.humanSummary === 'string' &&
    typeof obj.kiroSteering === 'string'
  );
}
