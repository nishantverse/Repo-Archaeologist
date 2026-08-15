interface FlowDiagramProps {
  flow: string[];
}

const FlowDiagram = ({ flow }: FlowDiagramProps) => {
  if (flow.length === 0) {
    return (
      <div
        data-testid="flow-diagram"
        className="border-4 border-black bg-violet-200 p-6 shadow-[8px_8px_0px_0px_#000]"
      >
        <h2 className="text-xl font-black uppercase tracking-tight text-black mb-4">
          Architectural Flow
        </h2>
        <p className="text-sm font-bold text-black/50 italic">No flow data available</p>
      </div>
    );
  }

  return (
    <div
      data-testid="flow-diagram"
      className="border-4 border-black bg-violet-200 p-6 shadow-[8px_8px_0px_0px_#000]"
    >
      <h2 className="text-xl font-black uppercase tracking-tight text-black mb-4">
        Architectural Flow
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        {flow.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <span
              data-testid="flow-node"
              className="border-3 border-black bg-white px-4 py-2 text-sm font-bold text-black shadow-[4px_4px_0px_0px_#000]"
            >
              {step}
            </span>
            {index < flow.length - 1 && (
              <span
                data-testid="flow-connector"
                className="text-2xl font-black text-black"
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlowDiagram;
