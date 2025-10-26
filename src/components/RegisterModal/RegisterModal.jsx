import React, { useState } from "react";
import { useAuth } from "../AuthContext/AuthContext";
import ModalWithForm from "../ModalWithForm/ModalWithForm";

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    displayName: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      displayName: "",
    });
    setErrors({});
  };

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

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Display name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await register({
        username: formData.username,
        displayName: formData.displayName,
        email: formData.email,
        password: formData.password,
      });

      if (result.success) {
        resetForm();
        onClose();
      } else {
        setErrors({ submit: result.message || "Registration failed" });
      }
    } catch (error) {
      setErrors({ submit: "Registration failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <ModalWithForm
      isOpen={isOpen}
      onClose={handleClose}
      title="Join Nudl"
      submitButtonText="Create Account"
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      <div className="modal__field">
        <label htmlFor="register-username" className="modal__label">
          Username
        </label>
        <input
          id="register-username"
          type="text"
          name="username"
          className="modal__input"
          placeholder="Choose a username"
          value={formData.username}
          onChange={handleInputChange}
          required
        />
        {errors.username && (
          <div className="modal__error">{errors.username}</div>
        )}
      </div>

      <div className="modal__field">
        <label htmlFor="register-display-name" className="modal__label">
          Display Name
        </label>
        <input
          id="register-display-name"
          type="text"
          name="displayName"
          className="modal__input"
          placeholder="Your display name"
          value={formData.displayName}
          onChange={handleInputChange}
          required
        />
        {errors.displayName && (
          <div className="modal__error">{errors.displayName}</div>
        )}
      </div>

      <div className="modal__field">
        <label htmlFor="register-email" className="modal__label">
          Email
        </label>
        <input
          id="register-email"
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
        <label htmlFor="register-password" className="modal__label">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          name="password"
          className="modal__input"
          placeholder="Create a password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />
        {errors.password && (
          <div className="modal__error">{errors.password}</div>
        )}
      </div>

      <div className="modal__field">
        <label htmlFor="register-confirm-password" className="modal__label">
          Confirm Password
        </label>
        <input
          id="register-confirm-password"
          type="password"
          name="confirmPassword"
          className="modal__input"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          required
        />
        {errors.confirmPassword && (
          <div className="modal__error">{errors.confirmPassword}</div>
        )}
      </div>

      {errors.submit && <div className="modal__error">{errors.submit}</div>}

      <div className="modal__link">
        Already have an account?{" "}
        <button
          type="button"
          className="modal__link-button"
          onClick={onSwitchToLogin}
        >
          Log in
        </button>
      </div>
    </ModalWithForm>
  );
};

export default RegisterModal;
