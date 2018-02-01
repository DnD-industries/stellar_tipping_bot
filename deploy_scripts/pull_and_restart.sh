#!/bin/bash
#Pulls a new docker image for davidbulnes/stellar-bot:master_latest, and brings up the new container

#TODO: Integrate commit sha. Assign it as an environment variable and point to that variable in docker-compose.prod.yml
#Save previous/current commit sha so that we can run docker rmi on that image

if echo "$TAG" | grep -q "master"; then
	#Set our env variable for the master tag to $TAG, passed from micro-dockerhub-hook/lib/run-script.js
	"$STELLARBOT_MASTER_TAG" = "$TAG"
	#Change our path to the relative path where our stellar bot docker-compose.yml resides
	cd ..
	docker-compose pull app && docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d app
	#Change our path back
	cd -
else
	echo "NOT PULLING: master not found in tag"
fi
