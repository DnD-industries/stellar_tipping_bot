const assert = require('assert');
const expect = require('chai').expect;
const sinon = require('sinon')
const SlackClient = require('../src/adapters/slack/slack-client')
const testTimeout = 10000; //milliseconds

describe('slack-message', async () => {
  let client;
  const oauth_token = process.env.SLACK_BOT_OAUTH_TOKEN;

  beforeEach(async () => {
    const config = await require('./setup')()
    client = new SlackClient(oauth_token);
  })

 	require('dotenv').config({path: './.env.' + process.env.NODE_ENV });

  describe('sendDMToSlackUser', () => {


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

  describe('getDMIdForUser', () => {
    it('should call itself again with just the slack user ID if it is originally called with a full uniqueID', async () => {
      let teamID = "T12345"
      let userID = "U67890"
      let uniqueID = teamID + '.' + userID;
      let spy = sinon.spy(client, "getDMIdForUser") // Spy on ourselves, retaining all original functionality

      try {
        let value = await client.getDMIdForUser(uniqueID);
      } catch (e) {
        // We expect to catch an error here, as no ID will be found
      }
      assert(spy.withArgs(uniqueID).calledOnce)
      assert(spy.withArgs(userID).calledOnce)
    })
  })
})
