FROM node:22-alpine

# sharp modülü için gerekli native kütüphaneler (Alpine Linux)
RUN apk add --no-cache vips-dev python3 make g++

WORKDIR /app

COPY package*.json ./

# sharp'ı Alpine için kaynak koddan derle
RUN npm ci --build-from-source

COPY . .

RUN npm run build

EXPOSE 3003

CMD ["sh", "-c", "npx prisma db push && npm run start"]
