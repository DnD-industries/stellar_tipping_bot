"use strict"
const { WebClient }   = require('@slack/client');
// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
// In our case we use an xoxb bot token
const oauth_token = process.env.SLACK_BOT_OAUTH_TOKEN;
const slackWebClient = new WebClient(oauth_token);

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

  get uniqueUserID() {
    return this.user_id + "-" + this.team_id;
  }

  // attachmentColor = An optional value that can either be one of good, warning, danger, or any hex color code (eg. #439FE0). 
  // This value is used to color the border along the left side of the message attachment.
  // TODO: Add URLs for icons and images as appropriate
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
  
  sendDMToSlackUser(userID, attachments){
    //Retrieve the dm id (between Starry and the user) for the user who sent us a message
    slackWebClient.im.list()
    .then((res) => {
      var dmID;
      for (let im of res.ims) {
        if (im.user === userID) {
          dmID = im.id;
          break;
        }
      }

      if (dmID) {
        console.log('DM id found: ', dmID);
        return dmID; //send our dmID to the next promise
      } else {
        throw new Error('DM id not found for ', userID);
      }
    }) //Send our DM now that we have the DM id
    .then((dmID) => {
      console.log("sending DM to channel: ", dmID);
      let optionalArgs = {username: process.env.SLACK_BOT_NAME, attachments: attachments};
      slackWebClient.chat.postMessage(dmID ? dmID : userID, "New Starry Activity: ", optionalArgs)
      .then((res) => {
        // `res` contains information about the posted message
        console.log('Message sent: ', res.ts);
      })
      .catch(console.error);
    })
    .catch(console.error);
  }

}

module.exports = SLMessage