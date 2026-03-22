import React, { useState, useEffect } from 'react';
import { FaTimes, FaArrowRight, FaArrowLeft, FaCheck, FaMapMarkerAlt, FaBuilding, FaCalculator, FaFileAlt } from 'react-icons/fa';

function OnboardingTutorial({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('ecobuild-tutorial-seen');
    if (hasSeenTutorial) {
      setIsVisible(false);
    }
  }, []);

  const steps = [
    {
      icon: FaMapMarkerAlt,
      title: "Welcome to EcoBuild",
      description: "Your comprehensive Lifecycle Decision Support System for sustainable construction in Kerala. Let's take a quick tour of the key features.",
      highlight: null
    },
    {
      icon: FaBuilding,
      title: "1. Configure Your Project",
      description: "Start by creating a new project. Set your location on the interactive map, enter building parameters, and compliance requirements.",
      highlight: "sidebar"
    },
    {
      icon: FaCalculator,
      title: "2. Run Analysis",
      description: "Use our AHP-powered Material Optimizer to analyze materials, generate BoQ, and assess sustainability with GRIHA/IGBC/LEED ratings.",
      highlight: "optimizer"
    },
    {
      icon: FaFileAlt,
      title: "3. Generate Reports",
      description: "Export professional STAAD.Pro-style reports with sustainability certificates, Bill of Quantities, and compliance documentation.",
      highlight: "reports"
    },
    {
      icon: FaCheck,
      title: "You're Ready!",
      description: "The AI Assistant is available throughout to answer your questions. Click 'Get Started' to begin your sustainable construction journey.",
      highlight: null
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('ecobuild-tutorial-seen', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem('ecobuild-tutorial-seen', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background-card border border-border rounded-2xl shadow-2xl max-w-lg w-full animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <StepIcon />
            </div>
            <span className="text-sm text-foreground-secondary">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button onClick={handleSkip} className="btn btn-ghost p-2">
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-primary-bg rounded-2xl flex items-center justify-center mx-auto mb-6">
            <StepIcon className="text-4xl text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {steps[currentStep].title}
          </h2>
          
          <p className="text-foreground-secondary leading-relaxed">
            {steps[currentStep].description}
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentStep 
                    ? 'bg-primary w-8' 
                    : 'bg-border hover:bg-border-dark'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="btn btn-secondary disabled:opacity-50"
          >
            <FaArrowLeft className="mr-2" />
            Previous
          </button>

          {currentStep < steps.length - 1 ? (
            <button onClick={handleNext} className="btn btn-primary">
              Next
              <FaArrowRight className="ml-2" />
            </button>
          ) : (
            <button onClick={handleComplete} className="btn btn-primary">
              <FaCheck className="mr-2" />
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingTutorial;