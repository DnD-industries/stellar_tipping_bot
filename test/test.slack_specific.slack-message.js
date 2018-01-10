const assert = require('assert')
const sutil = require('../src/adapters/slack/utils')
const message = require('../src/adapters/slack/slack-mesage')

describe('slack-message', () => {
  describe('uniqueUserID', () => {
    it('should combine the user_id and team_id to create a unique ID', () => {
      let teamID = "team_id";
    	let userID = "user_id";
    	let msg = new message({team_id: teamID,
                              user_id: userID});
      assert.equal(msg.uniqueUserID, userID+"-"+teamID);
    })
  })

  describe('sendDMToSlackUser', () => {
    it('should send a DM on the StarryTest slack from Starry', () => {
    	let userID = "U8PTZ287N";
    	let msg = new message({user_id: userID});
  		return msg.sendDMToSlackUser(msg.user_id, msg.formatSlackAttachment("Test tip!", "good", "Testing sendDMToSlackUser"));
    })

    it('should fail to send a DM to an invalid userID on the StarryTest slack', () => {
    	let userID = "U1234567N";
    	let msg = new message({user_id: userID});
  		return msg.sendDMToSlackUser(msg.user_id, msg.formatSlackAttachment("Test tip!", "good", "Testing sendDMToSlackUser"));
    })
  })
})
