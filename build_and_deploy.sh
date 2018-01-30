#!/bin/bash
pwd
ls -ltr
#Handle line endings for unix systems
git config core.autocrlf false
#stash any local changes due to the build
#git stash --all
#build our new app
docker-compose build --no-cache
#tag the build with the branch and shortened commit sha 
BUILD_TAG="${TRAVIS_BRANCH}"_$(git rev-parse --short HEAD)
echo "Build tag: "$BUILD_TAG

docker tag "${DOCKER_REPO}":latest "${DOCKER_REPO}":$BUILD_TAG 
docker login -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}"
docker push "${DOCKER_REPO}":$BUILD_TAG

#If we are in the master branch, ssh into the production server to trigger a docker pull
#if [ "${TRAVIS_BRANCH}" == "master" ]; then
	#ssh deploy@ipaddr 
  	#/bin/bash ./deploy.sh
#fi
 