FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Create uploads directory for temporary file storage
RUN mkdir -p uploads

EXPOSE 5000
CMD ["node", "server.js"]
