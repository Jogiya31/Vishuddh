import React, { useState } from "react";
import Overlay from "../components/overlay";

const App = () => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
   
      <Overlay isOpen={true} onClose={() => setIsOverlayOpen(false)} />
    </div>
  );
};

export default App;
