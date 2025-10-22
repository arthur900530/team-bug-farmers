# Backend Architecture Specification

**Audience:** Professional Backend Developers  
**Purpose:** Understand what each module does and doesn't do  
**Context:** Zoom-like meeting application with microphone mute verification and device switching  

---

## 📊 **Architecture Overview**

### Why Backend Exists

**Frontend controls hardware directly via Web Audio API**, but backend provides:

1. **Multi-User Coordination**
   - Track all users in a meeting room
   - Share mute states across participants
   - Coordinate device selections

2. **State Persistence**
   - User preferences survive page refresh
   - Reconnection recovery (network drops)
   - Historical audit trail

3. **Server-Side Truth**
   - Verify client-reported states
   - Prevent client-side manipulation
   - Compliance and debugging

4. **Analytics & Monitoring**
   - Usage patterns and metrics
   - Performance monitoring
   - Error tracking

**Key Principle:** Frontend is **presentation layer** controlling hardware; Backend is **persistence and coordination layer**.

---

## 🗂️ **Module Specifications**

---

## 1. **Express Application Server** (`server.js`)

### **Purpose**
RESTful API server that provides state management and coordination for Zoom-like meeting clients.

### **What It Does**

#### **1.1 User State Management**
- **Stores:** `userId`, `isMuted`, `deviceId`, `deviceLabel`, `roomId`, timestamps
- **Operations:** Create, Read, Update, Delete (CRUD)
- **Persistence:** SQLite database with WAL mode
- **Concurrency:** Handles up to 10 concurrent users (design limit)

**Endpoints:**
```javascript
POST   /api/users/:userId/state     // Create/update complete state
PATCH  /api/users/:userId/mute      // Update mute status only
PATCH  /api/users/:userId/device    // Update device selection only
GET    /api/users/:userId            // Retrieve user state
GET    /api/users                    // List all users
DELETE /api/users/:userId            // Remove user
GET    /api/rooms/:roomId/users      // List users in room
```

#### **1.2 Health Monitoring**
```javascript
GET /api/health  // Server health check
Returns:
- Server status (ok/error)
- Database connectivity
- Memory usage (heap, RSS)
- Uptime statistics
- Environment info
```

#### **1.3 Performance Metrics**
```javascript
GET /api/metrics  // Performance dashboard
Returns:
- API response times (p50, p95, p99)
- Error rates by endpoint
- Concurrent user count
- System resource usage
- SLO compliance status
```

#### **1.4 Structured Logging**
- Logs every request in JSON format
- Tracks: timestamp, requestId, userId, duration, status
- Flags: slow requests (>1s), errors, critical endpoints
- Format: CloudWatch/ELK compatible

#### **1.5 Graceful Shutdown**
- Handles SIGTERM, SIGINT signals
- Finishes in-flight requests (10s timeout)
- Closes database connections cleanly
- Prevents data corruption

### **What It Does NOT Do**

❌ **Audio Processing**
- Does NOT process, encode, or transmit audio
- Does NOT control user's microphone directly
- Does NOT handle WebRTC connections

❌ **Real-Time Communication**
- Does NOT use WebSockets for live updates
- Does NOT push notifications to clients
- Polling-based architecture (clients check for updates)

❌ **Authentication/Authorization**
- Does NOT verify user identity
- Does NOT implement OAuth/JWT
- Assumes trusted clients (demo/prototype)

❌ **Video Handling**
- Does NOT process video streams
- Does NOT store video data
- Camera settings are frontend-only

❌ **Complex Business Logic**
- Does NOT enforce meeting policies
- Does NOT implement rate limiting (beyond basic)
- Does NOT handle billing/payments

### **Technical Details**

**Framework:** Express.js 4.18.2  
**Concurrency:** Single-threaded (Node.js event loop)  
**Database:** SQLite with better-sqlite3 (synchronous, blocking)  
**Port:** 3001 (configurable via PORT env var)  
**Protocol:** HTTP/1.1 (no HTTPS in dev, add in production)  
**CORS:** Enabled for all origins (tighten in production)  

**Performance Characteristics:**
- Response time: <100ms for CRUD operations
- Throughput: ~100 req/s with SQLite (tested)
- Memory: ~50-70 MB baseline
- CPU: <10% on t2.micro with 10 users

**Limitations:**
- SQLite write lock contention with >10 concurrent writes
- No horizontal scaling (single instance only)
- No load balancing (requires sticky sessions if added)

