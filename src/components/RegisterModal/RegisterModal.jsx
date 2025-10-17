import React, { useState } from "react";
import ModalWithForm from "../ModalWithForm/ModalWithForm";

const RegisterModal = ({ isOpen, onClose, onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
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
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (onRegister) {
      onRegister({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
    }

    resetForm();
    onClose();
    setIsLoading(false);
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
