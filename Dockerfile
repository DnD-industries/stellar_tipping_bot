FROM node:9.4.0

#Install required dependencies to check the postgres connection using postgresql-client
RUN apt-get update && apt-get install -f -y postgresql-client

#Install node packages in tmp first, then move them to the app directory
COPY package.json /tmp/package.json
RUN cd /tmp && npm install

RUN mkdir -p /usr/src/app
RUN cp -a /tmp/node_modules /usr/src/app
RUN rm -R /tmp/node_modules

WORKDIR /usr/src/app
COPY . /usr/src/app

EXPOSE 5000