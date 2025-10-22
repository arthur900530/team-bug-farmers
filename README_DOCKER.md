# 🐳 Docker Setup - The Easy Way for Your Team

**TL;DR:** One command to run everything: `docker-compose up`

---

## ✅ Why Docker?

### The Problem We Solved:
- ❌ Node version conflicts (v18 vs v23)
- ❌ native module compilation issues (`better-sqlite3`)
- ❌ "Works on my machine" problems
- ❌ Complex setup for team members

### The Docker Solution:
- ✅ **Works for everyone** - Same environment, every time
- ✅ **5-minute setup** - Install Docker, run one command
- ✅ **No version conflicts** - Container has Node 18
- ✅ **Production-ready** - Same image for local and AWS

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
# (Or: brew install --cask docker)

# 2. Start Docker Desktop app
# Look for whale icon in menu bar

# 3. Run the backend
docker-compose up
```

**That's it!** Backend runs on http://localhost:3001

---

## 📋 Full Team Setup

### Prerequisites (One-Time)

**Install Docker Desktop:**
- macOS: https://docs.docker.com/desktop/install/mac-install/
- Windows: https://docs.docker.com/desktop/install/windows-install/
- Linux: https://docs.docker.com/desktop/install/linux-install/

**Verify installation:**
```bash
docker --version
# Should show: Docker version 24.x.x or higher

docker-compose --version  
# Should show: Docker Compose version 2.x.x or higher
```

### Running the Backend

```bash
# Clone repository
git clone https://github.com/arthur900530/team-bug-farmers.git
cd team-bug-farmers

# Start backend
docker-compose up

# Or run in background:
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### Running the Frontend

```bash
# Separate terminal
npm install  # One-time only
npm run dev
```

Frontend: http://localhost:5173/  
Backend: http://localhost:3001/

---

## 🧪 Testing Everything

### 1. Health Check
```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok", "database":{"status":"connected"}, ...}
```

### 2. Metrics Endpoint
```bash
curl http://localhost:3001/api/metrics
# Expected: JSON with API performance data
```

### 3. Test User Stories

**User Story 1 - Mute/Unmute:**
```bash
# Mute user
curl -X PATCH http://localhost:3001/api/users/testuser/mute \
  -H "Content-Type: application/json" \
  -d '{"isMuted": true}'

# Check database
docker-compose exec backend node check-db.js
```

**User Story 2 - Device Switching:**
```bash
# Switch device
curl -X PATCH http://localhost:3001/api/users/testuser/device \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "mic-123", "deviceLabel": "External Mic"}'

# Check database
docker-compose exec backend node check-db.js
```

### 4. View Structured Logs
```bash
# Real-time JSON logs
docker-compose logs -f backend

# Pretty print JSON
docker-compose logs backend | tail -20 | jq '.'

# Find slow requests
docker-compose logs backend | jq 'select(.isSlowRequest == true)'
```

### 5. Test Graceful Shutdown
```bash
# Stop service
docker-compose stop backend

# Check logs for graceful shutdown messages
docker-compose logs backend | tail -10
```

---

## 🛠️ Common Operations

### Database Operations
```bash
# View database contents
docker-compose exec backend node check-db.js

# Clear database
docker-compose exec backend node clear-db.js

# Backup database
docker cp zoom-backend:/app/audio-states.db ./backup-$(date +%Y%m%d).db

# Restore database
docker cp ./backup-20251022.db zoom-backend:/app/audio-states.db
docker-compose restart backend
```

### Container Management
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Restart after code changes
docker-compose restart backend

# Rebuild after dependency changes
docker-compose up --build

# View container status
docker-compose ps

# Get a shell inside container
docker-compose exec backend sh
```

### Viewing Logs
```bash
# Real-time logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Logs from last hour
docker-compose logs --since="1h" backend

# Only errors
docker-compose logs backend | grep ERROR
```

### Cleanup
```bash
# Stop and remove containers (keeps database)
docker-compose down

# Stop and DELETE everything including database
docker-compose down -v

