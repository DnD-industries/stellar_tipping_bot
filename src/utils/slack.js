"use strict";

class SlackUtils {
    
    //TODO:Implement logic to dynamically extract parameters from a command, based on which command it is
    extractParamsFromCommand(cmd){}
    
    /**
     * Takes a string, which usually will be an escaped Slack userID string
     * such as "<@U12345678|dlohnes>". In this case, U12345678 is the slack
     * user ID unique to this person IN THIS TEAM. In order to generate
     * a truly unique user ID, we'll need to append the team ID as well.
     *
     * See: https://api.slack.com/slash-commands#how_do_commands_work
     */
    extractUserIdFromCommand(cmd) {
        // If it doesn't contain @ and |, we're not interested. Just return what's given to us
        if(cmd.indexOf("@") < 0 || cmd.indexOf("|") < 0 ) {
            return cmd
        }
        let result = cmd.slice(cmd.indexOf("@") + 1, cmd.indexOf("|"))
        return result
    }
}

module.exports = new SlackUtils()