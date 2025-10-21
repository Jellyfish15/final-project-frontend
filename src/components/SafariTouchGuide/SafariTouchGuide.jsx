import React, { useState, useEffect } from "react";
import { isSafari, isIOS } from "../../utils/touchDebug";
import "./SafariTouchGuide.css";

const SafariTouchGuide = () => {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Show guide only for Safari users and only once
    const hasSeenGuide = localStorage.getItem("safariTouchGuideShown");
    if ((isSafari() || isIOS()) && !hasSeenGuide) {
      setShowGuide(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowGuide(false);
    localStorage.setItem("safariTouchGuideShown", "true");
  };

  if (!showGuide) return null;

  return (
    <div className="safari-guide">
      <div className="safari-guide__overlay">
        <div className="safari-guide__content">
          <h3 className="safari-guide__title">🍎 Safari Touch Tips</h3>
          <div className="safari-guide__tips">
            <div className="safari-guide__tip">
              <span className="safari-guide__icon">👆</span>
              <p>
                Swipe <strong>up/down</strong> on the video to navigate
              </p>
            </div>
            <div className="safari-guide__tip">
              <span className="safari-guide__icon">⚡</span>
              <p>
                Make sure to swipe <strong>quickly</strong> for best results
              </p>
            </div>
            <div className="safari-guide__tip">
              <span className="safari-guide__icon">📱</span>
              <p>
                Keep swipes <strong>vertical</strong> (not diagonal)
              </p>
            </div>
          </div>
          <button className="safari-guide__dismiss" onClick={handleDismiss}>
            Got it! 👍
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafariTouchGuide;