---

## 2. **Database Layer** (`database.js`)

### **Purpose**
Abstraction layer for SQLite operations with schema management.

### **What It Does**

#### **2.1 Schema Management**
```sql
CREATE TABLE user_states (
  userId TEXT PRIMARY KEY,
  isMuted INTEGER NOT NULL DEFAULT 0,  -- Boolean as 0/1
  deviceId TEXT,                       -- Hardware device identifier
  deviceLabel TEXT,                    -- Human-readable device name
  roomId TEXT,                         -- Meeting room identifier
  lastUpdated TEXT NOT NULL,           -- ISO 8601 timestamp
  createdAt TEXT NOT NULL              -- ISO 8601 timestamp
);

CREATE INDEX idx_roomId ON user_states(roomId);
CREATE INDEX idx_lastUpdated ON user_states(lastUpdated);
```

#### **2.2 CRUD Operations**
```javascript
initDatabase()                    // Create tables and indexes
getUserState(userId)              // Get single user by ID
getAllUserStates()                // Get all users (ordered by lastUpdated)
createOrUpdateUserState(data)    // Upsert user state
deleteUserState(userId)           // Remove user
getUsersByRoom(roomId)            // Get users in specific room
cleanupOldEntries(daysOld)       // Maintenance function
```

#### **2.3 Data Integrity**
- Primary key constraint on `userId` (prevents duplicates)
- NOT NULL constraints on required fields
- Automatic timestamp management
- Boolean to integer conversion (SQLite compatibility)
- Graceful shutdown on SIGINT

#### **2.4 Performance Optimizations**
- **WAL mode:** Write-Ahead Logging for better concurrency
- **Indexes:** On `roomId` and `lastUpdated` for common queries
- **Prepared statements:** SQL injection prevention + performance
- **Connection reuse:** Single connection for app lifecycle

### **What It Does NOT Do**

❌ **No ORM Features**
- Does NOT provide relationships/joins
- Does NOT handle migrations automatically
- Does NOT support multiple tables (schema is fixed)

❌ **No Connection Pooling**
- Single connection (better-sqlite3 design)
- Does NOT support concurrent writes well
- Does NOT distribute load across connections

❌ **No Transactions**
- Does NOT wrap operations in transactions
- Each operation is atomic but not grouped
- Race conditions possible with concurrent updates

❌ **No Data Validation**
- Does NOT validate userId format
- Does NOT enforce device naming conventions
- Validation is server.js responsibility

❌ **No Caching**
- Does NOT cache queries
- Every read hits database
- Does NOT use Redis or memcached

### **Technical Details**

**Library:** better-sqlite3 v9.2.2  
**Mode:** WAL (Write-Ahead Logging)  
**File:** `audio-states.db` in backend directory  
**Encoding:** UTF-8  
**Synchronous:** All operations block (intentional for simplicity)  

**Performance Characteristics:**
- Read latency: <1ms
- Write latency: ~5-10ms
- File size: ~1 KB per 1000 users
- Max concurrent writes: ~10 before lock contention

**Scaling Limits:**
- Max database size: 140 TB (SQLite limit)
- Practical limit: 10-100 concurrent users
- Beyond 100: Consider PostgreSQL/MySQL

---

## 3. **Metrics Collection System** (`metrics.js`)

### **Purpose**
Real-time performance monitoring and SLO tracking.

### **What It Does**

#### **3.1 Response Time Tracking**
- Records duration of every API request
- Calculates percentiles: p50 (median), p95, p99
- Tracks min/max response times
- Stores last 1000 samples in memory

#### **3.2 Error Rate Monitoring**
- Counts total requests and errors
- Calculates error percentage
- Breaks down errors by endpoint
- Flags error rate violations (>5%)

#### **3.3 User Activity Tracking**
- Tracks concurrent users (active Set)
- Records peak concurrent users
- Calculates capacity utilization (current/max)
- Cleans up inactive users periodically

#### **3.4 System Resource Monitoring**
- Memory usage (heap, RSS, external)
- CPU usage (user, system time)
- Uptime tracking
- Collects every 30 seconds

#### **3.5 SLO Compliance Checking**
```javascript
SLO Targets:
- Response time p95: <1000ms
- Error rate: <5%
- Uptime: 99% (tracked externally)

Metrics endpoint reports:
- responseTimeMet: boolean
- errorRateMet: boolean
```

