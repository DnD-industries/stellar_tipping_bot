"use strict"
const { WebClient }   = require('@slack/client');
const Utils = require('../../utils')

class SlackClient extends WebClient {

  /**
   * Given a Slack user ID, will eventually return the ID necessary for DM'ing that user.
   * Note that a User Id for slack is not your human readable @username.
   * For more info on how sending messages works on Slack see https://api.slack.com/methods/chat.postMessage
   * @param userID {String} A String representing either the slack User ID or our own Unique ID
   * @returns {Promise<*|PromiseLike<T>|Promise<T>>}
   */
  async getDMIdForUser(userID) {

    if(userID.includes(".")) {
      return this.getDMIdForUser(Utils.slackUserIdFromUniqueId(userID));
    }

    return this.im.list()
      .then((res) => {
        console.log(`Response: ${JSON.stringify(res)}`)
        var dmID;
        for (let im of res.ims) {
          if (im.user === userID) {
            dmID = im.id;
            break;
          }
        }

        if (dmID) {
          console.log('DM id found ', dmID);
          return Promise.resolve(dmID); //send our dmID to the next promise
        } else {
          let idNotFound = 'DM id not found for ' + userID;
          console.log(idNotFound);
          return Promise.reject(idNotFound);
        }
      })
  }

  /**
   * Takes in certain arguments and from them will distill an attachment object for use with {this.sendDMToSlackUserWithAttachments()}
   *
   * @param title {String} The title of the attachment
   * @param attachmentColor {String} An optional value that can either be one of 'good', 'warning', 'danger', or any hex color code (eg. #439FE0). This value is used to color the border along the left side of the message attachment.
   * @param plainTextBody {String} The body of the attachment. Can contain additional characters that allow for formatting
   * @param fieldsArray Hashes contained within this array will be displalyed in a table inside the attachment. Search for 'fields' here for more info: https://api.slack.com/docs/message-attachments
   * // TODO: Add URLs for icons and images as appropriate
   * @returns {string}
   */
  formatSlackAttachment(title, attachmentColor, plainTextBody, fieldsArray = []) {

    let attachment = [
      {
        "fallback": plainTextBody,
        "color": attachmentColor,
        "author_name": "Starry",
        "author_link": "http://flickr.com/bobby/",
        "author_icon": "http://flickr.com/icons/bobby.jpg",
        "title": title,
        "title_link": "",
        "text": plainTextBody,
        "fields": fieldsArray,
        "image_url": "http://my-website.com/path/to/image.jpg",
        "thumb_url": "http://example.com/path/to/thumb.png",
        "footer": "Starry Bot",
        "footer_icon": "https://www.stellar.org/wp-content/themes/stellar/images/stellar-rocket-300.png",
        "ts": Date.now()/1000
      }
    ];

    return JSON.stringify(attachment);
  }

  /**
   * Given a unique user ID
   * @param userID {String} Unique user id in the form of "[slackteamid].[slackuserid]". The DM Id for the user will be retreived from this.
   * @param plainTextBody {String} The text to be sent to the user
   * @returns {Promise<*|Promise|Promise<T>>}
   */
  async sendPlainTextDMToSlackUser(userID, plainTextBody){
    //Retrieve the dm id (between Starry and the user) for the user who sent us a message
    return this.im.list()
      .then((res) => {
        return this.getDMIdForUser(userID);
      }) //Send our DM now that we have the DM id
      .then((dmID) => {
        console.log("sending DM to channel: ", dmID);
        return this.chat.postMessage(dmID ? dmID : userID, plainTextBody)
        .then((res) => {
          // `res` contains information about the posted message
          console.log('Message sent: ', res);
          return Promise.resolve(res);
        })
        .catch((err) => {
          console.error(err);
          return Promise.reject(err);
        });
      })
      .catch((err) => {
        console.error(err);
        return Promise.reject(err);
      });
  }

  /**
   *
   * @param userID {String} Unique user id in the form of "[slackteamid].[slackuserid]". The DM Id for the user will be retreived from this.
   * @param attachments {Array} An array of attachments to be included in the message in place of a standard text message
   * @returns {Promise<*|Promise|Promise<T>>}
   */
  async sendDMToSlackUserWithAttachments(userID, attachments){
    //Retrieve the dm id (between Starry and the user) for the user who sent us a message
    return this.im.list()
      .then((res) => {
        return this.getDMIdForUser(userID);
      }) //Send our DM now that we have the DM id
      .then((dmID) => {
        console.log("sending DM to channel: ", dmID);
        let optionalArgs = {username: process.env.SLACK_BOT_NAME, attachments: attachments};
        return this.chat.postMessage(dmID ? dmID : userID, "New Starry Activity: ", optionalArgs)
        .then((res) => {
          // `res` contains information about the posted message
          console.log('Message sent: ', res);
          return Promise.resolve(res);
        })
        .catch((err) => {
          console.error(err);
          return Promise.reject(err);
        });
      })
      .catch((err) => {
        console.error(err);
        return Promise.reject(err);
      });
  }
}

module.exports = SlackClient