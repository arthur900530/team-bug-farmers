# Frontend vs Backend Rebuild Requirements

**Date:** November 14, 2025  
**Purpose:** Explain when and why frontend and backend need to be rebuilt  
**Context:** Understanding deployment and testing workflows

---

## 🎯 Quick Answer

**Frontend (Vite):**
- ✅ **Must rebuild** for environment variable changes (e.g., `VITE_WS_URL`)
- ✅ **Must rebuild** for code changes
- **Reason:** Vite bakes environment variables into the build at compile time

**Backend (Node.js):**
- ❌ **No rebuild needed** for environment variable changes
- ✅ **Must rebuild** for TypeScript code changes (to compile TS → JS)
- **Reason:** Node.js reads environment variables at runtime

---

## 📚 Detailed Explanation

### Frontend (Vite) - Why Rebuild is Required

**How Vite Handles Environment Variables:**

1. **Build-Time Replacement:**
   ```typescript
   // In your code (UserClient.ts)
   const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
   ```

2. **During Build (`npm run build`):**
   - Vite scans your code for `import.meta.env.VITE_*` references
   - **Replaces them with actual values** at build time
   - The built JavaScript file contains the literal value, not a variable

3. **Result:**
   ```javascript
   // Built file (dist/main.js) - what actually runs
   const wsUrl = 'wss://34.193.221.159.nip.io:443'; // Hardcoded!
   ```

**Why This Design?**
- **Performance:** No runtime overhead to read env vars
- **Tree-shaking:** Dead code elimination works better with static values
- **Security:** Sensitive values can be validated at build time

**Implications:**
- ✅ Changing `VITE_WS_URL` → **Must rebuild** (`npm run build`)
- ✅ Changing any code → **Must rebuild**
- ❌ Changing env var after build → **Won't work** (value is already baked in)

---

### Backend (Node.js) - Why Rebuild is NOT Required for Env Vars

**How Node.js Handles Environment Variables:**

1. **Runtime Reading:**
   ```typescript
   // In your code (server.ts)
   const WS_PORT = parseInt(process.env.WS_PORT || '8080');
   const USE_SSL = process.env.USE_SSL === 'true';
   ```

2. **At Runtime:**
   - Node.js reads `process.env` from the operating system
   - Values are read **every time the process starts**
   - No build-time replacement

3. **Result:**
   ```javascript
   // Compiled file (dist/server.js) - still reads from process.env
   const WS_PORT = parseInt(process.env.WS_PORT || '8080'); // Runtime read!
   ```

**Why This Design?**
- **Flexibility:** Same build can run in different environments
- **Configuration:** Easy to change settings without rebuilding
- **DevOps:** Standard practice for containerized deployments

**Implications:**
- ❌ Changing `WS_PORT` → **No rebuild needed**, just restart with new env var
- ❌ Changing `USE_SSL` → **No rebuild needed**, just restart with new env var
- ✅ Changing TypeScript code → **Must rebuild** (to compile TS → JS)
- ✅ Changing dependencies → **Must rebuild** (to ensure compatibility)

---

## 🔄 When Do You Need to Rebuild?

### Scenario 1: Changing Environment Variables

**Frontend:**
```bash
# ❌ This won't work - env var is already baked into the build
VITE_WS_URL=wss://new-url.com npm run preview

# ✅ This works - rebuild with new env var
VITE_WS_URL=wss://34.193.221.159.nip.io:443 npm run build
npm run preview
```

**Backend:**
```bash
# ✅ This works - no rebuild needed, just restart with new env var
WS_PORT=443 USE_SSL=true npm start

# Or with PM2
WS_PORT=443 USE_SSL=true pm2 restart mediasoup-server
```

### Scenario 2: Changing Code

**Both Frontend and Backend:**
```bash
# Frontend
npm run build  # ✅ Must rebuild

# Backend
npm run build  # ✅ Must rebuild (TypeScript → JavaScript)
npm start      # ✅ Then restart
```

### Scenario 3: Minor Code Change (e.g., fixing a typo)

**Frontend:**
- ✅ Must rebuild (even for tiny changes)
- Build is fast (~5-10 seconds)

**Backend:**
- ✅ Must rebuild (TypeScript needs compilation)
- Then restart PM2 process
- Rebuild is fast (~3-5 seconds)

---

## 🚀 Deployment Workflows

### Frontend Deployment (Amplify)

**Current Workflow:**
1. Code changes pushed to GitHub
2. Amplify detects changes
3. **Amplify runs `npm run build`** (with env vars from Amplify console)
4. Deploys built files

