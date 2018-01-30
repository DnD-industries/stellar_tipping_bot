#!/bin/bash
#Handle line endings for unix systems
git config core.autocrlf false
#stash any local changes due to the build
git stash --all
#build our new app
docker-compose build --no-cache
#tag the build with the branch and shortened commit sha 
BUILD_TAG="${TRAVIS_BRANCH}"_$(git rev-parse --short HEAD)
echo "Build tag: "$BUILD_TAG

docker tag "${DOCKER_REPO}":latest "${DOCKER_REPO}":$BUILD_TAG 
docker tag "${DOCKER_REPO}":latest "${DOCKER_REPO}":"${TRAVIS_BRANCH}"_latest
docker login -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}"
#push both the branch_latest tag and the build_tag with commit sha
docker push "${DOCKER_REPO}":"${TRAVIS_BRANCH}"_latest
docker push "${DOCKER_REPO}":$BUILD_TAG
 
#If we are in the master branch, ssh into the production server to trigger a docker pull
#Also validate this build wasn't triggered by a pull request to master
#if [ "${TRAVIS_BRANCH}" == "master" && "${TRAVIS_PULL_REQUEST}" == "false"]; then
#	ssh "${HOST_USER}"@"${HOST_MACHINE}" './pull_and_run_image.sh ${DOCKER_REPO}:$BUILD_TAG'
#fi
 