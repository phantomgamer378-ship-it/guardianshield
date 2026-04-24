# GuardianShield Deployment Guide

## Prerequisites

1. Docker and Docker Compose installed
2. All environment variables configured in `.env` file

## Environment Variables

Make sure your `.env` file contains:
```
# Database
DATABASE_URL=postgresql://postgres:postgres@db.4eitrub9.ap-southeast.insforge.app:5432/postgres
INSFORGE_ANON_KEY=your_anon_key_here
INSFORGE_SERVICE_ROLE_KEY=your_service_role_key_here

# API Keys
ABSTRACT_API_KEY=your_abstract_api_key
SIGHTENGINE_API_USER=your_sightengine_user
SIGHTENGINE_API_SECRET=your_sightengine_secret
HF_TOKEN=your_huggingface_token

# JWT
JWT_SECRET=your_jwt_secret

# Server
PORT=3000
NODE_ENV=production
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

1. Build and start the container:
```bash
docker-compose up -d --build
```

2. Check logs:
```bash
docker-compose logs -f
```

3. Stop the service:
```bash
docker-compose down
```

### Option 2: Docker Only

1. Build the image:
```bash
docker build -t guardianshield .
```

2. Run the container:
```bash
docker run -d \
  --name guardianshield \
  -p 3000:3000 \
  --env-file .env \
  guardianshield
```

### Option 3: Direct Node.js

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

## Health Check

The application includes a health check endpoint:
- URL: `http://localhost:3000/health`
- Returns: JSON with status, timestamp, and uptime

## Testing the Deployment

1. Check if the server is running:
```bash
curl http://localhost:3000/health
```

2. Test the API:
```bash
curl http://localhost:3000/api
```

3. Test registration:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "test123456"}'
```

## Troubleshooting

- Check logs: `docker-compose logs guardianshield`
- Verify environment variables are properly set
- Ensure the database is accessible
- Check if all required API keys are configured

## Production Considerations

- Use a reverse proxy (nginx) for SSL termination
- Set up proper monitoring and logging
- Configure database backups
- Use environment-specific secrets management
- Set up CI/CD pipeline for automated deployments

- 
