import React from "react";
import "./ModalWithForm.css";

const ModalWithForm = ({
  isOpen,
  onClose,
  title,
  submitButtonText = "Submit",
  children,
  onSubmit,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="modal" onClick={handleOverlayClick}>
      <div className="modal__container">
        <button className="modal__close-button" onClick={onClose} type="button">
          ✕
        </button>

        <div className="modal__content">
          <h2 className="modal__title">{title}</h2>

          <form className="modal__form" onSubmit={handleSubmit}>
            {children}

            <button
              type="submit"
              className="modal__submit-button"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : submitButtonText}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalWithForm;
