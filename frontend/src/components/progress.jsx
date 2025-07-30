import React from "react";

const ProgressBar = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto">
      {steps.map((step, index) => (
        <div key={index} className="relative flex flex-col items-center w-full">
          {/* Connector Line */}
          {index !== 0 && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 ${
                index <= currentStep ? "bg-blue-500" : "bg-gray-300"
              }`}
            ></div>
          )}

          {/* Step Indicator */}
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full text-white font-semibold z-10 ${
              index < currentStep
                ? "bg-blue-500"
                : index === currentStep
                ? "bg-blue-700 animate-pulse"
                : "bg-gray-300"
            }`}
          >
            {index + 1}
          </div>

          {/* Step Label */}
          <span
            className={`mt-2 text-sm ${
              index <= currentStep ? "text-blue-700 font-semibold" : "text-gray-500"
            }`}
          >
            {step}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ProgressBar
