# Nudl - Educational Video Platform

A complete full-stack educational video platform with TikTok-style interface, user profiles, video uploads, and algorithmic content distribution.

## 🚀 Features

### Frontend Features

- **TikTok-Style Mobile Interface**: Optimized vertical video browsing with touch controls
- **Progressive Web App (PWA)**: Installable on mobile devices with offline support
- **User Authentication**: Secure registration and login system
- **Profile Management**: Complete user profiles with avatar upload and bio editing
- **Video Upload**: Support for video files up to 5 minutes with metadata
- **Responsive Design**: Mobile-first approach with desktop compatibility
- **Safari Optimization**: Special handling for iOS Safari video playbook

### Backend Features

- **RESTful API**: Complete Express.js API with comprehensive endpoints
- **User Management**: Authentication, profiles, follow system, statistics
- **Video Management**: Upload, metadata, engagement tracking, algorithmic feed
- **File Upload System**: Video and image upload with validation
- **Database Models**: MongoDB with Mongoose ODM
- **Security**: JWT authentication, password hashing, rate limiting
- **Algorithmic Feed**: Content recommendation based on user interests

## 🛠️ Technology Stack

### Frontend

- **React 18.2** - Modern UI library with hooks
- **React Router** - Client-side routing with HashRouter
- **CSS3** - Custom styling with mobile-first approach
- **Service Workers** - PWA functionality
- **Fetch API** - HTTP client for backend communication

### Backend

- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Helmet** - Security middleware

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd final-project-frontend
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd backend
npm install
```

#### Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# MongoDB URI, JWT secret, etc.
```

#### Start MongoDB

Make sure MongoDB is running on your system:

```bash
# For local MongoDB installation
mongod

# Or use MongoDB Atlas cloud connection
```

#### Start Backend Server

```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

Backend will be available at `http://localhost:5000`

### 3. Frontend Setup

#### Install Dependencies

```bash
# From project root
npm install
```

#### Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
VITE_API_URL=http://localhost:5000/api
```

#### Start Frontend Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

## 📱 Usage

### User Registration & Login

1. Open the application in your browser
2. Click "Sign Up" to create a new account
3. Fill in username, display name, email, and password
4. Login with your credentials

### Profile Management

1. Navigate to the Profile page
2. Click "Edit Profile" to modify your information
3. Upload an avatar image
4. Update username, display name, and bio
5. Save changes

### Video Upload

1. Go to your Profile page
2. Click "Upload" or "Upload Your First Video"
3. Select a video file (MP4, MOV, WebM, max 100MB, 5 minutes)
4. Add title, description, category, and tags
5. Choose privacy settings
6. Upload the video

### Video Discovery

1. Browse the Videos page for the algorithmic feed
2. Videos are recommended based on your interests
3. Like, comment, and share videos
4. Follow other users for personalized content

## 🗂️ Project Structure

```
├── README.md
├── package.json
├── vite.config.js
├── public/
│   ├── manifest.json
│   └── service-worker.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   │   ├── AuthContext/
│   │   ├── Profile/
│   │   ├── VideoUpload/
│   │   ├── LoginModal/
│   │   ├── RegisterModal/
│   │   └── ...
│   ├── services/
│   │   └── api.js
│   └── styles/
└── backend/
    ├── server.js
    ├── package.json
    ├── models/
    │   ├── User.js
    │   └── Video.js
    ├── routes/
    │   ├── auth.js
    │   ├── users.js
    │   ├── videos.js
    │   └── upload.js
    ├── middleware/
    │   └── auth.js
    └── uploads/
        ├── videos/
        ├── thumbnails/
        └── avatars/
```

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### Users

- `GET /api/users/:id` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/search` - Search users
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user

### Videos

- `GET /api/videos/feed` - Get algorithmic video feed
- `GET /api/videos/:id` - Get specific video
- `POST /api/videos/:id/like` - Like video
- `POST /api/videos/:id/comments` - Add comment
- `GET /api/videos/search` - Search videos

### Upload

- `POST /api/upload/video` - Upload video file
- `POST /api/upload/avatar` - Upload user avatar
- `GET /api/upload/my-videos` - Get user's videos

## 🔐 Environment Variables

### Backend (.env)

```env
MONGODB_URI=mongodb://localhost:27017/nudl
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
PORT=5000
```

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Nudl
```

## 🚀 Deployment

### Backend Deployment

1. Set up MongoDB Atlas or cloud MongoDB
2. Configure environment variables for production
3. Deploy to platforms like Heroku, Railway, or DigitalOcean
4. Update CORS settings for production frontend URL

### Frontend Deployment

1. Update API URL for production backend
2. Build the application: `npm run build`
3. Deploy to platforms like Vercel, Netlify, or AWS S3

## 🔧 Development

### Adding New Features

1. Create backend routes in `backend/routes/`
2. Update frontend API service in `src/services/api.js`
3. Create React components in `src/components/`
4. Add necessary styling

### Database Schema

- **Users**: Authentication, profile info, social features
- **Videos**: Content metadata, engagement tracking, algorithmic scoring
- **Comments**: User interactions on videos

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Check backend CORS configuration
2. **File Upload Fails**: Verify upload directory permissions
3. **Authentication Issues**: Check JWT secret configuration
4. **Database Connection**: Verify MongoDB URI and connection

### Development Tips

- Use browser dev tools for API debugging
- Check backend console for server errors
- Verify MongoDB collections are created properly
- Test file uploads with different file types and sizes

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🔗 Links

- [Live Demo](https://jellyfish15.github.io/final-project-frontend/) - Current frontend demo
- [API Documentation](#) - Available after deployment
- [Design System](#) - Component documentation

---

Built with ❤️ for educational content creators and learners worldwide.