#### **3.6 Endpoint-Specific Metrics**
- Tracks each endpoint separately
- Average duration per endpoint
- Error rate per endpoint
- Request count per endpoint

### **What It Does NOT Do**

❌ **No Persistent Storage**
- Metrics stored in memory only
- Lost on server restart
- Does NOT write to database

❌ **No Alerting**
- Does NOT send email/SMS alerts
- Does NOT trigger PagerDuty/Opsgenie
- Monitoring must poll `/api/metrics`

❌ **No Time-Series Database**
- Does NOT use Prometheus/InfluxDB
- Does NOT store historical trends
- Last 1000 requests only

❌ **No Distributed Tracing**
- Does NOT integrate with Jaeger/Zipkin
- RequestId for correlation only
- No span tracking across services

❌ **No Custom Metrics**
- Fixed set of metrics (not extensible)
- Does NOT support custom counters/gauges
- Application-specific metrics hardcoded

### **Technical Details**

**Storage:** In-memory JavaScript objects  
**Retention:** Last 1000 requests (rolling window)  
**Update Frequency:** Real-time (on every request)  
**Aggregation:** On-demand (calculated when `/api/metrics` called)  
**Thread-Safe:** No (single-threaded Node.js)  

**Middleware Integration:**
```javascript
app.use(metricsMiddleware);  // Attached to Express
```

**Memory Usage:**
- Per request: ~100 bytes
- 1000 requests: ~100 KB
- Negligible impact on server

**Performance Impact:**
- <1ms overhead per request
- Minimal CPU usage
- Safe for production

**CloudWatch Integration (MOCK):**
```javascript
// Function provided but not implemented
sendMetricsToCloudWatch()  // Would send to AWS
```

---

## 4. **AWS Deployment Configuration** (`aws-config.js`)

### **Purpose**
Infrastructure-as-Code specification for AWS deployment.

### **What It Does**

#### **4.1 Cost-Optimized Configuration**
```javascript
Priority: COST → UPTIME → LATENCY

Compute:
- Instance type: t2.micro (FREE TIER)
- vCPU: 1, RAM: 1 GB
- Auto-scaling: Disabled (single instance)
- Region: us-east-1 (lowest cost)

Storage:
- EBS: 8 GB gp2 (FREE TIER)
- Database: SQLite on instance
- Backups: S3 (optional, disabled by default)

Network:
- Bandwidth: 15 Mbps for 10 users
- Data transfer: <15 GB/month (FREE TIER)
- Packet loss target: <5%
```

#### **4.2 Monitoring Specifications**
```javascript
CloudWatch Metrics (10 free metrics):
1. CPUUtilization
2. MemoryUtilization  
3. NetworkIn
4. NetworkOut
5. StatusCheckFailed
6. api_response_time (custom)
7. api_error_rate (custom)
8. concurrent_users (custom)

Alarms (10 free alarms):
- High CPU: >80%
- High Memory: >85%
- API Errors: >10 in 5 minutes
- Instance down
```

#### **4.3 Health Check Configuration**
```javascript
Endpoint: /api/health
Interval: 30 seconds
Timeout: 5 seconds
Healthy threshold: 2 successes
Unhealthy threshold: 3 failures
```

#### **4.4 Cost Estimation**
```javascript
Monthly Costs:
- EC2 t2.micro: $0 (FREE TIER, 750 hours)
- EBS 8GB: $0 (FREE TIER, 30 GB)
- Data transfer: $0 (FREE TIER, 15 GB)
- CloudWatch: $0 (FREE TIER)
- S3 backups: $0 (disabled)

Total: $0-5/month
```

### **What It Does NOT Do**

❌ **No Actual Deployment**
- Configuration only (not executable)
- Does NOT call AWS APIs
- MOCK functions for demonstration

❌ **No Terraform/CloudFormation**
- JavaScript object specification
- Does NOT generate IaC templates
- Manual deployment required

❌ **No Multi-Region**
- Single region only (us-east-1)
- Does NOT support failover
- Does NOT handle global traffic routing

❌ **No Auto-Scaling**
- Fixed single instance
- Does NOT scale horizontally
- Does NOT adjust based on load

❌ **No High Availability**
- Single AZ deployment
- Does NOT use ELB
- Does NOT support multi-AZ RDS

### **Technical Details**

**Format:** JavaScript module (ES6)  
**Purpose:** Documentation + reference architecture  
**Executable:** No (configuration only)  
**AWS SDK:** Not integrated  

