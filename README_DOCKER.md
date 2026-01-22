# Panduan Docker Deployment (Frontend React + Backend Node.js)

Panduan ini menjelaskan cara menjalankan aplikasi Cemilan KasirPOS menggunakan **Docker** dengan konfigurasi **Frontend React** dan **Backend Node.js**.

## 📋 Prasyarat

- Docker Engine 20.10+ ([Install Docker](https://docs.docker.com/engine/install/))
- Docker Compose v2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))
- Git (untuk clone repository)

## 🐳 Arsitektur Docker

Aplikasi ini menggunakan 3 container:

```
┌─────────────────────────────────────────────┐
│         Nginx (Frontend Container)          │
│  - Port 80 (HTTP)                           │
│  - Serve React Static Files                 │
│  - Proxy /api → Node.js Backend             │
└────────────┬────────────────────────────────┘
             │
       ┌─────┴──────┐
       │            │
┌──────▼──────┐  ┌──▼────────────────────┐
│ Node Backend│  │   MySQL Database      │
│  (Express)  │  │   - Port 3306         │
│  - Port 3001│  │   - Persistent Vol    │
└─────────────┘  └───────────────────────┘
```

## 📁 Struktur File Docker

Buat (atau update) file-file berikut di root project:

### 1. `nginx.conf` (Konfigurasi Nginx Frontend)

Buat file `nginx.conf` di root folder:

```nginx
server {
    listen 80;
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js Backend
    location /api {
        proxy_pass http://node-backend:3001/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. `Dockerfile` (Frontend)

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

# Build static files (VITE_API_URL relative path agar diproxy nginx)
ENV VITE_API_URL=/api
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

### 3. `Dockerfile.node` (Backend)

Buat file `Dockerfile.node` di root folder:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY server/ .

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
```

### 4. `docker-compose.yml`

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: cemilan-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root}
      MYSQL_DATABASE: cemilankasirpos_php_v02
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - app-network

  node-backend:
    build:
      context: .
      dockerfile: Dockerfile.node
    container_name: cemilan-node-backend
    restart: always
    environment:
      DB_HOST: mysql
      DB_USER: root
      DB_PASS: ${MYSQL_ROOT_PASSWORD:-root}
      DB_NAME: cemilankasirpos_php_v02
      PORT: 3001
      JWT_SECRET: ${JWT_SECRET:-secret}
      NODE_ENV: production
    depends_on:
      - mysql
    networks:
      - app-network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cemilan-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - node-backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  mysql_data:
```

## 🚀 Cara Menjalankan

1.  **Jalankan Docker Compose**:
    ```bash
    docker-compose up -d --build
    ```

2.  **Akses Aplikasi**:
    *   Buka browser: `http://localhost`

## 🛠️ Maintenance

```bash
# Stop aplikasi
docker-compose down

# Lihat logs
docker-compose logs -f node-backend
```

## 🔒 Catatan Keamanan

*   Pastikan password database diubah di `docker-compose.yml` atau menggunakan `.env` file untuk production.
