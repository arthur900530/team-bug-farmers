# 🚀 Team Setup Guide - Docker Edition

**For:** All team members (Bug Farmers - 10 people)  
**Time:** 5 minutes per person  
**Works on:** macOS, Windows, Linux  

---

## ✅ Prerequisites (One-Time Setup)

### 1. Install Docker Desktop

**macOS:**
```bash
# Download from: https://www.docker.com/products/docker-desktop
# Or use Homebrew:
brew install --cask docker
```

**Windows:**
```bash
# Download from: https://www.docker.com/products/docker-desktop
# Run installer, restart computer
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Start Docker
sudo systemctl start docker
```

### 2. Verify Docker Works

```bash
docker --version
# Should show: Docker version 24.x.x or higher

docker-compose --version
# Should show: Docker Compose version 2.x.x or higher
```

---

## 🏃 Quick Start (Every Team Member)

### Step 1: Clone Repository

```bash
git clone https://github.com/arthur900530/team-bug-farmers.git
cd team-bug-farmers
```

### Step 2: Start Everything

```bash
# Start backend in Docker
docker-compose up

# Or run in background:
docker-compose up -d
```

**That's it!** 🎉 No Node.js installation, no version conflicts, no dependencies to manage.

### Step 3: Verify It Works

```bash
# Test health check
curl http://localhost:3001/api/health

# Expected response:
# {
#   "status": "ok",
#   "database": { "status": "connected" },
#   ...
# }
```

### Step 4: Start Frontend (Separate Terminal)

```bash
# In project root
npm install  # One-time only
npm run dev
```

Frontend runs on: http://localhost:5173/

---

## 🛠️ Common Commands

### View Logs
```bash
# See real-time logs
docker-compose logs -f backend

# See last 100 lines
docker-compose logs --tail=100 backend
```

### Stop Services
```bash
# Stop but keep data
docker-compose stop

# Stop and remove containers (keeps database volume)
docker-compose down

# Stop and DELETE all data (careful!)
docker-compose down -v
```

### Restart Services
```bash
# Restart backend
docker-compose restart backend

# Rebuild after code changes
docker-compose up --build
```

### Access Container Shell
```bash
# Get a shell inside the container
docker-compose exec backend sh

# Inside container, you can:
node check-db.js
node clear-db.js
ls -la
```

### Database Operations
```bash
# View database contents
docker-compose exec backend node check-db.js

# Clear database
docker-compose exec backend node clear-db.js

# Backup database
docker cp zoom-backend:/app/audio-states.db ./backup.db
```

---

## 🧪 Testing the SRE Improvements

### 1. Health Check
```bash
curl http://localhost:3001/api/health | jq '.'
```

### 2. Metrics Endpoint
```bash
curl http://localhost:3001/api/metrics | jq '.'
```

### 3. Structured Logs
```bash
# View JSON logs
docker-compose logs backend | jq '.'

# Find slow requests
docker-compose logs backend | jq 'select(.isSlowRequest == true)'
```

### 4. Test User Stories

**Mute/Unmute (User Story 1):**
```bash
# Mute user
curl -X PATCH http://localhost:3001/api/users/test-user/mute \
  -H "Content-Type: application/json" \
  -d '{"isMuted": true}'

# Check database
docker-compose exec backend node check-db.js
```

**Device Switching (User Story 2):**
```bash
# Switch device
curl -X PATCH http://localhost:3001/api/users/test-user/device \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "device-123", "deviceLabel": "External Microphone"}'

# Check database
docker-compose exec backend node check-db.js
```

### 5. Graceful Shutdown
```bash
# Send SIGTERM
docker-compose stop backend

# Check logs for graceful shutdown messages
docker-compose logs backend | tail -20
```

---

## 🐛 Troubleshooting

### "Port 3001 already in use"
```bash
# Find what's using the port
lsof -i :3001

# Kill it or stop other backend instance
docker-compose down
```

### "Cannot connect to Docker daemon"
```bash
# Start Docker Desktop (macOS/Windows)
# Or start Docker service (Linux)
sudo systemctl start docker
```

### "Container keeps restarting"
```bash
# Check logs for errors
docker-compose logs backend

# Check health
docker-compose ps
```

### "Database is empty"
```bash
# Database persists in a Docker volume
# Check volume exists:
docker volume ls | grep backend-data

# If you accidentally deleted it:
docker-compose up  # Will recreate
```

### "Changes not reflecting"
```bash
# Rebuild container after code changes
docker-compose up --build

# Or force recreate
docker-compose up --force-recreate
```

---

## 💡 Why Docker?

### Benefits for Your Team:

1. **✅ No Version Conflicts**
   - Everyone uses same Node 18 environment
   - No "works on my machine" problems

2. **✅ 5-Minute Setup**
   - Install Docker once
   - `docker-compose up` always works

3. **✅ Consistent Testing**
   - Same environment as production
   - Same environment across all team members

4. **✅ Easy Onboarding**
   - New team member? Just install Docker
   - No complex nvm/npm setup

5. **✅ Production-Ready**
   - Same Docker image for AWS deployment
   - Test locally exactly as it runs in production

---

## 📊 What's Inside the Container

```
Container: zoom-backend
├── Node.js 18 LTS (Alpine Linux)
├── All npm dependencies installed
├── Backend code mounted from ./backend
├── Database: audio-states.db (persisted in volume)
└── Exposed port: 3001
```

---

## 🔄 Development Workflow

### Making Code Changes

1. Edit files in `backend/` directory
2. Save (container auto-restarts if using `nodemon`)
3. Or manually restart: `docker-compose restart backend`
4. Test: `curl http://localhost:3001/api/health`

### Updating Dependencies

```bash
# Add a new package
docker-compose exec backend npm install package-name

# Or edit package.json and rebuild
docker-compose up --build
```

### Deploying to AWS

```bash
# Build production image
docker build -t zoom-backend:prod ./backend

# Tag for AWS ECR
docker tag zoom-backend:prod YOUR_ECR_REPO/zoom-backend:latest

# Push to ECR
docker push YOUR_ECR_REPO/zoom-backend:latest

# Deploy to ECS/Fargate (see DEPLOYMENT_RUNBOOK.md)
```

---

## 🎯 Team Checklist

Each team member should verify:

- [ ] Docker installed and running
- [ ] `docker-compose up` starts successfully
- [ ] http://localhost:3001/api/health returns 200 OK
- [ ] http://localhost:3001/api/metrics shows data
- [ ] Frontend connects to backend
- [ ] Can view logs: `docker-compose logs -f backend`
- [ ] Database persists between restarts
- [ ] Graceful shutdown works: `docker-compose stop`

---

## 🆘 Getting Help

1. **Check logs:** `docker-compose logs backend`
2. **Check this guide:** Most common issues covered
3. **Ask team:** Share logs in team chat
4. **Docker docs:** https://docs.docker.com/

---

## 📝 Quick Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f backend

# Restart
docker-compose restart backend

# Rebuild
docker-compose up --build

# Shell access
docker-compose exec backend sh

# Database check
docker-compose exec backend node check-db.js

# Test health
curl http://localhost:3001/api/health
```

---

**Setup Time:** 5 minutes  
**Maintenance:** Zero  
**Team Compatibility:** 100%  

**Status:** ✅ Production-Ready

---

**Last Updated:** October 22, 2025  
**Maintained By:** Team Bug Farmers SRE Team

