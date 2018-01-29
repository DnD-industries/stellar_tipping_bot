#!/bin/bash
#stash any local changes due to the build
git stash --all
#build our new app
docker-compose build
#tag with the branch and commit sha 
docker tag "${DOCKER_REPO}" "${DOCKER_REPO}":"${TRAVIS_BRANCH}"_"${TRAVIS_COMMIT}" 
docker login -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}"
docker push "${DOCKER_REPO}":"${TRAVIS_BRANCH}"_"${TRAVIS_COMMIT}"

#If we are in the master branch, ssh into the production server to trigger a docker pull
#if [ "${TRAVIS_BRANCH}" == "master" ]; then
	#ssh deploy@ipaddr 
  	#/bin/bash ./deploy.sh
#fi
