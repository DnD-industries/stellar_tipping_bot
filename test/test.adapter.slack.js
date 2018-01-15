const assert = require('assert')
const Slack = require('../src/adapters/slack/index')
const Message = require('../src/adapters/slack/slack-message')

class TestableSlack extends Slack {}

describe('slackAdapter', async () => {

  let slackAdapter;
  let accountWithWallet;
  let accountWithoutWallet;

  beforeEach(async () => {
    const config = await require('./setup')()
    slackAdapter = new TestableSlack(config)
    Account = config.models.account

    accountWithWallet = await Account.createAsync({
      adapter: 'testing',
      uniqueId: 'team.foo',
      balance: '1.0000000',
      walletAddress: 'GDTWLOWE34LFHN4Z3LCF2EGAMWK6IHVAFO65YYRX5TMTER4MHUJIWQKB'
    })

    accountWithoutWallet = await Account.createAsync({
      adapter: 'testing',
      uniqueId: 'team.bar',
      balance: '1.0000000'
    })
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

    it ('should send a message back to the user and reject if a user has already registered with that wallet', () => {
      let msg = new Message({
        command : "register",
        text    : "GDTWLOWE34LFHN4Z3LCF2EGAMWK6IHVAFO65YYRX5TMTER4MHUJIWQKB",
        team_id : "team",
        user_id : "foo"
      })

      slackAdapter.handleRegistrationRequest(msg).catch((reason) => {
        if(reason === Slack.REG_FAIL_WALLET_VALIDATION) {
          done()
        }
      })
    })

    it ('should send a message back to the user and reject if someone else has already registered with that wallet', () => {
      assert.equal(true ,false)
    })

    it (`should overwrite the user's current wallet info if they have a preexisting wallet, and send an appropriate message`, () => {
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

    it ('should otherwise save the wallet info to the database for the user and send an appropriate message back to them', () => {
      assert.equal(true ,false)
    })
  })
})
