"use strict"
const { WebClient }   = require('@slack/client');

class SlackClient extends WebClient {

  async getDMIdForUser(userID) {
    return this.im.list()
        .then((res) => {
          var dmID;
          for (let im of res.ims) {
            if (im.user === userID) {
              dmID = im.id;
              break;
            }
          }

          if (dmID) {
            console.log('DM id found ', dmID);
            return dmID; //send our dmID to the next promise
          } else {
            throw new Error('DM id not found for ' + userID);
          }
        })
  }

  async sendDMToSlackUser(userID, text){
    //Retrieve the dm id (between Starry and the user) for the user who sent us a message
    return this.im.list()
        .then((res) => {
          var dmID;
          for (let im of res.ims) {
            if (im.user === userID) {
              dmID = im.id;
              break;
            }
          }

          if (dmID) {
            console.log('DM id found ', dmID);
            return dmID; //send our dmID to the next promise
          } else {
            throw new Error('DM id not found for ' + userID);
          }
        }) //Send our DM now that we have the DM id
        .then((dmID) => {
          console.log("sending DM to channel: ", dmID);
          this.chat.postMessage(dmID ? dmID : userID, text)
              .then((res) => {
                // `res` contains information about the posted message
                console.log('Message sent: ', res.ts);
              })
              .catch((err) => {
                console.error(err);
                return false;
              });
          return true;
        })
        .catch((err) => {
          console.error(err);
          return false;
        });
  }

  async sendAttachmentsToSlackUser(userID, attachments){
    //Retrieve the dm id (between Starry and the user) for the user who sent us a message
    return this.im.list()
        .then((res) => {
          var dmID;
          for (let im of res.ims) {
            if (im.user === userID) {
              dmID = im.id;
              break;
            }
          }

          if (dmID) {
            console.log('DM id found ', dmID);
            return dmID; //send our dmID to the next promise
          } else {
            throw new Error('DM id not found for ' + userID);
          }
        }) //Send our DM now that we have the DM id
        .then((dmID) => {
          console.log("sending DM to channel: ", dmID);
          let optionalArgs = {username: process.env.SLACK_BOT_NAME, attachments: attachments};
          this.chat.postMessage(dmID ? dmID : userID, "New Starry Activity: ", optionalArgs)
              .then((res) => {
                // `res` contains information about the posted message
                console.log('Message sent: ', res.ts);
              })
              .catch((err) => {
                console.error(err);
                return false;
              });
          return true;
        })
        .catch((err) => {
          console.error(err);
          return false;
        });
  }
}

module.exports = SlackClient