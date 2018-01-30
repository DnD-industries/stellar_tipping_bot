FROM node:9.4.0

#Install required dependencies to check the postgres connection using postgresql-client
RUN apt-get update && apt-get install -f -y postgresql-client

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY ./package.json /usr/src/app/package.json
COPY ./package-lock.json /usr/src/app/package-lock.json

RUN npm install

COPY . /usr/src/app/

EXPOSE 5000