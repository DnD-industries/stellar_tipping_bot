"use strict"

/**
 * Convenience object for converting a request body into a Slack Message specific data package
 */
class SLMessage {
  constructor(msgbody) {
    this.token = msgbody.token;
    this.team_id = msgbody.team_id;
    this.team_domain = msgbody.team_domain;
    this.user_id = msgbody.user_id;
    this.user_name = msgbody.user_name;
    this.command = msgbody.command;
    this.text = msgbody.text;
    this.response_url = msgbody.response_url;
  }

  /**
   * Derives the unique User Id we use as our convention for when working with Slack.
   * User IDs are NOT the same thing as user names. They are simply strings of characters and numbers, not intended to be human readable.
   * These could repeat across teams, so to ensure uniqueness we return a string in the format of "[teamId].[userId]"
   * @returns {String} The UUID of this user, as defined by the format "[teamId].[userId]"
   */
  get uniqueUserID() {
    return `${this.team_id}.${this.user_id}`;
  }
}

module.exports = SLMessage