# BTS Delivery App - Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Server Setup](#server-setup)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [Application Deployment](#application-deployment)
- [Nginx Configuration](#nginx-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [PM2 Process Management](#pm2-process-management)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

- Ubuntu 22.04+ or similar Linux distribution
- Node.js 20.x LTS
- PostgreSQL 15+
- Redis 7+
- Nginx
- Certbot (for SSL)
- PM2 (for process management)

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2
```

---

## Environment Variables

Copy `.env.production` to `.env` on your production server and configure all values:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/btsdelivery` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret (64+ chars) | Generate with `openssl rand -hex 64` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://btsdelivery.com` |
| `PUBLIC_APP_URL` | Public URL for webhooks | `https://btsdelivery.com` |

### Payment Gateway (NexusPay)

| Variable | Description |
|----------|-------------|
| `NEXUSPAY_BASE_URL` | API endpoint |
| `NEXUSPAY_USERNAME` | Merchant username |
| `NEXUSPAY_PASSWORD` | Merchant password |
| `NEXUSPAY_MERCHANT_ID` | Your merchant ID |
| `NEXUSPAY_KEY` | API key |

### Optional Services

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | Email service API key |
| `TWILIO_*` | SMS service credentials |
| `VAPID_*` | Web push notification keys |

---

## Server Setup

### 1. Create Application User

```bash
# Create dedicated user for the app
sudo useradd -m -s /bin/bash btsdelivery
sudo usermod -aG sudo btsdelivery
```

### 2. Install System Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential git nginx certbot python3-certbot-nginx
```

---

## Database Setup

### 1. Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 2. Create Database and User

```bash
sudo -u postgres psql << EOF
CREATE USER btsuser WITH PASSWORD 'YOUR_STRONG_PASSWORD';
CREATE DATABASE btsdelivery OWNER btsuser;
GRANT ALL PRIVILEGES ON DATABASE btsdelivery TO btsuser;
\c btsdelivery
GRANT ALL ON SCHEMA public TO btsuser;
EOF
```

### 3. Configure Remote Access (if needed)

Edit `/etc/postgresql/15/main/pg_hba.conf`:
```
# IPv4 local connections (if app is on same server)
host    btsdelivery    btsuser    127.0.0.1/32    scram-sha-256
```

Edit `/etc/postgresql/15/main/postgresql.conf`:
```
listen_addresses = 'localhost'
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## Redis Setup

### 1. Install Redis

```bash
sudo apt install -y redis-server
```

### 2. Configure Redis

Edit `/etc/redis/redis.conf`:

```conf
# Bind to localhost only
bind 127.0.0.1 ::1

# Set a password (recommended)
requirepass YOUR_REDIS_PASSWORD

# Enable persistence
appendonly yes
appendfsync everysec

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
```

### 3. Enable and Start Redis

```bash
sudo systemctl enable redis-server
sudo systemctl restart redis-server

# Verify
redis-cli -a YOUR_REDIS_PASSWORD ping
```

---

## Application Deployment

### 1. Clone and Build

```bash
cd /var/www
sudo git clone https://github.com/your-repo/btsdeliveryapp.git
cd btsdeliveryapp

# Set ownership
sudo chown -R btsdelivery:btsdelivery /var/www/btsdeliveryapp

# Install dependencies
npm ci --production=false

# Build the application
npm run build
```

### 2. Configure Environment

```bash
cp .env.production .env
# Edit .env with your production values
nano .env
```

### 3. Run Database Migrations

```bash
npm run db:migrate
# Or if using drizzle:
npm run db:push
```

---

## Nginx Configuration

Create `/etc/nginx/sites-available/btsdelivery`:

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

# Upstream for Node.js
upstream bts_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name btsdelivery.com www.btsdelivery.com;
    return 301 https://btsdelivery.com$request_uri;
}

# Redirect www to non-www
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.btsdelivery.com;
    
    ssl_certificate /etc/letsencrypt/live/btsdelivery.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/btsdelivery.com/privkey.pem;
    
    return 301 https://btsdelivery.com$request_uri;
}

# Main server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name btsdelivery.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/btsdelivery.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/btsdelivery.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Root for static files
    root /var/www/btsdeliveryapp/dist/public;

    # Static files with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri @backend;
    }

    # Service worker - no cache
    location = /sw.js {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        try_files $uri @backend;
    }

    # Manifest
    location = /manifest.json {
        expires 1d;
        add_header Cache-Control "public";
        try_files $uri @backend;
    }

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://bts_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://bts_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # All other routes - SPA fallback
    location / {
        limit_req zone=general burst=50 nodelay;
        try_files $uri $uri/ @backend;
    }

    # Backend proxy
    location @backend {
        proxy_pass http://bts_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/btsdelivery /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

### Using Let's Encrypt (Certbot)

```bash
# Obtain certificate
sudo certbot --nginx -d btsdelivery.com -d www.btsdelivery.com

# Verify auto-renewal
sudo certbot renew --dry-run

# Auto-renewal is set up via systemd timer
sudo systemctl status certbot.timer
```

---

## PM2 Process Management

### 1. Create Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'bts-delivery',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/bts-delivery/error.log',
    out_file: '/var/log/bts-delivery/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

### 2. Start Application

```bash
# Create log directory
sudo mkdir -p /var/log/bts-delivery
sudo chown btsdelivery:btsdelivery /var/log/bts-delivery

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup systemd -u btsdelivery --hp /home/btsdelivery
```

### 3. PM2 Commands

```bash
pm2 status           # Check status
pm2 logs             # View logs
pm2 restart all      # Restart app
pm2 reload all       # Zero-downtime reload
pm2 monit            # Real-time monitoring
```

---

## Monitoring & Maintenance

### Health Check Endpoint

The app exposes `/api/health` for monitoring:
```bash
curl https://btsdelivery.com/api/health
```

### Log Rotation

Create `/etc/logrotate.d/bts-delivery`:
```
/var/log/bts-delivery/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 btsdelivery btsdelivery
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Backup Strategy

```bash
# Database backup (add to crontab)
0 2 * * * pg_dump -U btsuser btsdelivery | gzip > /backups/btsdelivery-$(date +\%Y\%m\%d).sql.gz

# Keep last 7 days
0 3 * * * find /backups -name "btsdelivery-*.sql.gz" -mtime +7 -delete
```

### Useful Commands

```bash
# Check application status
pm2 status

# View real-time logs
pm2 logs bts-delivery --lines 100

# Check Nginx status
sudo systemctl status nginx

# Check PostgreSQL status
sudo systemctl status postgresql

# Check Redis status
sudo systemctl status redis-server

# Test configuration
sudo nginx -t

# View system resources
htop
```

---

## Deployment Checklist

- [ ] Server provisioned and secured (firewall, SSH keys)
- [ ] Node.js 20.x installed
- [ ] PostgreSQL installed and configured
- [ ] Redis installed and configured
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Nginx configured
- [ ] SSL certificates obtained
- [ ] PM2 configured and running
- [ ] Logs rotating properly
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] DNS records pointing to server

---

## Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs bts-delivery --err --lines 50

# Check if port is in use
sudo lsof -i :3000

# Verify environment
node -e "console.log(process.env.NODE_ENV)"
```

### Database connection issues
```bash
# Test connection
psql -U btsuser -h localhost -d btsdelivery

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Redis connection issues
```bash
# Test connection
redis-cli -a YOUR_PASSWORD ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

### Nginx issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```
