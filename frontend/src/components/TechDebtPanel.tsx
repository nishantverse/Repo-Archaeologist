import type { DebtItem } from '../types/scan-data';

interface TechDebtPanelProps {
  techDebt: DebtItem[];
}

function getSeverityClasses(severity: string): { row: string; indicator: string } {
  switch (severity) {
    case 'high':
      return { row: 'bg-red-400', indicator: 'bg-red-600 text-white' };
    case 'medium':
      return { row: 'bg-amber-300', indicator: 'bg-amber-500 text-black' };
    case 'low':
      return { row: 'bg-blue-300', indicator: 'bg-blue-600 text-white' };
    default:
      return { row: 'bg-gray-200', indicator: 'bg-gray-500 text-white' };
  }
}

const TechDebtPanel = ({ techDebt }: TechDebtPanelProps) => {
  if (techDebt.length === 0) {
    return (
      <div
        data-testid="tech-debt-panel"
        className="border-4 border-black bg-orange-200 p-6 shadow-[8px_8px_0px_0px_#000]"
      >
        <h2 className="text-xl font-black uppercase tracking-tight text-black mb-4">
          Tech Debt Signals
        </h2>
        <p className="text-sm font-bold text-black/50 italic">No tech debt signals detected</p>
      </div>
    );
  }

  return (
    <div
      data-testid="tech-debt-panel"
      className="border-4 border-black bg-orange-200 p-6 shadow-[8px_8px_0px_0px_#000]"
    >
      <h2 className="text-xl font-black uppercase tracking-tight text-black mb-4">
        Tech Debt Signals
      </h2>
      <div className="space-y-4">
        {techDebt.map((item, index) => {
          const { row, indicator } = getSeverityClasses(item.severity || '');
          return (
            <div
              key={index}
              data-testid="debt-row"
              className={`border-3 border-black p-4 shadow-[4px_4px_0px_0px_#000] ${row}`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  data-testid="severity-indicator"
                  className={`border-2 border-black text-xs font-black uppercase px-2 py-0.5 ${indicator}`}
                >
                  {item.severity || 'unknown'}
                </span>
                <span className="border-2 border-black bg-white text-xs font-black uppercase px-2 py-0.5 text-black">
                  {item.type || 'N/A'}
                </span>
              </div>
              <p className="font-mono text-sm font-bold text-black break-all">
                {item.file || 'N/A'}
              </p>
              <p className="text-base font-medium text-black mt-1">
                {item.details || 'N/A'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TechDebtPanel;
