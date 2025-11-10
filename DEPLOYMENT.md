# Tournament Control System - Deployment Guide

This guide explains how to deploy the Tournament Control System using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (usually comes with Docker Desktop)

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

The application will be available at `http://localhost:3001`

### 2. Build Docker Image Manually

```bash
# Build the image
docker build -t tournament-control .

# Run the container
docker run -d \
  -p 3001:3001 \
  -v tournament-data:/app/data \
  --name tournament-control \
  tournament-control
```

## Configuration

### Environment Variables

You can customize the application by setting environment variables in `docker-compose.yml`:

- `NODE_ENV`: Set to `production` (default)
- `PORT`: Port the server runs on (default: 3001)

### Data Persistence

The SQLite database is stored in a Docker volume named `tournament-data`. This ensures your tournament data persists even if you stop or remove the container.

To backup your data:

```bash
# Find the volume location
docker volume inspect tournament-data

# Copy the database file
docker cp tournament-control:/app/data/tournament.db ./backup-tournament.db
```

To restore data:

```bash
# Copy backup into container
docker cp ./backup-tournament.db tournament-control:/app/data/tournament.db

# Restart the container
docker-compose restart
```

## Deployment to Cloud Platforms

### General Container Hosting

This Docker setup works with any container hosting platform:

- **Railway**: Connect your Git repo and it will auto-deploy
- **Render**: Use "New Web Service" and point to your Docker image
- **Fly.io**: Use `fly launch` with the Dockerfile
- **DigitalOcean App Platform**: Deploy from GitHub with Dockerfile
- **Heroku**: Use container registry

### Important Notes for Production

1. **WebSocket Support**: Ensure your hosting platform supports WebSocket connections
2. **Persistent Storage**: Make sure the `/app/data` directory is persisted
3. **Port Configuration**: Most platforms will set the PORT environment variable automatically
4. **HTTPS**: Use a reverse proxy or platform SSL for secure connections

## Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs

# Check if port is already in use
lsof -i :3001  # On Mac/Linux
netstat -ano | findstr :3001  # On Windows
```

### Database issues

```bash
# Access the container
docker exec -it tournament-control sh

# Check database file
ls -la /app/data/

# View database
sqlite3 /app/data/tournament.db ".tables"
```

### Reset everything

```bash
# Stop and remove containers, volumes
docker-compose down -v

# Rebuild from scratch
docker-compose up -d --build
```

## Development vs Production

- **Development**: Run `npm run dev` locally (uses separate frontend/backend)
- **Production**: Docker serves built React app from Node.js server

## Security Recommendations

1. Change default passwords in the application
2. Use HTTPS in production (via reverse proxy)
3. Regularly backup your database
4. Keep Docker images updated
5. Use environment variables for sensitive configuration

## Support

For issues or questions, refer to the main README.md file.
