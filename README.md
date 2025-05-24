# 🎓 Grade Scan Scribe AI

**AI-Powered Exam Evaluation and MCQ Testing Platform**

A comprehensive web application that leverages artificial intelligence to automate exam paper evaluation, generate multiple-choice questions, and provide intelligent grading solutions for educators.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3.3-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-Latest-green.svg)
![OpenAI](https://img.shields.io/badge/OpenAI-API-orange.svg)

## 🌟 Features

### 📝 **Intelligent Exam Evaluation**
- **OCR Text Extraction**: Advanced optical character recognition for handwritten and printed text
- **AI-Powered Grading**: Automated evaluation using OpenAI's GPT models
- **Multiple Question Types**: Support for essays, short answers, and multiple-choice questions
- **Handwriting Analysis**: Specialized recognition for handwritten student responses

### 🎯 **MCQ Testing System**
- **Dynamic Question Generation**: AI-generated multiple-choice questions
- **Difficulty Levels**: Easy, Medium, and Hard question categorization
- **Real-time Testing**: Interactive online MCQ tests with timer functionality
- **Instant Results**: Immediate scoring and detailed performance analysis

### 📱 **Modern User Experience**
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Mode**: Adaptive UI themes for better user experience
- **Accessibility**: WCAG compliant with screen reader support
- **Real-time Feedback**: Live updates and notifications

### 🔐 **Security & Authentication**
- **User Management**: Secure authentication and user profiles
- **Data Privacy**: Encrypted storage and secure API communications
- **Role-based Access**: Different permissions for teachers and students

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager
- OpenAI API key
- OCR.space API key (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Naren182005/lysaapp.git
   cd lysaapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp server/.env.example server/.env
   ```

4. **Configure API keys**
   Edit `.env` and `server/.env` files:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OCR_API_KEY=your_ocr_api_key_here
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🚀 Running the Application

### Prerequisites Verification
Before running the application, ensure you have:
- **Node.js** (v18 or higher) - Check with `node --version`
- **npm** (v8 or higher) - Check with `npm --version`
- **Git** - Check with `git --version`

### Step-by-Step Execution Guide

#### 1. **Clone and Setup**
```bash
# Clone the repository
git clone https://github.com/Naren182005/lysaapp.git
cd lysaapp

# Install all dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

#### 2. **Environment Configuration**
```bash
# Copy environment templates
cp .env.example .env
cp server/.env.example server/.env
```

**Edit `.env` file:**
```env
# Frontend Environment Variables
VITE_API_BASE_URL=http://localhost:3001/api
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OCR_API_KEY=your_ocr_api_key_here
```

**Edit `server/.env` file:**
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
OCR_API_KEY=your_ocr_api_key_here
```

#### 3. **Available Scripts**

| Script | Command | Description |
|--------|---------|-------------|
| **Development** | `npm run dev` | Start frontend development server (port 3000) |
| **Server** | `npm run server` | Start backend server only (port 3001) |
| **Full Stack** | `npm start` | Start both frontend and backend concurrently |
| **Build** | `npm run build` | Build production version |
| **Build Dev** | `npm run build:dev` | Build development version |
| **Preview** | `npm run preview` | Preview production build |
| **Lint** | `npm run lint` | Run ESLint code analysis |

#### 4. **Development Mode (Recommended)**

**Option A: Start Everything Together**
```bash
npm start
```
This command starts both the frontend (port 3000) and backend (port 3001) simultaneously.

**Option B: Start Services Separately**
```bash
# Terminal 1 - Start backend server
npm run server

# Terminal 2 - Start frontend development server
npm run dev
```

#### 5. **Production Mode**
```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

### 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application interface |
| **Backend API** | http://localhost:3001/api | REST API endpoints |
| **Health Check** | http://localhost:3001/api/connectivity | Server connectivity test |

### 🔧 Port Configuration

- **Frontend (Vite)**: Port 3000 (configurable in `vite.config.ts`)
- **Backend (Express)**: Port 3001 (configurable in `server/.env`)
- **Auto-open**: Disabled by default (can be enabled in `vite.config.ts`)

### ✅ Verification Steps

#### 1. **Check Server Status**
```bash
curl http://localhost:3001/api/connectivity
# Expected response: {"connected":true}
```

#### 2. **Check Frontend**
- Open http://localhost:3000 in your browser
- You should see the Grade Scan Scribe AI interface
- Check browser console for any errors

#### 3. **Test API Integration**
- Upload a test image in the OCR section
- Verify that API calls are working properly
- Check network tab in browser developer tools

### 🛠️ Troubleshooting

#### Common Issues and Solutions

**Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill the process (Windows)
taskkill /PID <process_id> /F

# Kill the process (macOS/Linux)
kill -9 <process_id>
```

**Dependencies Issues**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For server dependencies
cd server
rm -rf node_modules package-lock.json
npm install
```

**Environment Variables Not Loading**
```bash
# Verify .env files exist
ls -la .env
ls -la server/.env

# Check environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY ? 'API key loaded' : 'API key missing')"
```

**API Key Issues**
- Verify OpenAI API key format: `sk-proj-...`
- Check OCR.space API key format: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`
- Ensure API keys have sufficient credits/quota
- Test API keys independently before using in the application

**Build Errors**
```bash
# Clear TypeScript cache
npx tsc --build --clean

# Rebuild with verbose output
npm run build -- --verbose
```

**CORS Issues**
- Ensure backend server is running on port 3001
- Check that `VITE_API_BASE_URL` matches the backend URL
- Verify CORS is properly configured in `express-server.mjs`

### 🔄 Development Workflow

#### Hot Reload
- Frontend changes automatically reload the browser
- Backend changes require manual restart (use `npm run server` with `--watch` flag)
- Environment variable changes require full restart

#### File Watching
```bash
# Start backend with file watching (auto-restart)
cd server
npm run dev

# Or use nodemon globally
npm install -g nodemon
nodemon server/server.js
```

#### Testing Changes
1. Make your changes
2. Save files (auto-reload for frontend)
3. Refresh browser manually to see updates
4. Check browser console and network tab for errors
5. Test API endpoints using browser developer tools

### 📱 Browser Compatibility
- **Recommended**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Features**: ES2020, WebRTC, File API, Canvas API

### 🔐 Security Notes
- API keys are loaded from environment variables
- Frontend environment variables are exposed to client-side
- Sensitive operations should use backend API endpoints
- Never commit `.env` files with real API keys

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
src/
├── components/          # Organized component library
│   ├── mcq/            # MCQ-related components
│   ├── evaluation/     # Evaluation components
│   ├── forms/          # Form components
│   ├── navigation/     # Navigation components
│   ├── layout/         # Layout components
│   └── ui/             # Reusable UI components
├── pages/              # Page components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── utils/              # Utility functions
└── types/              # TypeScript definitions
```

### Backend (Node.js + Express)
```
server/
├── routes/             # API endpoints
├── middleware/         # Express middleware
├── services/           # Business logic
├── models/             # Data models
└── utils/              # Server utilities
```

## 🛠️ Technology Stack

### Frontend
- **React 18.3.3** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **React Router** - Client-side routing

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **OpenAI API** - AI-powered text processing
- **OCR.space API** - Optical character recognition

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Git** - Version control
- **npm** - Package management

## 📖 Usage Guide

### For Educators

1. **Upload Question Papers**
   - Scan or upload question paper images
   - AI extracts text and identifies question types
   - Review and edit extracted content

2. **Evaluate Student Answers**
   - Upload student answer sheets
   - AI compares with model answers
   - Get detailed scoring and feedback

3. **Create MCQ Tests**
   - Generate questions automatically
   - Set difficulty levels and time limits
   - Monitor student performance in real-time

### For Students

1. **Take Online Tests**
   - Access assigned MCQ tests
   - Navigate through questions easily
   - Submit and view results instantly

2. **Practice Mode**
   - Take practice tests
   - Review correct answers
   - Track performance over time

## 🔧 Configuration

### API Keys Setup

Get your API keys from:
- **OpenAI**: https://platform.openai.com/api-keys
- **OCR.space**: https://ocr.space/ocrapi

### Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
OCR_API_KEY=your_ocr_api_key_here

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:3001/api
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Naren182005**
- GitHub: [@Naren182005](https://github.com/Naren182005)
- Project: [Grade Scan Scribe AI](https://github.com/Naren182005/lysaapp)

## 🙏 Acknowledgments

- OpenAI for providing powerful AI capabilities
- OCR.space for optical character recognition services
- The React and TypeScript communities
- All contributors and testers

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the documentation
- Review existing issues for solutions

## 📋 Quick Reference

### Essential Commands
```bash
# Quick Start (after cloning)
npm install && cd server && npm install && cd ..
cp .env.example .env && cp server/.env.example server/.env
npm start                    # Start both frontend and backend

# Development
npm run dev                  # Frontend only (port 3000)
npm run server              # Backend only (port 3001)
npm start                   # Both services together

# Production
npm run build               # Build for production
npm run preview             # Preview production build

# Maintenance
npm run lint                # Check code quality
npm cache clean --force     # Clear npm cache
```

### Quick URLs
- **Application**: http://localhost:3000
- **API Health**: http://localhost:3001/api/connectivity
- **API Base**: http://localhost:3001/api

### Environment Setup Checklist
- [ ] Node.js v18+ installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Server dependencies installed (`cd server && npm install`)
- [ ] Environment files copied (`.env` and `server/.env`)
- [ ] API keys configured (OpenAI and OCR.space)
- [ ] Both servers running (ports 3000 and 3001)
- [ ] Browser opened to http://localhost:3000

---

**Made with ❤️ for educators and students worldwide**