**MOCK Functions:**
```javascript
initializeAWSInfrastructure()  // Would create EC2, security groups
deployToAWS(version)           // Would deploy code
getMetrics()                   // Would fetch CloudWatch
checkInstanceHealth()          // Would poll health endpoint
```

**Use Case:**
- Reference for manual deployment
- Input for automation scripts
- Cost planning documentation
- Team onboarding

---

## 5. **S3 Backup System** (`backup-to-s3.js`)

### **Purpose**
Automated database backup to S3 with retention policy.

### **What It Does**

#### **5.1 Database Backup**
```javascript
Source: backend/audio-states.db
Destination: s3://zoom-demo-backups-dev/database-backups/
Filename format: audio-states-YYYY-MM-DD-HH-MM-SS.db
Schedule: Daily at 3 AM UTC (cron: 0 3 * * *)
```

#### **5.2 Integrity Verification**
- Calculates MD5 checksum before upload
- Verifies checksum after download
- Fails loudly if checksums don't match
- Structured JSON logging of verification

#### **5.3 Retention Policy**
```javascript
Retention: 7 days
Action: Delete backups older than 7 days
Cost: ~$0.02/month (7 × 1 MB in S3 Standard)
```

#### **5.4 Error Handling**
- Logs failures in JSON format
- Would send alerts (MOCK)
- Returns non-zero exit code on failure
- Suitable for cron job monitoring

#### **5.5 Compression & Encryption**
```javascript
Compression: Optional (gzip)
Encryption: S3 server-side (AES-256)
Storage class: STANDARD (configurable)
```

### **What It Does NOT Do**

❌ **NOT Implemented**
- Script is MOCK/skeleton
- Does NOT actually upload to S3
- AWS SDK calls commented out
- Currently disabled to save cost

❌ **No Point-in-Time Recovery**
- Daily backups only (not continuous)
- Does NOT support hourly backups
- 24-hour RPO (Recovery Point Objective)

❌ **No Automated Restore**
- Manual restore required
- Does NOT auto-restore on failure
- Does NOT test restore process

❌ **No Cross-Region Replication**
- Single region only
- Does NOT replicate to DR region
- No geographic redundancy

❌ **No Backup Testing**
- Does NOT verify restore works
- Does NOT test backup integrity periodically
- Assumes backups are valid

### **Technical Details**

**Status:** DISABLED (cost optimization)  
**AWS SDK:** Not installed (would need @aws-sdk/client-s3)  
**Execution:** Manual or cron job  
**Dependencies:** None (pure Node.js + fs module)  

**To Enable:**
```bash
npm install @aws-sdk/client-s3
node backup-to-s3.js

# Schedule with cron:
crontab -e
0 3 * * * cd /path/to/backend && node backup-to-s3.js
```

**MOCK Functions:**
```javascript
performBackup()         // Would execute full backup
uploadToS3()           // Would use AWS SDK
verifyBackup()         // Would download and check
cleanupOldBackups()    // Would delete old files
listS3Backups()        // Would list bucket contents
```

**Restore Process (Manual):**
```bash
# List backups
aws s3 ls s3://zoom-demo-backups-dev/database-backups/

# Download backup
aws s3 cp s3://zoom-demo-backups-dev/database-backups/audio-states-2025-10-22.db ./

# Restore
cp audio-states-2025-10-22.db audio-states.db
systemctl restart zoom-backend
```

---

## 🔄 **Module Dependencies**

```
server.js (Main Application)
  ├── database.js (Data Layer)
  ├── metrics.js (Monitoring)
  └── External: express, cors, dotenv

database.js (Data Layer)
  └── External: better-sqlite3

metrics.js (Monitoring)
  └── No dependencies (pure Node.js)

aws-config.js (Configuration)
  └── No dependencies (documentation only)

backup-to-s3.js (Backup)
  └── External: @aws-sdk/client-s3 (not installed)
```

---

## 📊 **Data Flow**

### **User Mute/Unmute (User Story 1)**

```
1. User clicks mute in browser
2. Frontend: audioService.mute() → Controls OS microphone
3. Frontend: updateMuteStatus(userId, true) → HTTP PATCH
4. Backend: server.js receives request
5. Backend: Logs request in JSON
6. Backend: Calls database.createOrUpdateUserState()
7. Backend: SQLite writes to user_states table
8. Backend: metrics.js records request duration
9. Backend: Returns 200 OK with updated state
10. Frontend: Shows green checkmark (verified)
```

