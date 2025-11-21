# AWS Deploymnet

### 1. Accessing the Server
First, you need to log in to the specific computer (VM) running your code.

- **Command:**
```ruby
ssh -i "your-original-key.pem" ubuntu@<VM instance>
```

- **Navigate to your folder:**
```ruby
cd ~/team-bug-farmers/backend
```

### 2. Checking Health
These are the commands you run to see if the server is happy or crashing.
- **Check Status (Is it Online?):**
```ruby
sudo pm2 list
```
_Look for online in green._

- **Check Live Logs (What is it doing right now?):**
```bash
sudo pm2 logs mediasoup-server
```
_Press Ctrl + C to exit the log view._

- **Check Network (Is it listening to the port?):**
```bash
sudo lsof -i :443
```
_You should see a process named node listening._


### 3. Manual Updates (If not using GitHub Actions)
If you change code locally and want to update the server manually:

- **Get the latest code:**
```ruby
git pull origin main
```

- **Install new libraries (if any):**
```ruby
npm install
```

- **Re-compile TypeScript:**
```ruby
npm run build
```

### 4. Controlling the Server
You have two ways to restart.

**Option A:** The "Soft" Restart Use this if you just changed code but did not change Environment Variables.

```ruby
sudo pm2 restart mediasoup-server
```

**Option B:** The "Hard" Reset (Recommended) Use this if you changed the IP, SSL paths, or if the server is acting weird. This wipes the memory and starts fresh.

1. **Delete the old process:**
```ruby
sudo pm2 delete mediasoup-server
```

2. **Start fresh (Copy-paste the whole block):**
```
sudo \
WS_PORT=443 \
USE_SSL=true \
SSL_CERT_PATH=/etc/letsencrypt/live/34.193.221.159.nip.io/fullchain.pem \
SSL_KEY_PATH=/etc/letsencrypt/live/34.193.221.159.nip.io/privkey.pem \
ANNOUNCED_IP=34.193.221.159 \
pm2 start dist/server.js --name "mediasoup-server"
```
