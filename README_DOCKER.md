# Panduan Docker Deployment

Panduan ini menjelaskan cara menjalankan aplikasi Cemilan KasirPOS menggunakan Docker dan Docker Compose.

## 📋 Prasyarat

- Docker Engine 20.10+ ([Install Docker](https://docs.docker.com/engine/install/))
- Docker Compose v2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))
- Git (untuk clone repository)

## 🐳 Arsitektur Docker

Aplikasi ini menggunakan 3 container:

```
┌─────────────────────────────────────────────┐
│         Nginx (Reverse Proxy)               │
│  - Port 80 (HTTP) / 443 (HTTPS)             │
│  - Serve Frontend Static Files              │
│  - Proxy /api → Backend                     │
└────────────┬────────────────────────────────┘
             │
       ┌─────┴──────┐
       │            │
┌──────▼──────┐  ┌──▼────────────────────┐
│  Frontend   │  │   Backend (Node.js)   │
│  (React)    │  │   - Express API       │
│  - Vite     │  │   - Port 3001         │
│  - Built    │  │                       │
└─────────────┘  └──────┬────────────────┘
                        │
                 ┌──────▼──────────────┐
                 │  MySQL Database     │
                 │  - Port 3306        │
                 │  - Persistent Vol   │
                 └─────────────────────┘
```

## 📁 Struktur File Docker

Buat file-file berikut di root project:

### 1. `Dockerfile` (Frontend)

```dockerfile
# Stage 1: Build React App
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build static files
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. `Dockerfile.backend` (Backend)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files from server directory
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source code
COPY server/ ./

# Expose backend port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3001/api/products', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
```

### 3. `docker-compose.yml`

```yaml
version: '3.8'

services:
  # MySQL Database

# Lihat logs specific service
docker-compose logs -f backend

# Restart specific service
docker-compose restart backend

# Masuk ke container (debugging)
docker-compose exec backend sh
docker-compose exec mysql bash

# Stop dan hapus semua (termasuk volumes)
docker-compose down -v
```

### Database Commands

```bash
# Backup database
docker-compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} cemilankasirpos > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} cemilankasirpos < backup.sql

# MySQL shell
docker-compose exec mysql mysql -u root -p${MYSQL_ROOT_PASSWORD}
```

### Maintenance

```bash
# Update images
docker-compose pull

# Prune unused images/volumes
docker system prune -a
docker volume prune

# View resource usage
docker stats
```

## 📊 Monitoring & Logging

### Logs

```bash
# Application logs
docker-compose logs -f --tail=100 backend

# Access logs (Nginx)
docker-compose exec frontend tail -f /var/log/nginx/access.log

# Error logs (Nginx)
docker-compose exec frontend tail -f /var/log/nginx/error.log
```

### Health Checks

```bash
# Check container health
docker-compose ps

# Detailed health status
docker inspect kasirpintar-backend | grep -A 10 Health

# API health check
curl http://localhost:3001/api/products
```

## 🔐 Security Best Practices

### 1. Environment Variables

❌ **JANGAN** commit file `.env` ke git
✅ Gunakan `.env.example` sebagai template

```bash
# .env.example
MYSQL_ROOT_PASSWORD=CHANGE_THIS
MYSQL_PASSWORD=CHANGE_THIS
```

### 2. Secrets Management

Untuk production, gunakan Docker Secrets:

```yaml
# docker-compose.prod.yml
services:
  backend:
    secrets:
      - db_password
    environment:
      DB_PASS_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### 3. Network Isolation

```yaml
services:
  mysql:
    networks:
      - backend-net  # Hanya backend yang bisa akses

  backend:
    networks:
      - backend-net
      - frontend-net

  frontend:
    networks:
      - frontend-net  # Tidak bisa akses MySQL langsung
```

### 4. Read-only Filesystem

```yaml
services:
  frontend:
    read_only: true
    tmpfs:
      - /tmp
      - /var/cache/nginx
```

## 🌐 Deployment ke Cloud

### Docker Hub

```bash
# 1. Login
docker login

# 2. Tag images
docker tag kasirpintar-frontend yourusername/kasirpintar-frontend:latest
docker tag kasirpintar-backend yourusername/kasirpintar-backend:latest

# 3. Push
docker push yourusername/kasirpintar-frontend:latest
docker push yourusername/kasirpintar-backend:latest
```

### Digital Ocean / AWS / GCP

1. **Buat VM/Droplet** dengan Docker pre-installed
2. **Clone repo** dan setup `.env`
3. **Jalankan** `docker-compose up -d`
4. **Setup domain** dan SSL (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

### Kubernetes (Advanced)

Convert docker-compose to K8s:

```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.26.0/kompose-linux-amd64 -o kompose
chmod +x kompose
sudo mv ./kompose /usr/local/bin/kompose

# Convert
kompose convert
```

## 🔄 CI/CD Integration

### GitHub Actions

Buat `.github/workflows/docker.yml`:

```yaml
name: Docker Build and Push

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v2
        with:
          context: .
          push: true
          tags: yourusername/kasirpintar:latest
```

## 🐛 Troubleshooting

### Container tidak start

```bash
# Lihat error logs
docker-compose logs backend

# Check port conflict
netstat -tlnp | grep 3001

# Restart dengan fresh install
docker-compose down -v
docker-compose up -d --build
```

### Database connection error

```bash
# Verify MySQL is running
docker-compose exec mysql mysql -u root -p

# Check environment variables
docker-compose exec backend env | grep DB_
```

### Frontend tidak load

```bash
# Check nginx config
docker-compose exec frontend nginx -t

# Reload nginx
docker-compose exec frontend nginx -s reload
```

## 📈 Performance Tuning

### MySQL Optimization

```yaml
# docker-compose.yml
mysql:
  command: 
    - --default-authentication-plugin=mysql_native_password
    - --max_connections=200
    - --innodb_buffer_pool_size=256M
```

### Nginx Caching

```nginx
# nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m;

location /api {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    add_header X-Cache-Status $upstream_cache_status;
}
```

## 📝 Checklist Deployment

- [ ] `.env` dikonfigurasi dengan password yang kuat
- [ ] SSL certificate installed (untuk HTTPS)
- [ ] Firewall dikonfigurasi (hanya buka port 80, 443)
- [ ] Database backup automated
- [ ] Monitoring & logging setup
- [ ] Health checks berfungsi
- [ ] API_URL di frontend sudah benar
- [ ] Test semua fitur utama
- [ ] Documentation update

---

**Note:** Docker menyederhanakan deployment dengan containerization. Semua dependencies tercakup di dalam container, memastikan aplikasi berjalan konsisten di berbagai environment.
