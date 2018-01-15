const assert = require('assert');
const expect = require('chai').expect;
const sutil = require('../src/adapters/slack/utils');
const SlackClient = require('../src/adapters/slack/slack-client')
const testTimeout = 5000; //milliseconds

describe('slack-message', async () => {
 	require('dotenv').config({path: './.env.' + process.env.NODE_ENV });
 	const message = require('../src/adapters/slack/slack-message');

  describe('uniqueUserID', () => {
    it('should combine the user_id and team_id to create a unique ID', () => {
      let teamID = "team_id";
    	let userID = "user_id";
    	let msg = new message({team_id: teamID,
                              user_id: userID});
      assert.equal(msg.uniqueUserID, `${teamID}.${userID}`);
    })
  })

  describe('sendDMToSlackUser', () => {
    const oauth_token = process.env.SLACK_BOT_OAUTH_TOKEN;
    let client = new SlackClient(oauth_token);

    it('should send an attachment DM on the StarryTest slack from Starry', () => {
    	let userID = "U8PTZ287N";
      return client.sendDMToSlackUserWithAttachments(userID, client.formatSlackAttachment("Test tip!", "good", "Testing sendDMToSlackUserWithAttachments"))
      .then((result) => {
        //console.log("RESULT:" + JSON.stringify(result));
        expect(result.ok).to.equal(true);
      }); 
    }).timeout(testTimeout);

    it('should fail to send an attachment DM to an invalid userID on the StarryTest slack', () => {
    	let userID = "U1234567N";
      return client.sendDMToSlackUserWithAttachments(userID, client.formatSlackAttachment("Test tip!", "good", "Testing sendDMToSlackUserWithAttachments"))
      .then((result) => {
        throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
      })
      .catch((result) => {
        console.log("RESULT:" + JSON.stringify(result));
      })
    }).timeout(testTimeout);

    it('should send a plain text DM on the StarryTest slack from Starry', () => {
      let userID = "U8PTZ287N";
      return client.sendPlainTextDMToSlackUser(userID, "Testing sendPlainTextDMToSlackUser")
      .then((result) => {
        //console.log("RESULT:" + JSON.stringify(result));
        expect(result.ok).to.equal(true);
      }); 
    }).timeout(testTimeout);

    it('should fail to send a plain text DM to an invalid userID on the StarryTest slack', () => {
      let userID = "U1234567N";
      return client.sendPlainTextDMToSlackUser(userID, "Testing sendPlainTextDMToSlackUser")
      .then((result) => {
        throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
      })
      .catch((result) => {
        console.log("RESULT:" + JSON.stringify(result));
      })
    }).timeout(testTimeout);
  })
})
