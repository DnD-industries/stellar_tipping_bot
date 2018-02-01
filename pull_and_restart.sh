#!/bin/bash
#Pulls a new docker image for davidbulnes/stellar-bot:master_latest, and brings up the new container

#TODO: Integrate commit sha. Assign it as an environment variable and point to that variable in docker-compose.prod.yml
#Save previous/current commit sha so that we can run docker rmi on that image

docker-compose pull
docker-compose up -d