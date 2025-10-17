import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";
import FacebookIcon from "../../images/facebook.svg";
import TwitterIcon from "../../images/twitter.svg";
import InstagramIcon from "../../images/instagram.svg";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__content">
          <div className="footer__section">
            <h4 className="footer__title">Nudl</h4>
            <p className="footer__description">
              Educational content made engaging and accessible for everyone.
            </p>
          </div>

          <div className="footer__section">
            <h5 className="footer__subtitle">Navigate</h5>
            <ul className="footer__links">
              <li>
                <Link to="/search" className="footer__link">
                  Search
                </Link>
              </li>
              <li>
                <Link to="/profile" className="footer__link">
                  Profile
                </Link>
              </li>
              <li>
                <Link to="/videos" className="footer__link">
                  Videos
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">© 2025 Nudl. All rights reserved.</p>
          <div className="footer__social">
            <a
              href="https://www.facebook.com/profile.php?id=61582658960169"
              className="footer__social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Nudl on Facebook"
            >
              <img
                src={FacebookIcon}
                alt="Facebook"
                className="footer__social-icon"
              />
            </a>
            <a
              href="https://x.com/stgenad"
              className="footer__social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Nudl on X (Twitter)"
            >
              <img
                src={TwitterIcon}
                alt="X (Twitter)"
                className="footer__social-icon"
              />
            </a>
            <a
              href="https://www.instagram.com/nudl_app/"
              className="footer__social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Nudl on Instagram"
            >
              <img
                src={InstagramIcon}
                alt="Instagram"
                className="footer__social-icon"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
