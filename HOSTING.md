# Hosting Guide - Tournament Control System

This guide explains how to deploy your tournament control system to a public server.

## Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect and deploy your Node.js app
   - Your app will be live at a railway.app URL

3. **Configuration**
   - Railway automatically sets PORT environment variable
   - No additional configuration needed!

### Option 2: Render

1. **Push code to GitHub** (same as above)

2. **Deploy to Render**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Build Command**: `npm install && npm run install-all && npm run build`
     - **Start Command**: `npm start`
     - **Environment**: Node
   - Click "Create Web Service"

3. **Add Persistent Disk** (Important for database)
   - In your service settings, go to "Disks"
   - Add a disk mounted at `/app/server`
   - This ensures your SQLite database persists

### Option 3: Fly.io

1. **Install Fly CLI**
   ```bash
   # Mac
   brew install flyctl
   
   # Windows/Linux - see https://fly.io/docs/hands-on/install-flyctl/
   ```

2. **Deploy**
   ```bash
   fly launch
   # Follow the prompts
   fly deploy
   ```

## Manual Server Deployment (VPS)

If you have your own server (DigitalOcean, Linode, etc.):

### 1. Install Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### 2. Clone and Setup
```bash
# Clone your repository
git clone YOUR_REPO_URL
cd tournament-control

# Install dependencies
npm run install-all

# Build frontend
npm run build

# Start server
npm start
```

### 3. Keep Running with PM2
```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start server/index.js --name tournament-control

# Save PM2 config
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

### 4. Setup Nginx Reverse Proxy (Optional but recommended)
```bash
# Install nginx
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/tournament
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/tournament /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Environment Variables

Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

Edit as needed:
- `PORT`: Server port (default: 8080)
- `NODE_ENV`: Set to `production` for production

## Important Notes

### WebSocket Support
Your app uses WebSockets for real-time updates. Ensure your hosting platform supports WebSockets:
- ✅ Railway - Supported
- ✅ Render - Supported
- ✅ Fly.io - Supported
- ✅ Most VPS with proper nginx config - Supported

### Database Persistence
Your SQLite database is stored in `server/tournament.db`. Make sure this file persists:
- On Railway/Render: Use persistent volumes/disks
- On VPS: File system is persistent by default

### Security Recommendations
1. **Change default passwords** in the application
2. **Use HTTPS** (most platforms provide this automatically)
3. **Regular backups** of your database file
4. **Keep dependencies updated**: `npm update`

## Testing Your Deployment

After deployment, test these features:
1. Access the landing page
2. Login as staff and judge
3. Create a tournament
4. Update ring information from judge interface
5. Verify real-time updates on staff interface

## Troubleshooting

### App won't start
- Check logs on your platform
- Verify all dependencies installed: `npm run install-all`
- Ensure build completed: `npm run build`

### WebSockets not working
- Check if platform supports WebSockets
- Verify no firewall blocking connections
- Check nginx config if using reverse proxy

### Database resets on restart
- Ensure persistent storage is configured
- Check that `server/tournament.db` is in a persistent directory

## Local Production Test

Test production mode locally before deploying:
```bash
# Build frontend
npm run build

# Start in production mode
NODE_ENV=production npm start

# Access at http://localhost:8080
```

## Support

For platform-specific issues:
- Railway: [railway.app/help](https://railway.app/help)
- Render: [render.com/docs](https://render.com/docs)
- Fly.io: [fly.io/docs](https://fly.io/docs)
