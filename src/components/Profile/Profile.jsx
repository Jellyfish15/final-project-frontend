import React from "react";

import "./Profile.css";

const Profile = () => {
  return (
    <div className="profile">
      <div className="profile__container">
        <div className="profile__header">
          <div className="profile__avatar">
            <img
              src="https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=120&h=120&fit=crop&crop=face"
              alt="Fox Avatar"
              className="profile__avatar-image"
            />
          </div>
          <div className="profile__info">
            <h1 className="profile__username">@username</h1>
            <h2 className="profile__display-name">User Display Name</h2>
            <p className="profile__bio">
              Learning enthusiast sharing educational content. Join me on this
              journey of discovery! 📚✨
            </p>
          </div>
        </div>

        <div className="profile__stats">
          <div className="profile__stat">
            <span className="profile__stat-number">42</span>
            <span className="profile__stat-label">Videos</span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-number">1.2K</span>
            <span className="profile__stat-label">Followers</span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-number">234</span>
            <span className="profile__stat-label">Following</span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-number">5.6K</span>
            <span className="profile__stat-label">Likes</span>
          </div>
        </div>

        <div className="profile__actions">
          <button className="profile__button profile__button--primary">
            Follow
          </button>
          <button className="profile__button profile__button--secondary">
            Message
          </button>
        </div>

        <div className="profile__content">
          <div className="profile__tabs">
            <button className="profile__tab profile__tab--active">
              Videos
            </button>
            <button className="profile__tab">Liked</button>
          </div>

          <div className="profile__videos">
            <div className="profile__video-grid">
              <div className="profile__no-videos">
                <div className="profile__no-videos-content">
                  <div className="profile__no-videos-icon">🎥</div>
                  <h3 className="profile__no-videos-title">No videos yet</h3>
                  <p className="profile__no-videos-text">
                    Start creating and sharing your educational content!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
