#!/bin/bash
git stash --all #stash any local changes due to the build
docker-compose build
docker login -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}"
docker push "${DOCKER_REPO}":"${TRAVIS_BRANCH}"_"${TRAVIS_COMMIT}"

#If we are in the master branch, ssh into the production server to trigger a docker pull
#if [ "${TRAVIS_BRANCH}" == "master" ]; then
	#ssh deploy@ipaddr 
  	#/bin/bash ./deploy.sh
#fi
