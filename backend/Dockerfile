FROM node:22-alpine

# Install build dependencies for mediasoup (including pip)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    libc-dev \
    linux-headers \
    bash

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

RUN npm ci

# Copy source code
COPY src/ ./src/

RUN npm run build
RUN npm prune --production

# Expose ports
EXPOSE 8080
EXPOSE 40000-49999/udp
EXPOSE 40000-49999/tcp

# Environment variables
ENV NODE_ENV=production
ENV MEDIASOUP_MIN_PORT=40000
ENV MEDIASOUP_MAX_PORT=49999

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('net').createConnection(8080, 'localhost').on('error', () => process.exit(1))"

# Start the server
CMD ["npm", "start"]