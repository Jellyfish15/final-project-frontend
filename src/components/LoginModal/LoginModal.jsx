import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "../AuthContext/AuthContext";
import ModalWithForm from "../ModalWithForm/ModalWithForm";

// Rate limiting for login attempts
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Input sanitization for security
const sanitizeInput = (input) => {
  return input
    .replace(/[<>]/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip JS URIs
    .trim();
};

// Email validation with RFC 5322 compliance
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

const LoginModal = ({ isOpen, onClose, onSwitchToRegister }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await login({
        email: formData.email,
        password: formData.password,
      });

      if (result.success) {
        setFormData({
          email: "",
          password: "",
        });
        onClose();
      } else {
        setErrors({ submit: result.message || "Login failed" });
      }
    } catch (error) {
      setErrors({ submit: "Login failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: "",
      password: "",
    });
    setErrors({});
    setShowPassword(false);
    onClose();
  };

  return (
    <ModalWithForm
      isOpen={isOpen}
      onClose={handleClose}
      title="Welcome Back"
      submitButtonText="Log In"
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      <div className="modal__field">
        <label htmlFor="login-email" className="modal__label">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          className="modal__input"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
        {errors.email && <div className="modal__error">{errors.email}</div>}
      </div>

      <div className="modal__field">
        <label htmlFor="login-password" className="modal__label">
          Password
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"
            className="modal__input"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange}
            required
            style={{ paddingRight: "40px" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
              padding: "5px",
            }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
        {errors.password && (
          <div className="modal__error">{errors.password}</div>
        )}
      </div>

      {errors.submit && <div className="modal__error">{errors.submit}</div>}

      <div className="modal__link">
        <button
          type="button"
          className="modal__link-button"
          onClick={() => {
            // TODO: Implement forgot password
          }}
        >
          Forgot password?
        </button>
      </div>

      <div className="modal__link">
        Don't have an account?{" "}
        <button
          type="button"
          className="modal__link-button"
          onClick={onSwitchToRegister}
        >
          Sign up
        </button>
      </div>
    </ModalWithForm>
  );
};

export default LoginModal;
