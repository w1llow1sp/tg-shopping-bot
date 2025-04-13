FROM node:22.14.0
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY /src /app/src
CMD ["npx", "tsx", "src/index.ts"]
