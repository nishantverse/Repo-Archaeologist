interface ErrorMessageProps {
  message: string;
}

const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="border-4 border-black bg-red-400 p-8 shadow-[8px_8px_0px_0px_#000] max-w-md w-full text-center">
        <h2 className="text-xl font-black uppercase text-black mb-2">Error</h2>
        <p className="text-base font-bold text-black">{message}</p>
      </div>
    </div>
  );
};

export default ErrorMessage;