# Remove old images
docker image prune -a
```

---

## 🐛 Troubleshooting

### "Cannot connect to Docker daemon"
```bash
# Start Docker Desktop application
# Wait for whale icon to appear in menu bar
# Try again
```

### "Port 3001 already in use"
```bash
# Check what's using the port
lsof -i :3001

# Stop other instances
docker-compose down
```

### "Container immediately exits"
```bash
# Check logs for errors
docker-compose logs backend

# Check if image built correctly
docker-compose build backend

# Force recreate
docker-compose up --force-recreate
```

### "Database is empty after restart"
```bash
# Database persists in Docker volume
# Check volume exists
docker volume ls | grep backend-data

# If accidentally deleted, will recreate on next start
docker-compose up
```

### "Changes not reflecting"
```bash
# Code changes auto-reload (volume mounted)
# If not working, restart:
docker-compose restart backend

# For dependency changes, rebuild:
docker-compose up --build
```

---

## 📊 What's Inside the Container

```
Docker Image: node:18-alpine
├── Operating System: Alpine Linux
├── Node.js: v18.20.x LTS
├── npm: v10.x.x
├── Dependencies: All installed (express, better-sqlite3, etc.)
├── Code: Mounted from ./backend (live reload)
├── Database: Persisted in Docker volume
└── Port: 3001 exposed to host
```

---

## 🎯 Team Member Checklist

Each person should verify:

- [ ] Docker Desktop installed and running
- [ ] `docker-compose up` starts without errors
- [ ] http://localhost:3001/api/health returns 200 OK
- [ ] http://localhost:3001/api/metrics shows data
- [ ] Can view logs: `docker-compose logs -f backend`
- [ ] Can access container shell: `docker-compose exec backend sh`
- [ ] Can check database: `docker-compose exec backend node check-db.js`
- [ ] Frontend connects to backend successfully

---

## 🚀 Deploying to AWS

The Docker image works the same in AWS:

```bash
# Build production image
docker build -t zoom-backend:prod ./backend

# Tag for AWS ECR
docker tag zoom-backend:prod YOUR_ECR_REPO/zoom-backend:latest

# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ECR_REPO
docker push YOUR_ECR_REPO/zoom-backend:latest

# Deploy to ECS/Fargate
# See DEPLOYMENT_RUNBOOK.md for details
```

---

## 📚 Additional Documentation

- **`TEAM_SETUP.md`** - Detailed team setup guide
- **`DEPLOYMENT_RUNBOOK.md`** - Production deployment procedures
- **`SRE_IMPROVEMENTS_SUMMARY.md`** - All SRE features explained
- **`backend/Dockerfile`** - Container image definition
- **`docker-compose.yml`** - Local development orchestration

---

## 💡 Pro Tips

1. **Keep Docker running:** Leave Docker Desktop running during development
2. **Use `-d` flag:** Run `docker-compose up -d` to run in background
3. **Check logs often:** `docker-compose logs -f` to see what's happening
4. **Clean regularly:** `docker-compose down` when not using to free resources
5. **Volume persistence:** Database survives `docker-compose down` but not `down -v`

---

## 🆘 Getting Help

1. **Check logs:** `docker-compose logs backend`
2. **Check this guide:** Most issues covered above
3. **Check container status:** `docker-compose ps`
4. **Ask team:** Share logs in team chat
5. **Docker docs:** https://docs.docker.com/

---

## ✅ Benefits Summary

| Without Docker | With Docker |
|----------------|-------------|
| Each person different Node version | ✅ Everyone same environment |
| Complex nvm setup | ✅ Just `docker-compose up` |
| "Works on my machine" | ✅ Works everywhere |
| 30-min setup | ✅ 5-min setup |
| Version conflicts | ✅ No conflicts |
| Hard to onboard new members | ✅ Easy onboarding |
| Different from production | ✅ Same as production |

---

**Setup Time:** 5 minutes  
**Team Compatibility:** 100%  
**Maintenance:** Zero  
**Production Ready:** Yes  

**Status:** ✅ RECOMMENDED FOR ALL TEAM MEMBERS

---

**Last Updated:** October 22, 2025  
**Maintained By:** Team Bug Farmers SRE Team

