#!/bin/bash

# These brackets ensure this entire script is omloaded in memory at run time.
# If this script itself is overwriten by the git reset command below, it will prevent unpredictable execution
{ 

#Pulls a new docker image for davidbulnes/stellar-bot:master_<new_commit_sha>, and brings up the new container
#Called from the dockerhub webhook server running on the host system. We can't easily run it through a docker container due to process isolation. 
#
#TODO: Save previous/current commit sha so that we can run docker rmi on that image

#Echoes commands to stdout
set -x
echo $PWD

#Resets the (non-dockerized) source code in pwd to the $1 branch using $2 commit sha
#Args:
#$1: string name of branch on origin to fetch from
#$2: commit sha to reset onto
git_fetch_reset () {
    #Fetch and reset our code to the latest commit on $1
    git fetch origin $1 && git reset --hard $2 && git clean -df    
}

#Performs a docker-compose pull and up on the app
#Args: 
#$1: middle sub_name of second docker-compose file to merge with the top level docker-compose.yml file.
docker-compose_pull_up () {
    docker-compose -f docker-compose.yml -f docker-compose.$1.yml pull app
    docker-compose -f docker-compose.yml -f docker-compose.$1.yml up -d app
}

#Removes the prefix in a tag, $1, specified by $2
#Example:
#   
#   Input: $1 = "staging_448f1"
#          $2 = "staging_"
#   Output: "448f1"
remove_tag_prefix () {
    #Remove the $2 prefix from $1 to get the commit sha
    PREFIX_REMOVED_TAG=${1//$2/}
    echo "Tag with prefix removed: ${PREFIX_REMOVED_TAG}"
}

echo "TAG: "$TAG

#Check the tag is not "latest"
if !( echo $TAG | grep -q "latest" ) ; then
    #Validate that our tag is from master or staging
    if echo "$TAG" | grep -q "master"; then
        #Change our path to the relative absolute where our stellar bot docker-compose.yml resides
        cd $STELLARBOT_MASTER_PATH #Needs to be set in /etc/environment to be available outside of just terminal sessions
        #Set our env variable for the master tag to $TAG, and remove the prefix, storing in $PREFIX_REMOVED_TAG
        remove_tag_prefix $TAG "master_"
        export STELLARBOT_MASTER_TAG=$TAG #Needs to be set in /etc/environment to be available outside of just terminal sessions
        echo "STELLARBOT_MASTER_TAG="$STELLARBOT_MASTER_TAG
        git_fetch_reset "master" $PREFIX_REMOVED_TAG
        docker-compose_pull_up "master"     
        #cp $STELLARBOT_MASTER_PATH/deploy_scripts/pull_and_restart.sh $PWD/scripts/pull_and_restart.sh
    elif echo "$TAG" | grep -q "staging"; then
        #Change our path to the relative absolute where our stellar bot docker-compose.yml resides
        cd $STELLARBOT_STAGING_PATH #Needs to be set in /etc/environment to be available outside of just terminal sessions
        #Set our env variable for the staging tag to $TAG, and remove the prefix, storing in $PREFIX_REMOVED_TAG
        remove_tag_prefix $TAG "staging_"    
        export STELLARBOT_STAGING_TAG=$TAG 
        echo "STELLARBOT_STAGING_TAG="$STELLARBOT_STAGING_TAG
        git_fetch_reset "staging" $PREFIX_REMOVED_TAG
        docker-compose_pull_up "staging"
        #copy our script
        #cp $STELLARBOT_STAGING_PATH/deploy_scripts/pull_and_restart.sh $PWD/scripts/pull_and_restart.sh
    else     
        echo "NOT PULLING: staging or master not found in tag"
    fi
else
    echo "IGNORING: tag ${COMMIT_SHA} is not a git sha suffix"
fi

sleep 1

exit
}