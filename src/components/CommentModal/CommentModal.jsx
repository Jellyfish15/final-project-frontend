import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../AuthContext/AuthContext";
import { videosAPI } from "../../services/api";
import "./CommentModal.css";

// Comment threading and pagination constants
const COMMENTS_PER_PAGE = 20;
const MAX_COMMENT_DEPTH = 3;
const MAX_COMMENT_LENGTH = 500;
const COMMENT_SORT_OPTIONS = ['newest', 'oldest', 'popular'];

// Time-ago formatter for comment timestamps
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  return `${diffMonth}mo ago`;
};

const CommentModal = ({ isOpen, onClose, video, onOpenLogin }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isOpen && video) {
      loadComments();
    }
  }, [isOpen, video]);

  const loadComments = async () => {
    if (!video) return;

    setIsLoading(true);
    try {
      const response = await videosAPI.getComments(video._id || video.id);
      setComments(response.comments || []);
    } catch (error) {
      console.error("Failed to load comments:", error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !video) return;

    if (!isAuthenticated) {
      onOpenLogin();
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Submitting comment for video:", video._id || video.id);
      const response = await videosAPI.addComment(
        video._id || video.id,
        newComment.trim()
      );

      console.log("Comment response:", response);

      // Add the new comment to the list
      setComments([response.comment, ...comments]);
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
      console.error("Error details:", error.message);
      alert(`Failed to add comment: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;

    try {
      await videosAPI.deleteComment(video._id || video.id, commentId);
      setComments(comments.filter((c) => c._id !== commentId));
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert("Failed to delete comment. Please try again.");
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="comment-modal-overlay" onClick={onClose}>
      <div
        className="comment-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="comment-modal-header">
          <h2 className="comment-modal-title">Comments ({comments.length})</h2>
          <button
            className="comment-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="comment-modal-body">
          {isLoading ? (
            <div className="comment-modal-loading">
              <div className="spinner">⏳</div>
              <p>Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="comment-modal-empty">
              <p>💬</p>
              <p>No comments yet</p>
              <p className="comment-modal-empty-text">
                Be the first to comment!
              </p>
            </div>
          ) : (
            <div className="comment-modal-list">
              {comments.map((comment) => (
                <div key={comment._id} className="comment-item">
                  <img
                    src={
                      comment.user?.avatar ||
                      "https://via.placeholder.com/40x40?text=U"
                    }
                    alt={comment.user?.username}
                    className="comment-avatar"
                  />
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-username">
                        @{comment.user?.username || "Unknown"}
                      </span>
                      <span className="comment-time">
                        {formatTimeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                    {isAuthenticated &&
                      (user?._id === comment.user?._id ||
                        user?.id === comment.user?._id) && (
                        <button
                          className="comment-delete"
                          onClick={() => handleDeleteComment(comment._id)}
                        >
                          Delete
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="comment-modal-footer">
          {isAuthenticated ? (
            <form className="comment-form" onSubmit={handleSubmitComment}>
              <img
                src={user?.avatar || "https://via.placeholder.com/32x32?text=U"}
                alt="Your avatar"
                className="comment-form-avatar"
              />
              <input
                type="text"
                className="comment-input"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="comment-submit"
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? "..." : "Post"}
              </button>
            </form>
          ) : (
            <div className="comment-login-prompt">
              <p>Please log in to comment</p>
              <button className="comment-login-btn" onClick={onOpenLogin}>
                Log In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
