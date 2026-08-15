import { formatScanDate, formatPercentage } from '../utils/format';

interface HeaderProps {
  repoName: string;
  scannedAt: string;
  tokensSavedPercentage: number | null;
}

const Header = ({ repoName, scannedAt, tokensSavedPercentage }: HeaderProps) => {
  const formattedDate = formatScanDate(scannedAt);
  const badgeValue = formatPercentage(tokensSavedPercentage);

  return (
    <header
      data-testid="header"
      className="border-4 border-black bg-yellow-300 p-6 shadow-[8px_8px_0px_0px_#000]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black">
            {repoName}
          </h1>
          <p className="mt-1 text-sm font-bold text-black/70">
            Scanned: <span className="text-black">{formattedDate}</span>
          </p>
        </div>
        <span className="inline-block border-3 border-black bg-lime-400 px-4 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0px_0px_#000]">
          {tokensSavedPercentage === null ? 'N/A' : `${badgeValue}%`} tokens saved
        </span>
      </div>
    </header>
  );
};

export default Header;
