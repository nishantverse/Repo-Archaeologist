import { truncateText } from '../utils/format';

interface HumanSummaryCardProps {
  humanSummary: string;
}

const HumanSummaryCard = ({ humanSummary }: HumanSummaryCardProps) => {
  const displayText = humanSummary
    ? truncateText(humanSummary, 2000)
    : null;

  return (
    <div
      data-testid="human-summary-card"
      className="border-4 border-black bg-pink-200 p-6 shadow-[8px_8px_0px_0px_#000]"
    >
      <h2 className="text-xl font-black uppercase tracking-tight text-black mb-4">
        Summary
      </h2>

      {displayText ? (
        <p className="text-base font-medium text-black whitespace-pre-line leading-relaxed">
          {displayText}
        </p>
      ) : (
        <p className="text-base font-bold text-black/50 italic">No summary available</p>
      )}
    </div>
  );
};

export default HumanSummaryCard;
