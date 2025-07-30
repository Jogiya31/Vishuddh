import React, { createContext, useState, useContext, useEffect } from 'react';

// Create a Context for storing data
const DataContext = createContext();

// A provider component to wrap around the application
export const DataProvider = ({ children }) => {
  const [data, setData] = useState(null); // Store data here
  const [loading, setLoading] = useState(true); // To handle loading state
  const [error, setError] = useState(null); // To handle errors

  // Function to fetch data from an API
  const fetchData = async () => {
    try {
      const response = await fetch('https://api.example.com/data'); // Replace with your API
      const result = await response.json();
      setData(result); // Dispatch data to state
      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  // Call fetchData once when the component mounts
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DataContext.Provider value={{ data, loading, error }}>
      {children}
    </DataContext.Provider>
  );
};

// Custom hook to use the context
export const useData = () => {
  return useContext(DataContext);
};
