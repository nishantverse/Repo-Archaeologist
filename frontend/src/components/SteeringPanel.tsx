import { useState } from 'react';

interface SteeringPanelProps {
  kiroSteering: string;
}

const SteeringPanel = ({ kiroSteering }: SteeringPanelProps) => {
  const [buttonLabel, setButtonLabel] = useState('Copy to Clipboard');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCopy = async () => {
    setErrorMessage('');

    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(kiroSteering);
      setButtonLabel('Copied!');
      setTimeout(() => {
        setButtonLabel('Copy to Clipboard');
      }, 2000);
    } catch {
      setErrorMessage('Copy failed — clipboard unavailable');
      setButtonLabel('Copy to Clipboard');
    }
  };

  return (
    <div
      data-testid="steering-panel"
      className="border-4 border-black bg-emerald-200 p-6 shadow-[8px_8px_0px_0px_#000]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-xl font-black uppercase tracking-tight text-black">
          Kiro Steering
        </h2>
        <button
          onClick={handleCopy}
          disabled={!kiroSteering}
          className="border-3 border-black bg-black px-4 py-2 text-sm font-black uppercase text-white shadow-[4px_4px_0px_0px_#4ade80] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#4ade80] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_#4ade80]"
        >
          {buttonLabel}
        </button>
      </div>

      {errorMessage && (
        <p className="border-2 border-black bg-red-400 px-3 py-1 text-sm font-bold text-black mb-3">
          {errorMessage}
        </p>
      )}

      <pre className="font-mono text-sm border-3 border-black bg-white p-4 max-h-[400px] overflow-y-auto text-black">
        {kiroSteering}
      </pre>
    </div>
  );
};

export default SteeringPanel;
