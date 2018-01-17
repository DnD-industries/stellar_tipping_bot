"use strict";
const Command = require('../commands/command');
const slackMessage = require('./slack-message');

class SlackCommandUtils {
    //"command":"/tip","text":"<@U8PTZ287N|d> 123"
    extractCommandParamsFromMessage(msg) {
        let adapter     = "slack";
        let sourceId    = msg.uniqueUserID;
        let command;
        let params = this.findCommandParams(msg.text); //Get the locations of our command params
        let amount;
        //Remove the lead slash, and fall into the appropriate command case
        console.log(`Command is: ${msg.command}`)
        const sansSlash = msg.command.split('/')[1]
        console.log(`SansSlash is ${sansSlash}`)
        switch(sansSlash) {
            case "register":
                console.log("Inside register")
                let walletPublicKey = params[0];
                console.log(`Arguments are ${adapter}, ${sourceId}, ${walletPublicKey}`)
                command = new Command.Register(adapter, sourceId, walletPublicKey);
                break;
            case "tip":
                let targetId = this.extractUserIdFromCommand(params[0]);
                amount = parseFloat(params[1]);
                command = new Command.Tip(adapter, sourceId, targetId, amount);
                break;
            case "withdraw":
                amount = parseFloat(params[0]);
                let address = params.length > 1 ? params[1] : null;
                command = new Command.Withdraw(adapter, sourceId, amount, address);
                break;
            default:
                console.error("Unknown command type:", msg.command);
                //We don't know what type the command is, so return the generic super class
                command = new Command.Command(adapter, sourceId);
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
        console.log("Over here 1111")
        // If it doesn't contain @ and |, we're not interested. Just return what's given to us
        if(cmd.indexOf("@") < 0 || cmd.indexOf("|") < 0 ) {
            console.log("In here #2")
            return cmd;
        }
        console.log("In here Sorta");
        let result = cmd.slice(cmd.indexOf("@") + 1, cmd.indexOf("|"));
        return result;
    }

    findCommandParams(cmd){
        cmd = this.removeExtraSpacesFromCommand(cmd); //Sanitize extra spaces from command
        console.log("In here AAA")
        const params = cmd.split(" ")
        return params;
    }

    //Returns an array of indices representing the location of a space delimiter that was found in a command
    //Example: findCommandDelimitersIndicesCommand("<user_id> 1234 myAddress")
    //Output: [9, 14]
    findCommandDelimiterIndices(cmd){
        console.log("In da here")
        let indices = [];
        for(let i=0; i<cmd.length;i++) {
            console.log("In here #1")
            if (cmd[i] === " ") indices.push(i);
        }
        return indices; 
    }

    //Removes extra spaces from a command
    //Example: removeExtraSpacesFromCommand("<user_id>   1234      myAddress")
    //Output: "<user_id> 1234 myAddress"
    removeExtraSpacesFromCommand(cmd) {
        console.log("About to be replacing")
        const replaced = cmd.replace(/\s\s+/g, ' '); //Regex to remove multiple spaces, tabs, etc and replace with a single space for ease of parsing
        console.log(`Replaced is: ${replaced}`)
        return replaced
    }
}

module.exports = new SlackCommandUtils();