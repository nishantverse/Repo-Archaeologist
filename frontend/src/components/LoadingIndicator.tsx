const LoadingIndicator = () => {
  return (
    <div
      className="flex items-center justify-center min-h-[300px]"
      role="status"
      aria-label="Loading scan data"
    >
      <div className="border-4 border-black bg-yellow-300 p-8 shadow-[8px_8px_0px_0px_#000] text-center">
        <div className="inline-block h-12 w-12 animate-spin border-4 border-black border-t-transparent" />
        <p className="mt-4 text-sm font-black uppercase text-black">
          Loading scan data…
        </p>
      </div>
    </div>
  );
};

export default LoadingIndicator;