**Important:** 
- Amplify must have `VITE_WS_URL` configured in the console
- Every deployment triggers a rebuild (this is normal and expected)

### Backend Deployment (EC2 via GitHub Actions)

**Current Workflow (from `.github/workflows/deploy-aws.yml`):**
1. Code changes pushed to GitHub
2. GitHub Actions triggers
3. SSH into EC2
4. `git pull` (get latest code)
5. `npm install` (update dependencies if needed)
6. **`npm run build`** (compile TypeScript)
7. **Restart PM2 with env vars** (no rebuild needed for env var changes)

**Important:**
- Env vars are passed to PM2 at startup
- If you change env vars, just restart PM2 (no rebuild needed)
- If you change code, rebuild + restart

---

## 💡 Best Practices

### 1. **Separate Builds for Different Environments**

**Frontend:**
```bash
# Development build
VITE_WS_URL=ws://localhost:8080 npm run build

# Production build
VITE_WS_URL=wss://34.193.221.159.nip.io:443 npm run build
```

**Backend:**
```bash
# Same build works for all environments
npm run build

# Just change env vars at runtime
# Development
WS_PORT=8080 USE_SSL=false npm start

# Production
WS_PORT=443 USE_SSL=true ANNOUNCED_IP=34.193.221.159 npm start
```

### 2. **Use Environment-Specific Build Scripts**

**package.json:**
```json
{
  "scripts": {
    "build:dev": "VITE_WS_URL=ws://localhost:8080 npm run build",
    "build:prod": "VITE_WS_URL=wss://34.193.221.159.nip.io:443 npm run build"
  }
}
```

### 3. **Backend: Use PM2 Ecosystem File**

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'mediasoup-server',
    script: 'dist/server.js',
    env: {
      WS_PORT: 8080,
      USE_SSL: false,
    },
    env_production: {
      WS_PORT: 443,
      USE_SSL: true,
      SSL_CERT_PATH: '/etc/letsencrypt/live/34.193.221.159.nip.io/fullchain.pem',
      SSL_KEY_PATH: '/etc/letsencrypt/live/34.193.221.159.nip.io/privkey.pem',
      ANNOUNCED_IP: '34.193.221.159',
    }
  }]
};
```

Then:
```bash
pm2 start ecosystem.config.js --env production
```

---

## ❓ FAQ

### Q: Why can't Vite read env vars at runtime like Node.js?

**A:** Vite is designed for static site generation and optimization. Runtime env var reading would:
- Add runtime overhead
- Prevent tree-shaking optimizations
- Make bundle size analysis harder
- Break some build optimizations

### Q: Can I use a config file instead of env vars for frontend?

**A:** Yes, but you'd still need to rebuild when the config changes. Common approaches:
- **Runtime config:** Load from `/config.json` via fetch (adds network request)
- **Build-time config:** Use env vars (current approach, recommended)

### Q: What if I only change a comment or formatting?

**A:** You still need to rebuild, but:
- **Frontend:** Vite is smart and only rebuilds changed files
- **Backend:** TypeScript compiler is fast for small changes
- Both rebuilds are typically < 10 seconds

### Q: Can I avoid rebuilding frontend for env var changes?

**A:** Not with the current Vite setup. Alternatives:
1. Use runtime config loading (fetch from `/config.json`)
2. Use multiple builds for different environments
3. Accept that rebuilds are fast and part of the workflow

---

## 📊 Summary Table

| Change Type | Frontend Rebuild? | Backend Rebuild? | Backend Restart? |
|------------|-------------------|------------------|------------------|
| **Env Var Change** | ✅ Yes | ❌ No | ✅ Yes |
| **Code Change** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Dependency Change** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Config File Change** | ✅ Yes | ❌ No | ✅ Yes |
| **Comment/Formatting** | ✅ Yes* | ✅ Yes* | ✅ Yes* |

*Technically yes, but very fast (< 5 seconds)

---

## 🔗 References

- **Vite Environment Variables:** https://vitejs.dev/guide/env-and-mode.html
- **Node.js process.env:** https://nodejs.org/api/process.html#process_process_env
- **PM2 Ecosystem File:** https://pm2.keymetrics.io/docs/usage/application-declaration/
- **AWS Deployment:** `AWS_deploy.md`
- **GitHub Actions Workflow:** `.github/workflows/deploy-aws.yml`

---

**Last Updated:** November 14, 2025

