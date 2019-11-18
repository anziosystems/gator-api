FROM  node:10.15.2
RUN mkdir -p /app
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 3000
RUN npm run build
CMD ["node", "dist/app.js"] 
