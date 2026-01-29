import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext/AuthContext";
import ModalWithForm from "../ModalWithForm/ModalWithForm";
import { authAPI } from "../../services/api";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: "",
  });
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      displayName: "",
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordStrength({ score: 0, feedback: "" });
    setUsernameAvailable(null);
  };

  const calculatePasswordStrength = (password) => {
    let score = 0;
    let feedback = "";

    if (!password) {
      return { score: 0, feedback: "" };
    }

    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) feedback = "Weak";
    else if (score <= 3) feedback = "Fair";
    else if (score === 4) feedback = "Good";
    else feedback = "Strong";

    return { score, feedback };
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await authAPI.checkUsername(username);
      setUsernameAvailable(response.available);
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.username) {
        checkUsernameAvailability(formData.username);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(value));
    }

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
    } else if (usernameAvailable === false) {
      newErrors.username = "Username is already taken";
    }

    // Display name is now optional - will be auto-generated from username if not provided

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)
    ) {
      newErrors.email = "Please enter a valid email address";
    } else {
      // Check if email domain is likely valid (has common TLD)
      const emailParts = formData.email.toLowerCase().split("@");
      if (emailParts.length === 2) {
        const domain = emailParts[1];
        const commonTLDs = [
          "com",
          "org",
          "net",
          "edu",
          "gov",
          "mil",
          "int",
          "co",
          "io",
          "ai",
          "app",
          "dev",
        ];
        const domainParts = domain.split(".");
        const tld = domainParts[domainParts.length - 1];

        // Warn if using a suspicious domain
        if (!commonTLDs.includes(tld) && tld.length < 2) {
          newErrors.email =
            "Please use a valid email domain (e.g., @gmail.com, @yahoo.com)";
        }
      }
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
        displayName: formData.displayName.trim() || formData.username,
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
        {checkingUsername && (
          <div
            className="modal__info"
            style={{ fontSize: "12px", color: "#666" }}
          >
            Checking availability...
          </div>
        )}
        {!checkingUsername &&
          usernameAvailable === true &&
          formData.username.length >= 3 && (
            <div
              className="modal__success"
              style={{ fontSize: "12px", color: "#10b981" }}
            >
              ✓ Username available
            </div>
          )}
        {!checkingUsername && usernameAvailable === false && (
          <div className="modal__error" style={{ fontSize: "12px" }}>
            ✗ Username already taken
          </div>
        )}
        {errors.username && (
          <div className="modal__error">{errors.username}</div>
        )}
      </div>

      <div className="modal__field">
        <label htmlFor="register-display-name" className="modal__label">
          Display Name{" "}
          <span
            style={{ fontSize: "12px", color: "#666", fontWeight: "normal" }}
          >
            (optional)
          </span>
        </label>
        <input
          id="register-display-name"
          type="text"
          name="displayName"
          className="modal__input"
          placeholder="Leave blank to use your username"
          value={formData.displayName}
          onChange={handleInputChange}
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
        <div style={{ position: "relative" }}>
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            name="password"
            className="modal__input"
            placeholder="Create a password (min 6 characters)"
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
        {formData.password && (
          <div style={{ marginTop: "8px" }}>
            <div
              style={{
                display: "flex",
                gap: "4px",
                height: "4px",
                marginBottom: "4px",
              }}
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  style={{
                    flex: 1,
                    backgroundColor:
                      level <= passwordStrength.score
                        ? passwordStrength.score <= 1
                          ? "#ef4444"
                          : passwordStrength.score <= 3
                            ? "#f59e0b"
                            : passwordStrength.score === 4
                              ? "#10b981"
                              : "#059669"
                        : "#e5e7eb",
                    borderRadius: "2px",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: "12px",
                color:
                  passwordStrength.score <= 1
                    ? "#ef4444"
                    : passwordStrength.score <= 3
                      ? "#f59e0b"
                      : passwordStrength.score === 4
                        ? "#10b981"
                        : "#059669",
              }}
            >
              {passwordStrength.feedback}
            </div>
          </div>
        )}
        {errors.password && (
          <div className="modal__error">{errors.password}</div>
        )}
      </div>

      <div className="modal__field">
        <label htmlFor="register-confirm-password" className="modal__label">
          Confirm Password
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="register-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            className="modal__input"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            style={{ paddingRight: "40px" }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
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
