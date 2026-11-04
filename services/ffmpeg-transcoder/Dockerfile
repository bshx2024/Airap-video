FROM node:22-alpine

# Install FFmpeg and required codecs
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.mjs ./

EXPOSE 8080
ENV PORT=8080

CMD ["node", "server.mjs"]

