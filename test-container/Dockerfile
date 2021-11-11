FROM node:lts-alpine

WORKDIR /app
COPY ./ /app
RUN yarn install

ENV BASE_URL=
ENV USERNAME=
ENV PASSWORD=

CMD ./wait-for-http.js ${BASE_URL} 1000 60 && ./node_modules/.bin/jest
