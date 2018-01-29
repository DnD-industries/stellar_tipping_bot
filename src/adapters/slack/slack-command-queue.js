const {promisify} = require('util');

/**
 * Enqueues commands as they are made by Slack users.
 * Can be queried to pop those commands off in a FIFO order (first-in-first-out) so that commands don't get stale.
 */
class CommandQueue {
  /**
   *
   * @param redisClient {RedisClient}
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
  pushCommand (command) {
    const serialized = command.serialize();
    this._push(serialized);
  }

  /**
   *
   * @param serializedCommand {String} A serialized representation of a Command object
   * @private
   */
  _push (serializedCommand) {
    this.redisClient.push(serializedCommand)
  }
}

module.exports = CommandQueue