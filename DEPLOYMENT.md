# XentralDesk Deployment Guide (Production)

This guide outlines the steps to move XentralDesk from your local machine to a live server.

## 1. Prerequisites
- A Linux server (Ubuntu 22.04+ recommended)
- A domain name (e.g., `yourdomain.com`) with DNS access
- Docker & Docker Compose installed (for containerized deployment)
- *OR* Node.js 20+ & Python 3.10+ (for manual deployment)
- SSL Certificates (Certbot / Let's Encrypt)

---

## 2. Frontend Deployment

### Step A: Configure Environment
Copy `.env.production.example` to `.env.production` and update the URLs to your live domain.

### Step B: Build the App
Run the following command locally or on your CI/CD pipeline:
```bash
npm run build
```
This generates a `dist/` folder with static files.

### Step C: Serve index.html
Upload the contents of `dist/` to your server's web root (e.g., `/var/www/xentraldesk`).

---

## 3. Backend Deployment

### Step A: Configure Environment
Copy `backend/.env.production.example` to `backend/.env` on the server and update all secrets and database URLs.

### Step B: Start Services (Docker)
Ensure your `docker-compose.yml` uses the production environment variables.
```bash
docker compose up -d
```

---

## 4. Nginx Configuration (Example)

Set up a reverse proxy to handle SSL and route requests to your frontend and backend.

```nginx
server {
    listen 80;
    server_name yourdomain.com app.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.yourdomain.com;

    # SSL Config here...

    root /var/www/xentraldesk;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        # ... other proxy headers
    }
}
```

---

## 5. Security Checklist
- [ ] Change `SECRET_KEY` in `.env`.
- [ ] Disable `DEBUG` mode in backend.
- [ ] Use HTTPS for all communications.
- [ ] Restrict `BACKEND_CORS_ORIGINS` to your specific domains.
- [ ] Secure your database and Redis with passwords.
