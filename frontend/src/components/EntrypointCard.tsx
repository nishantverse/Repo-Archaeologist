import { truncateText } from '../utils/format';

interface EntrypointCardProps {
  entrypoint: string;
  inferredStack: string;
}

const EntrypointCard = ({ entrypoint, inferredStack }: EntrypointCardProps) => {
  const displayEntrypoint = entrypoint
    ? truncateText(entrypoint, 260)
    : 'No entrypoint detected';

  const displayStack = inferredStack
    ? truncateText(inferredStack, 100)
    : 'No stack detected';

  return (
    <div
      data-testid="entrypoint-card"
      className="border-4 border-black bg-cyan-200 p-6 shadow-[8px_8px_0px_0px_#000]"
    >
      <h2 className="text-xl font-black uppercase tracking-tight text-black mb-4">
        Entrypoint & Stack
      </h2>

      <div className="mb-4">
        <span className="text-xs font-bold uppercase tracking-wide text-black/60">
          Entrypoint
        </span>
        <p
          className={`font-mono text-sm mt-1 border-2 border-black px-3 py-2 ${
            entrypoint ? 'bg-white text-black' : 'bg-gray-100 text-black/50 italic'
          }`}
        >
          {displayEntrypoint}
        </p>
      </div>

      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-black/60">
          Inferred Stack
        </span>
        <p
          className={`text-base font-bold mt-1 ${
            inferredStack ? 'text-black' : 'text-black/50 italic'
          }`}
        >
          {displayStack}
        </p>
      </div>
    </div>
  );
};

export default EntrypointCard;
