import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVideo } from "../../contexts/VideoContext";
import SearchIcon from "../../images/search.svg";
import "./Search.css";

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { videos } = useVideo();

  const filteredVideos = videos.filter((video) => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      video.title.toLowerCase().includes(searchLower) ||
      video.creator.toLowerCase().includes(searchLower) ||
      (video.description &&
        video.description.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="search">
      <div className="search__container">
        <div className="search__header">
          <div className="search__input-container">
            <input
              type="text"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search__input"
            />
            <button className="search__button">
              <img src={SearchIcon} alt="Search" className="search__icon" />
            </button>
          </div>
        </div>

        <div className="search__results">
          {!searchTerm ? (
            <div className="search__empty-state">
              <div className="search__empty-icon">🔍</div>
              <h3>Search Educational Videos</h3>
              <p>Find videos from the Videos page by title or creator!</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="search__empty-state">
              <div className="search__empty-icon">🔍</div>
              <h3>No videos found</h3>
              <p>No videos found for "{searchTerm}"</p>
              <p>
                Try searching with different keywords or check the Videos page.
              </p>
            </div>
          ) : (
            <div className="search__results-list">
              {filteredVideos.map((video) => (
                <div key={video.id} className="search__result-item">
                  <div
                    className="search__video-result search__video-result--simple"
                    onClick={() => navigate("/videos")}
                  >
                    <div className="search__video-info">
                      <h4 className="search__video-title">{video.title}</h4>
                      <p className="search__video-creator">{video.creator}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;
