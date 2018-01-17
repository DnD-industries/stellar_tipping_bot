"use strict";
const command = require('../commands/command');
const slackMessage = require('./slack-message');

class SlackCommandUtils {
    //"command":"/tip","text":"<@U8PTZ287N|d> 123"
    extractCommandParamsFromMessage(msg) {
        let adapter     = "slack";
        let sourceId    = msg.getUniqueUserID();
        let command;
        let params = this.findCommandParams(msg.text); //Get the locations of our command params
        //Remove the lead slash, and fall into the appropriate command case
        switch(msg.command.slice(1)) {
            case register:
                let walletPublicKey = params[0];
                command = new command.Register(adapter, sourceId, walletPublicKey);
                break;
            case tip:
                let targetId = params[0];
                let amount = parseFloat(params[1]);
                command = new command.Tip(adapter, sourceId, targetId, amount);
                break;
            case withdraw:
                let amount = parseFloat(params[0]);
                let address = params.length > 1 ? params[1] : null;
                command = new command.Withdraw(adapter, sourceId, amount, address);
                break;
            default:
                console.error("Unknown command type:", msg.command);
                //We don't know what type the command is, so return the generic super class
                command = new command.Command(adapter, sourceId);
                break;
        }
        return command;
    }
    
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
            return cmd;
        }
        let result = cmd.slice(cmd.indexOf("@") + 1, cmd.indexOf("|"));
        return result;
    }

    /*extractAmountFromWithdrawCommand(spaceIndices) {
        
    }

    extractAddressFromWithdrawCommand(spaceIndices) {

    }*/

    findCommandParams(cmd){
        cmd = this.removeExtraSpacesFromCommand(cmd); //Sanitize extra spaces from command
        console.log("cmd after space removal:", cmd);
        let spaceIndices = this.findCommandDelimiterIndices(cmd);
        console.log("space indices", spaceIndices);
        let params = [];
        for (let i = 0; i < spaceIndices.length; i++) {
            //Check to see if we are on the last param
            if ((i+1) === spaceIndices.length) {
            	console.log("last param index:", i);
                params[i] = cmd.slice(cmd[spaceIndices[i]+1]); //Slice until the end of the cmd string
            } else {
                params[i] = cmd.slice(cmd[spaceIndices[i]+1], cmd[spaceIndices[i+1]]);
            }
        }
        console.log("params:",params);
        return params;
    }

    //Returns an array of indices representing the location of a space delimiter that was found in a command
    //Example: findCommandDelimitersIndicesCommand("<user_id> 1234 myAddress")
    //Output: [9, 14]
    findCommandDelimiterIndices(cmd){
        let indices = [];
        for(let i=0; i<cmd.length;i++) {
            if (cmd[i] === " ") indices.push(i);
        }
        return indices; 
    }

    //Removes extra spaces from a command
    //Example: removeExtraSpacesFromCommand("<user_id>   1234      myAddress")
    //Output: "<user_id> 1234 myAddress"
    removeExtraSpacesFromCommand(cmd) {
        return cmd.replace(/\s\s+/g, ' '); //Regex to remove multiple spaces, tabs, etc and replace with a single space for ease of parsing
    }
}

module.exports = new SlackCommandUtils();