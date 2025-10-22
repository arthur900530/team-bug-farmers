# 🚀 Deployment Runbook

**Team:** Bug Farmers (10 people max)  
**System:** Zoom Demo Backend + Frontend  
**Audience:** Team members, teaching staff (graders)  
**Purpose:** Step-by-step guide for deploying and operating the system  

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [AWS Deployment](#aws-deployment)
5. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
6. [Operational Procedures](#operational-procedures)
7. [Monitoring & Metrics](#monitoring--metrics)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)
10. [Emergency Contacts](#emergency-contacts)

---

## 📊 System Overview

### Architecture

```
┌─────────────────────┐         HTTPS          ┌──────────────────────┐
│   Frontend          │◀──────────────────────▶│   Users              │
│   (Vercel)          │                        │   (Browsers)         │
│   Port: 443         │                        └──────────────────────┘
└──────────┬──────────┘
           │ API Calls (HTTP/REST)
           │
┌──────────▼──────────┐
│   Backend           │
│   (AWS EC2)         │
│   Port: 3001        │
└──────────┬──────────┘
           │ SQL Queries
           │
┌──────────▼──────────┐
│   Database          │
│   (SQLite File)     │
│   audio-states.db   │
└─────────────────────┘
```

### Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js 18, Express.js, better-sqlite3
- **Database:** SQLite with WAL mode
- **Cloud:** AWS EC2 t2.micro, Vercel (free tier)
- **Monitoring:** Structured JSON logs, CloudWatch (ready)

### SLO (Service Level Objectives)

- **Uptime:** 99% (acceptable: ~7 hours downtime/month)
- **Response Time:** p95 < 1000ms
- **Error Rate:** < 5%
- **Concurrent Users:** Maximum 10
- **Packet Loss:** < 5% (for audio/video quality)

---

## 🔧 Prerequisites

### Required Tools

```bash
# Check if you have these installed:
node --version    # Should be v18.x.x or v20.x.x (LTS)
npm --version     # Should be v9.x.x or v10.x.x
git --version     # Any recent version

# For AWS deployment:
aws --version     # AWS CLI (optional but recommended)
ssh --version     # For connecting to EC2
```

### Required Accounts

- [x] GitHub account (for code repository)
- [x] AWS account (for backend hosting)
- [x] Vercel account (for frontend hosting)

### Access Requirements

- [x] SSH key for EC2 access
- [x] AWS credentials (access key ID, secret access key)
- [x] Vercel account linked to GitHub repo

---

## 💻 Local Development Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/arthur900530/team-bug-farmers.git
cd team-bug-farmers
```

### Step 2: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 3: Start Backend (Terminal 1)

```bash
cd backend
npm start

# Expected output:
# ==========================================
# 🚀 Zoom Demo Backend Server
# ==========================================
# ✅ Server running on http://localhost:3001
# ✅ API available at http://localhost:3001/api
# ✅ Health check: http://localhost:3001/api/health
# ==========================================
```

### Step 4: Start Frontend (Terminal 2)

```bash
# In project root
npm run dev

# Expected output:
# VITE v5.x.x  ready in XXX ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

### Step 5: Verify Local Setup

Open browser and test:

```bash
# Backend health check
curl http://localhost:3001/api/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2025-10-22T...",
#   "database": { "status": "connected" },
#   ...
# }

# Frontend
# Open: http://localhost:5173/
# Click "Join Meeting" → Should see interface
```

---

## ☁️ AWS Deployment

### Pre-Deployment Checklist

- [ ] Code tested locally
- [ ] All tests passing (if applicable)
- [ ] Environment variables configured
- [ ] AWS credentials configured
- [ ] Backup of current database (if updating)

### Option 1: EC2 Manual Deployment (Recommended for Demo)

#### Step 1: Launch EC2 Instance

```bash
# Using AWS Console:
1. Go to AWS Console → EC2 → Launch Instance
2. Name: zoom-demo-backend-prod
3. AMI: Amazon Linux 2023 (free tier eligible)
4. Instance type: t2.micro (FREE TIER)
5. Key pair: Create or select existing SSH key
6. Security group:
   - Allow SSH (22) from your IP
   - Allow HTTP (3001) from anywhere (0.0.0.0/0)
7. Storage: 8 GB gp2 (default, FREE TIER)
8. Launch instance
```

#### Step 2: Connect to Instance

```bash
# Get public IP from AWS Console
# Example: 54.123.456.789

# Connect via SSH
ssh -i /path/to/your-key.pem ec2-user@54.123.456.789

# If permission denied:
chmod 400 /path/to/your-key.pem
```

#### Step 3: Install Node.js on EC2

```bash
# On EC2 instance:

# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Activate nvm
source ~/.bashrc

# Install Node.js 18 LTS
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show v9.x.x
```

#### Step 4: Clone and Setup Application

```bash
# Clone repository
git clone https://github.com/arthur900530/team-bug-farmers.git
cd team-bug-farmers/backend

# Install production dependencies only
npm install --production

# Verify setup
npm start

# Press Ctrl+C to stop after verifying it starts
```

#### Step 5: Set Up as System Service

```bash
# Create systemd service file
sudo nano /etc/systemd/system/zoom-backend.service
```

**Add this content:**

```ini
[Unit]
Description=Zoom Demo Backend Server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/team-bug-farmers/backend
ExecStart=/home/ec2-user/.nvm/versions/node/v18.20.4/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=zoom-backend

# Environment variables
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

**Enable and start service:**

```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable zoom-backend

# Start service
sudo systemctl start zoom-backend

# Check status
sudo systemctl status zoom-backend

# View logs
sudo journalctl -u zoom-backend -f
```

#### Step 6: Configure Firewall (if needed)

```bash
# Allow traffic on port 3001
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

#### Step 7: Verify Deployment

```bash
# From your local machine:
curl http://YOUR-EC2-PUBLIC-IP:3001/api/health

# Expected response:
# {
#   "status": "ok",
#   "database": { "status": "connected" },
#   "environment": "production"
# }
```

### Option 2: AWS Elastic Beanstalk (Alternative)

**Note:** Elastic Beanstalk provides easier management but similar cost to EC2.

```bash
# Install EB CLI
pip install awsebcli

# Initialize Elastic Beanstalk
cd backend
eb init

# Create environment
eb create zoom-demo-backend-prod --instance-type t2.micro

# Deploy
eb deploy

# Open in browser
eb open
```

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Connect GitHub to Vercel

```bash
# Option A: Vercel CLI
npm install -g vercel
vercel login
vercel

# Option B: Vercel Dashboard
# 1. Go to https://vercel.com
# 2. Click "Import Project"
# 3. Select GitHub repository: arthur900530/team-bug-farmers
# 4. Configure:
#    - Framework: Vite
#    - Root Directory: ./
#    - Build Command: npm run build
#    - Output Directory: dist
```

### Step 2: Configure Environment Variables

In Vercel dashboard, add:

```
VITE_API_URL=http://YOUR-EC2-PUBLIC-IP:3001/api
```

### Step 3: Deploy

```bash
# Automatic deployment on git push to main
git push origin main

# Manual deployment
vercel --prod

# Expected output:
# ✔ Deployed to production
# 🔍 Inspect: https://vercel.com/...
# ✅ Production: https://team-bug-farmers.vercel.app
```

### Step 4: Verify Frontend

```bash
# Open in browser:
https://team-bug-farmers.vercel.app

# Or your custom domain
```

---

## 🔄 Operational Procedures

### Starting the System (For Demo)

```bash
# 1. Start Backend (AWS EC2)
ssh -i your-key.pem ec2-user@YOUR-EC2-IP
sudo systemctl start zoom-backend
sudo systemctl status zoom-backend  # Verify running

# 2. Frontend (Vercel) is always running (no action needed)

# 3. Verify system
curl http://YOUR-EC2-IP:3001/api/health
# Should return: "status": "ok"

# 4. Open frontend in browser
# https://team-bug-farmers.vercel.app
```

### Stopping the System (To Save Costs)

```bash
# 1. Stop Backend
ssh -i your-key.pem ec2-user@YOUR-EC2-IP
sudo systemctl stop zoom-backend

# 2. Optional: Stop EC2 instance (to save free tier hours)
# AWS Console → EC2 → Select instance → Instance State → Stop

# 3. Frontend (Vercel) can stay running (free)
```

### Updating the Application

```bash
# 1. Make code changes locally
git add .
git commit -m "Fix: describe your changes"

# 2. Push to GitHub
git push origin main

# 3. Frontend auto-deploys (Vercel watches GitHub)

# 4. Deploy backend manually:
ssh -i your-key.pem ec2-user@YOUR-EC2-IP
cd team-bug-farmers/backend
git pull origin main
npm install --production
sudo systemctl restart zoom-backend

# 5. Verify deployment
curl http://YOUR-EC2-IP:3001/api/health
```

### Viewing Logs

```bash
# Backend logs (structured JSON)
ssh -i your-key.pem ec2-user@YOUR-EC2-IP

# Real-time logs
sudo journalctl -u zoom-backend -f

# Last 100 lines
sudo journalctl -u zoom-backend -n 100

# Filter by time
sudo journalctl -u zoom-backend --since "1 hour ago"

# Filter errors only
sudo journalctl -u zoom-backend | grep '"level":"ERROR"'

# Frontend logs
# View in Vercel dashboard → Project → Logs
```

### Database Operations

```bash
# Connect to EC2
ssh -i your-key.pem ec2-user@YOUR-EC2-IP
cd team-bug-farmers/backend

# View database contents
node check-db.js

# Clear database (testing)
node clear-db.js

# Manual backup (before major changes)
cp audio-states.db audio-states-backup-$(date +%Y%m%d).db

# Restore from backup
cp audio-states-backup-YYYYMMDD.db audio-states.db
sudo systemctl restart zoom-backend
```

---

## 📈 Monitoring & Metrics

### Health Check Endpoints

```bash
# Backend health
curl http://YOUR-EC2-IP:3001/api/health

# Returns:
# - status: ok/error
# - uptime: seconds
# - database: connected/error
# - memory: heap usage
# - environment: production/development
```

### Metrics Endpoint

```bash
# View detailed metrics
curl http://YOUR-EC2-IP:3001/api/metrics

# Returns:
# - api.responseTime (p50, p95, p99)
# - api.errorRate
# - users.current (concurrent users)
# - users.peak
# - system.memory, system.cpu
# - slo.responseTimeMet, slo.errorRateMet
```

### Key Metrics to Watch

| Metric | Target | Alert If |
|--------|--------|----------|
| Response Time (p95) | < 1000ms | > 1500ms |
| Error Rate | < 5% | > 10% |
| Concurrent Users | ≤ 10 | > 10 |
| CPU Utilization | < 70% | > 85% |
| Memory Usage | < 85% | > 90% |
| Uptime | 99% | Service down > 5min |

### Setting Up CloudWatch (Optional)

```bash
# Install CloudWatch agent on EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/linux/amd64/latest/AmazonCloudWatchAgent.zip
unzip AmazonCloudWatchAgent.zip
sudo ./install.sh

# Configure agent (create config file)
# See: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-cloudwatch-agent-configuration-file.html

# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/path/to/config.json
```

---

## 🐛 Troubleshooting

### Issue: Backend won't start

**Symptoms:** `sudo systemctl status zoom-backend` shows "failed"

**Diagnosis:**
```bash
# Check logs
sudo journalctl -u zoom-backend -n 50

# Common causes:
# - Port 3001 already in use
# - Database file permissions
# - Node.js not found
# - Missing dependencies
```

**Solutions:**
```bash
# Check if port is in use
sudo lsof -i :3001

# Fix permissions
cd /home/ec2-user/team-bug-farmers/backend
chmod 644 audio-states.db
chmod 755 .

# Reinstall dependencies
npm install --production

# Test manually (as ec2-user)
node server.js
```

### Issue: Frontend can't connect to backend

**Symptoms:** "Backend not available" in frontend logs

**Diagnosis:**
```bash
# Test backend from local machine
curl http://YOUR-EC2-IP:3001/api/health

# Check security group
# AWS Console → EC2 → Security Groups → Check inbound rules
```

**Solutions:**
```bash
# Fix security group:
# - Add inbound rule: Type=Custom TCP, Port=3001, Source=0.0.0.0/0

# Check backend is running
ssh ec2-user@YOUR-EC2-IP
sudo systemctl status zoom-backend

# Check environment variable in Vercel
# Vercel Dashboard → Project → Settings → Environment Variables
# VITE_API_URL should be http://YOUR-EC2-IP:3001/api
```

### Issue: Database locked errors

**Symptoms:** "database is locked" in logs

**Diagnosis:**
```bash
# Check for zombie processes
ps aux | grep node

# Check database connections
fuser audio-states.db
```

**Solutions:**
```bash
# Kill zombie processes
killall node

# Restart backend
sudo systemctl restart zoom-backend

# If persistent, check WAL mode
sqlite3 audio-states.db "PRAGMA journal_mode;"
# Should return: wal
```

### Issue: High memory usage

**Symptoms:** System slow, high memory in /api/metrics

**Solutions:**
```bash
# Check memory
free -h

# Restart backend to clear memory
sudo systemctl restart zoom-backend

# If persistent, check for memory leaks:
node --inspect server.js
# Connect Chrome DevTools to profile
```

### Issue: Deployment failed

**Symptoms:** `git pull` shows merge conflicts, service won't restart

**Solutions:**
```bash
# Backup database
cp audio-states.db audio-states-backup.db

# Force update (CAUTION: loses local changes)
git fetch origin
git reset --hard origin/main

# Reinstall dependencies
npm install --production

# Restart
sudo systemctl restart zoom-backend
```

---

## ↩️ Rollback Procedures

### Strategy: Git Revert + Redeploy

### Step 1: Identify Last Good Version

```bash
# View recent commits
git log --oneline -10

# Example output:
# abc1234 Fix: mute button bug
# def5678 Feature: device switching
# ghi9012 [LAST KNOWN GOOD]
```

### Step 2: Rollback Code

```bash
# Option A: Revert specific commit
git revert abc1234
git push origin main

# Option B: Reset to last good commit (more aggressive)
git reset --hard ghi9012
git push -f origin main  # Force push (use with caution)
```

### Step 3: Redeploy Backend

```bash
# Connect to EC2
ssh -i your-key.pem ec2-user@YOUR-EC2-IP

# Pull rollback
cd team-bug-farmers/backend
git pull origin main

# Reinstall (in case dependencies changed)
npm install --production

# Restart service
sudo systemctl restart zoom-backend

# Verify
curl http://localhost:3001/api/health
```

### Step 4: Verify Frontend

```bash
# Vercel auto-deploys on git push
# Check Vercel dashboard for deployment status

# If needed, manually trigger:
vercel --prod
```

### Step 5: Restore Database (if needed)

```bash
# On EC2:
cd /home/ec2-user/team-bug-farmers/backend

# List backups
ls -lh audio-states-backup-*.db

# Restore from backup
sudo systemctl stop zoom-backend
cp audio-states-backup-YYYYMMDD.db audio-states.db
sudo systemctl start zoom-backend
```

### Emergency Rollback (< 5 minutes)

```bash
# If system is completely broken:

# 1. Stop service
ssh ec2-user@YOUR-EC2-IP
sudo systemctl stop zoom-backend

# 2. Restore from last backup
cp audio-states-backup-latest.db audio-states.db

# 3. Checkout last known good commit
cd team-bug-farmers/backend
git checkout ghi9012  # Last known good

# 4. Start service
sudo systemctl start zoom-backend

# 5. Notify team
# Post in team chat: "Emergency rollback to commit ghi9012"
```

---

## 📞 Emergency Contacts

### Team Bug Farmers

| Role | Name | Contact | Responsibilities |
|------|------|---------|------------------|
| Team Lead | [Your Name] | [Your Email] | Overall coordination |
| Backend Lead | [Name] | [Email] | Backend deployment, database |
| Frontend Lead | [Name] | [Email] | Frontend deployment, UI |
| SRE/Ops | [Name] | [Email] | AWS infrastructure, monitoring |

### Escalation Path

1. **First response:** Any team member can diagnose and attempt fix
2. **If unresolved in 10 min:** Escalate to relevant lead (Backend/Frontend)
3. **If unresolved in 30 min:** Escalate to Team Lead
4. **If critical (system down during demo):** Emergency rollback

### Teaching Staff (Graders)

- **Course:** 17616 AI Tools for Software Development
- **Semester:** Fall 2025
- **Teaching Staff Contact:** [Via course platform]

### AWS Support

- **Support Level:** Basic (included in free tier)
- **Access:** AWS Console → Support → Create Case
- **Response Time:** 12-24 hours (non-critical)

---

## 📚 Additional Resources

### Documentation

- [Backend API Documentation](./backend/README.md)
- [Database Guide](./DATABASE_GUIDE.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [AWS Configuration](./backend/aws-config.js)

### External Links

- [AWS Free Tier Details](https://aws.amazon.com/free/)
- [Vercel Documentation](https://vercel.com/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

### Useful Commands Reference

```bash
# System Status
sudo systemctl status zoom-backend
curl http://localhost:3001/api/health
curl http://localhost:3001/api/metrics

# Logs
sudo journalctl -u zoom-backend -f
sudo journalctl -u zoom-backend -n 100 --no-pager

# Database
node check-db.js
node clear-db.js
sqlite3 audio-states.db ".tables"

# Git
git status
git log --oneline -10
git revert <commit>

# AWS
aws ec2 describe-instances
aws s3 ls
aws cloudwatch get-metric-statistics --namespace ZoomDemo
```

---

## ✅ Pre-Demo Checklist

**24 hours before demo:**
- [ ] Pull latest code from GitHub
- [ ] Test locally (frontend + backend)
- [ ] Backup production database
- [ ] Deploy to AWS EC2
- [ ] Deploy to Vercel
- [ ] Verify health checks pass
- [ ] Test all user stories work
- [ ] Check CloudWatch metrics (if enabled)

**1 hour before demo:**
- [ ] Verify backend is running
- [ ] Verify frontend is accessible
- [ ] Test joining meeting
- [ ] Test mute/unmute
- [ ] Test device switching
- [ ] Check latency and response times
- [ ] Have rollback plan ready

**During demo:**
- [ ] Monitor /api/metrics endpoint
- [ ] Watch for errors in logs
- [ ] Have backup EC2 instance ready (optional)

**After demo:**
- [ ] Stop EC2 instance (to save free tier hours)
- [ ] Backup database
- [ ] Review metrics and logs
- [ ] Document any issues for next time

---

**Last Updated:** 2025-10-22  
**Version:** 1.0.0  
**Maintained By:** Team Bug Farmers SRE Team