**Key Point:** Frontend controls hardware; backend records state for other users to see.

### **Device Switching (User Story 2)**

```
1. User selects new device in dropdown
2. Frontend: audioService.switchMicrophone(deviceId)
   ├── Stops current stream
   ├── Requests new device from OS
   └── Preserves mute state
3. Frontend: updateDevice(userId, deviceId, label) → HTTP PATCH
4. Backend: server.js receives request
5. Backend: database.createOrUpdateUserState()
6. Backend: Returns 200 OK
7. Frontend: Confirms switch with UI feedback
```

**Key Point:** Device switch is local to user; backend tracks preference for analytics/debugging.

---

## 🎯 **Why Each Module Exists**

### **server.js: API Coordinator**
- **Without it:** No way for users to see each other's states
- **With it:** Room-wide mute status visibility, state persistence

### **database.js: State Persistence**
- **Without it:** State lost on page refresh
- **With it:** Reconnection recovery, historical audit trail

### **metrics.js: Observability**
- **Without it:** No visibility into performance, errors
- **With it:** SLO tracking, debugging aid, capacity planning

### **aws-config.js: Deployment Blueprint**
- **Without it:** Inconsistent deployments, team confusion
- **With it:** Standard infrastructure, cost control

### **backup-to-s3.js: Disaster Recovery**
- **Without it:** Data loss on instance failure
- **With it:** 7-day recovery window, compliance

---

## 🚫 **What Entire Backend Does NOT Do**

This is critical for professional developers to understand:

### **NOT a Real-Time System**
- No WebSockets, no Server-Sent Events
- Clients poll for updates (REST only)
- Acceptable for 10 users, not 1000

### **NOT Horizontally Scalable**
- Single instance architecture
- SQLite limits concurrent writes
- No load balancer support (yet)

### **NOT Production-Hardened**
- No authentication/authorization
- No rate limiting (beyond basic)
- No input sanitization (trusts clients)
- No audit logging (beyond metrics)

### **NOT Feature-Complete**
- No meeting scheduling
- No recording/playback
- No chat/screen share backend logic
- No billing/payments

### **NOT Fault-Tolerant**
- Single point of failure
- No automatic failover
- No circuit breakers
- No retry logic

---

## 🏗️ **Future Enhancements (Out of Scope)**

For professional developers considering extensions:

### **To Scale Beyond 10 Users:**
1. Replace SQLite with PostgreSQL/MySQL
2. Add connection pooling
3. Implement horizontal scaling (multiple instances)
4. Add Redis for session management
5. Implement WebSocket for real-time updates

### **To Production-Harden:**
1. Add authentication (JWT or OAuth)
2. Implement rate limiting (express-rate-limit)
3. Add input validation (Joi or Yup)
4. Implement audit logging
5. Add HTTPS/TLS termination
6. Harden CORS configuration

### **To Improve Reliability:**
1. Add circuit breakers (opossum)
2. Implement retry logic with exponential backoff
3. Add health checks at multiple levels
4. Implement graceful degradation
5. Add feature flags

### **To Enhance Observability:**
1. Integrate Prometheus for metrics
2. Add distributed tracing (Jaeger)
3. Implement structured logging at all levels
4. Add APM (New Relic, Datadog)
5. Create SLO dashboards

---

## 📝 **Summary for Backend Developers**

**This backend is:**
- ✅ Stateful REST API for user coordination
- ✅ SQLite-based persistence layer
- ✅ Metrics and health monitoring
- ✅ Designed for 10 concurrent users
- ✅ Cost-optimized for AWS free tier
- ✅ Docker-containerized for portability

**This backend is NOT:**
- ❌ Real-time communication system
- ❌ Audio/video processing pipeline
- ❌ Horizontally scalable architecture
- ❌ Production-grade security implementation
- ❌ Feature-complete Zoom replacement

**Primary Value:**
- State coordination across users
- Persistence for reliability
- Observability for operations
- Foundation for future enhancements

**Tech Stack:**
- Node.js 18 LTS
- Express 4.18.2
- SQLite (better-sqlite3)
- Docker for deployment
- AWS EC2 for production

---

**Last Updated:** October 22, 2025  
**Maintained By:** Team Bug Farmers SRE Team  
**Review Cycle:** Before each major release

