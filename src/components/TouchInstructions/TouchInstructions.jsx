import React, { useState, useEffect } from "react";
import "./TouchInstructions.css";

const TouchInstructions = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasSeenInstructions, setHasSeenInstructions] = useState(false);

  useEffect(() => {
    // Check if user has seen instructions before
    const seenInstructions = localStorage.getItem(
      "nudl-touch-instructions-seen"
    );

    if (!seenInstructions) {
      // Show instructions after a brief delay
      const timer = setTimeout(() => {
        setShowInstructions(true);
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setHasSeenInstructions(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowInstructions(false);
    setHasSeenInstructions(true);
    localStorage.setItem("nudl-touch-instructions-seen", "true");
  };

  // Only show on mobile devices
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  if (!isMobile || hasSeenInstructions || !showInstructions) {
    return null;
  }

  return (
    <div className="touch-instructions">
      <div className="touch-instructions__overlay" onClick={handleDismiss}>
        <div
          className="touch-instructions__content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="touch-instructions__header">
            <h3>🎥 Swipe to Navigate</h3>
            <button
              className="touch-instructions__close"
              onClick={handleDismiss}
              aria-label="Close instructions"
            >
              ✕
            </button>
          </div>

          <div className="touch-instructions__gestures">
            <div className="touch-instructions__gesture">
              <div className="touch-instructions__arrow touch-instructions__arrow--up">
                ↑
              </div>
              <p>Swipe up for next video</p>
            </div>

            <div className="touch-instructions__gesture">
              <div className="touch-instructions__arrow touch-instructions__arrow--down">
                ↓
              </div>
              <p>Swipe down for previous video</p>
            </div>

            <div className="touch-instructions__gesture">
              <div className="touch-instructions__tap">👆</div>
              <p>Tap video to pause/play</p>
            </div>
          </div>

          <button
            className="touch-instructions__got-it"
            onClick={handleDismiss}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default TouchInstructions;
