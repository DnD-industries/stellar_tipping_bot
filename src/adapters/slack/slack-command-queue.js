const {promisify} = require('util');
const Command = require('../commands/command')
const Utils = require('../../utils')
const SlackClient = require('../slack/slack-client')

/**
 * Enqueues commands as they are made by Slack users.
 * Can be queried to pop those commands off in a FIFO order (first-in-first-out).
 */
class CommandQueue {
  /**
   *
   * @param client {RedisClient}
   */
  constructor(client){
    // Create an async wrapper around the functions we need
    this.redisClient = {
      push : promisify(client.rpush).bind(client),
      pop  : promisify(client.lpop).bind(client),
    }
  }

  /**
   * Serializes a given Command and then pushes it on the stack of commands to be dealt with
   * @param command {Command} The unserialized command object to be enqueued
   */
  async pushCommand (command) {
    const serialized = command.serialize();
    await this._push(serialized);
  }

  /**
   *
   * @returns {Promise<Command|null>}
   */
  async popCommand() {
    let serialized = await this._pop();
    let deserialized = Command.Deserialize(serialized);
    return deserialized;
  }

  /**
   *
   * @param serializedCommand {String} A serialized representation of a Command object
   * @private
   */
  async _push (serializedCommand) {
    await this.redisClient.push("commands", serializedCommand);
  }

  async _pop() {
    return await this.redisClient.pop("commands");
  }

  /**
   * Sends all commands which have been queued up
   *
   * @param slackAdapter {Slack}
   */
  async flush(slackAdapter) {
    let command = await this.popCommand();
    let client = SlackClient.botClientForCommand(command);
    while(command) {
      console.log(`Command is: ${JSON.stringify(command)}`);
      let textBody = await slackAdapter.handleCommand(command);
      client.sendPlainTextDMToSlackUser(Utils.slackUserIdFromUniqueId(command.uniqueId), textBody);
      command = await this.popCommand();
    }
  }
}

module.exports = CommandQueue