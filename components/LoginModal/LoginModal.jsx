import React, { useState } from "react";
import ModalWithForm from "../ModalWithForm/ModalWithForm";

const LoginModal = ({ isOpen, onClose, onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (formData.username === "demo" && formData.password === "password") {
        if (onLogin) {
          onLogin({
            username: formData.username,
            isAuthenticated: true,
          });
        }

        setFormData({
          username: "",
          password: "",
        });
        onClose();
      } else {
        setErrors({ submit: "Invalid username or password" });
      }
    } catch (error) {
      setErrors({ submit: "Login failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      username: "",
      password: "",
    });
    setErrors({});
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
        <label htmlFor="login-username" className="modal__label">
          Username
        </label>
        <input
          id="login-username"
          type="text"
          name="username"
          className="modal__input"
          placeholder="Enter your username"
          value={formData.username}
          onChange={handleInputChange}
          required
        />
        {errors.username && (
          <div className="modal__error">{errors.username}</div>
        )}
      </div>

      <div className="modal__field">
        <label htmlFor="login-password" className="modal__label">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          name="password"
          className="modal__input"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />
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
