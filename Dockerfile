FROM node:12.7.0

WORKDIR /usr/app
COPY . .

RUN npm install

ENV PORT 80
EXPOSE 80

CMD ["node", "./bot.js"]
