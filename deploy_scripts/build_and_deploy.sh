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

echo "Travis pull request:" 
echo $TRAVIS_PULL_REQUEST
if ["$TRAVIS_PULL_REQUEST" == "false"]; then
	docker tag "${DOCKER_REPO}":latest "${DOCKER_REPO}":$BUILD_TAG 
	docker tag "${DOCKER_REPO}":latest "${DOCKER_REPO}":"${TRAVIS_BRANCH}"_latest
	docker login -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}"
	#push both the branch_latest tag and the build_tag with commit sha
	docker push "${DOCKER_REPO}":"${TRAVIS_BRANCH}"_latest
	docker push "${DOCKER_REPO}":$BUILD_TAG
 else
 	echo "BUILD FROM PULL REQUEST NOT DEPLOYED. MUST BE TRIGGERED FROM A PUSH."
 fi 