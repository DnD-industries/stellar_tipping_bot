"use strict";
const Command = require('../commands/command');
const slackMessage = require('./slack-message');

class SlackCommandUtils {
    //"command":"/tip","text":"<@U8PTZ287N|d> 123"
  /**
   * Turns an {SLMessage} into a a {Command} object, with params depending on which slash command is provided by the user.
   * @param msg {SLMessage}
   * @returns {Command}
   */
    extractCommandParamsFromMessage(msg) {
        let adapter     = "slack";
        let sourceId    = msg.uniqueUserID;
        let command;
        let params = this.findCommandParams(msg.text); //Get the locations of our command params
        let amount;
        let address;
        let targetId;
        let walletPublicKey;
        //Remove the lead slash, and fall into the appropriate command case
        switch(msg.command.split('/')[1]) {
            case "register":
                walletPublicKey = params[0];
                command = new Command.Register(adapter, sourceId, walletPublicKey);
                break;
            case "tip":
                targetId = msg.team_id + ":" + this.extractUserIdFromCommand(params[0]);
                amount = parseFloat(params[1]);
                command = new Command.Tip(adapter, sourceId, targetId, amount);
                break;
            case "withdraw":
                amount = parseFloat(params[0]) || params[0]; // If we don't have a valid float, just include the info all the same for reference later on]
                address = params.length > 1 ? params[1] : null;
                console.log(`Creating Command.Withdraw with amount of ${amount}`);
                command = new Command.Withdraw(adapter, sourceId, amount, address);
                break;
            case "balance":
                command = new Command.Balance(adapter, sourceId);
                break;
            case "info":
              command = new Command.Info(adapter, sourceId);
              break;
            case "tip-developers":
              amount = parseFloat(params[0]) || params[0]; // If we don't have a valid float, just include the info all the same for reference later on]
              console.log(`Creating Command.TipDevelopers with amount of ${amount}`);
              command = new Command.TipDevelopers(adapter, sourceId, amount)
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
   *
   * Takes a string, which usually will be an escaped Slack userID string
   * such as "<@U12345678|dlohnes>". In this case, U12345678 is the slack
   * user ID unique to this person IN THIS TEAM. In order to generate
   * a truly unique user ID, we'll need to append the team ID as well.
   *
   * See: https://api.slack.com/slash-commands#how_do_commands_work
   *
   * @param cmd {String}
   * @returns {String}
   */
    extractUserIdFromCommand(cmd) {
        // If it doesn't contain @ and |, we're not interested. Just return what's given to us
        if(cmd.indexOf("@") < 0 || cmd.indexOf("|") < 0 ) {
            return cmd;
        }
        let result = cmd.slice(cmd.indexOf("@") + 1, cmd.indexOf("|"));
        return result;
    }

  /**
   * Splits out the given string "cmd" into separate strings at each white space character
   *
   * @param cmd {String} The string to be parsed
   * @returns {String[]} The same string but split out at white space characters
   */
    findCommandParams(cmd){
        cmd = this.removeExtraSpacesFromCommand(cmd); //Sanitize extra spaces from command
        const params = cmd.split(" ")
        return params;
    }


  /**
   * Removes extra spaces from a command
   * Example: removeExtraSpacesFromCommand("<user_id>   1234      myAddress")
   * Output: "<user_id> 1234 myAddress"
   *
   * @param cmd {String}
   * @returns {String}
   */
    removeExtraSpacesFromCommand(cmd) {
        if(!cmd) {
          return ""
        }
        return cmd.replace(/\s\s+/g, ' '); //Regex to remove multiple spaces, tabs, etc and replace with a single space for ease of parsing
    }
}

module.exports = new SlackCommandUtils();