const assert = require('assert')
const Slack = require('../src/adapters/slack/index')
const Message = require('../src/adapters/slack/slack-mesage')

class TestableSlack extends Slack {
  startServer () {}
}

describe('slackAdapter', async () => {

  let slackAdapter;

  beforeEach(async () => {
      const config = await require('./setup')()
      slackAdapter = new TestableSlack(config)
  })

  // Validate their wallet address
  // If the user is already registered, send them a message back explaining (and what their Wallet Address is)
  // If the user is not already registered
  // Make sure no one else has already registered that same wallet address
  // Save to the database
  // Send them a message back (error if applicable)

  describe('handle registration request', () => {

    it ('should send a message back to the user and reject if their wallet fails validation', (done) => {
      let msg = new Message({
          command : "register",
          text : "badwalletaddress013934888318"
        })

      slackAdapter.handleRegistrationRequest(msg).catch((reason) => {
        if(reason === Slack.REG_FAIL_WALLET_VALIDATION) {
          done()
        }
      })
    })

    it ('should send a message back to the user and reject if they are already registered', () => {
      assert.equal(true ,false)
    })

    it ('should send a message back to the user and reject if a user has already registered with that wallet', () => {
      assert.equal(true ,false)
    })

    it ('should otherwise save the wallet info to the database for the user and send a message back to them', () => {
      assert.equal(true ,false)
    })
  })
})
