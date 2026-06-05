FROM node:26-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src/ ./src/

EXPOSE 3000

CMD ["npm", "run", "dev"]