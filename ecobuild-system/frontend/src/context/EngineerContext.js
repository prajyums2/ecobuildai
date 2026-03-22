import React, { createContext, useContext, useState, useEffect } from 'react';

const EngineerContext = createContext();

export const useEngineer = () => {
  const context = useContext(EngineerContext);
  if (!context) {
    throw new Error('useEngineer must be used within EngineerProvider');
  }
  return context;
};

export function EngineerProvider({ children }) {
  const [engineer, setEngineer] = useState({
    name: '',
    registrationNumber: '',
    company: '',
    designation: '',
    email: '',
    phone: '',
    address: '',
    licenseNumber: '',
    specialization: '',
    experience: ''
  });
  const [isConfigured, setIsConfigured] = useState(false);

  // Load engineer profile from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ecobuild-engineer-profile');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setEngineer(data);
        setIsConfigured(true);
      } catch (e) {
        console.error('Error loading engineer profile:', e);
      }
    }
  }, []);

  // Save engineer profile to localStorage
  useEffect(() => {
    if (isConfigured) {
      localStorage.setItem('ecobuild-engineer-profile', JSON.stringify(engineer));
    }
  }, [engineer, isConfigured]);

  const updateEngineer = (updates) => {
    setEngineer(prev => ({ ...prev, ...updates }));
    setIsConfigured(true);
  };

  const clearEngineer = () => {
    setEngineer({
      name: '',
      registrationNumber: '',
      company: '',
      designation: '',
      email: '',
      phone: '',
      address: '',
      licenseNumber: '',
      specialization: '',
      experience: ''
    });
    setIsConfigured(false);
    localStorage.removeItem('ecobuild-engineer-profile');
  };

  return (
    <EngineerContext.Provider value={{ engineer, isConfigured, updateEngineer, clearEngineer }}>
      {children}
    </EngineerContext.Provider>
  );
}

export default EngineerContext;