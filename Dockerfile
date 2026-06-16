# Deployer — container deploy admin, single image.
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server ./server
COPY public ./public
COPY templates-default ./templates-default
COPY templates ./templates
EXPOSE 3000
ENV NODE_ENV=production
USER node
CMD ["node", "server/index.js"]
