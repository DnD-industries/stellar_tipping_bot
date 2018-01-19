const assert = require('assert')
const Slack = require('../src/adapters/slack/slack-adapter')
const Command = require('../src/adapters/commands/command')
const sinon = require('sinon')
const utils = require('../src/utils')

// TODO: Get rid of this
class TestableSlack extends Slack {
  async onRegistrationBadWallet (walletAddressGiven) {
    return "badWallet"
  }

  async onRegistrationReplacedOldWallet(oldWallet, newWallet) {
    return `${oldWallet} replaced by ${newWallet}`
  }

  async onRegistrationSameAsExistingWallet(walletAddress) {
    return `Already registered ${walletAddress}`
  }

  async onRegistrationOtherUserHasRegisteredWallet(walletAddress) {
    return `Another user has already registered ${walletAddress}`
  }

  async onRegistrationRegisteredFirstWallet(walletAddress) {
    return `Successfully registered user's first wallet: ${walletAddress}`
  }
}

describe('slackAdapter', async () => {

  let slackAdapter;
  let accountWithWallet;
  let accountWithoutWallet;

  beforeEach(async () => {
    const config = await require('./setup')()
    config.stellar = {
      createTransaction : function() {},
      send : function() {}
    }
    slackAdapter = new TestableSlack(config);
    Account = config.models.account;

    accountWithWallet = await Account.createAsync({
      adapter: 'testing',
      uniqueId: 'team.foo',
      balance: '1.0000000',
      walletAddress: 'GDTWLOWE34LFHN4Z3LCF2EGAMWK6IHVAFO65YYRX5TMTER4MHUJIWQKB'
    });

    accountWithoutWallet = await Account.createAsync({
      adapter: 'testing',
      uniqueId: 'team.bar',
      balance: '1.0000000'
    })
  });

  describe('handle registration request', () => {

    it ('should return a message to be sent back to the user if their wallet fails validation', async () => {
      let msg = new Command.Register('testing', 'someUserId', 'badwalletaddress013934888318')
      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, "badWallet");
    })

    it ('should return a message to send back to the user if this user has already registered with that wallet', async () => {
      const sameAddressAsOtherAccount = accountWithWallet.walletAddress
      let msg = new Command.Register('testing', 'team.foo', sameAddressAsOtherAccount)

      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `Already registered ${accountWithWallet.walletAddress}`);
    })

    it ('should send a message back to the user if someone else has already registered with that wallet', async () => {
      let msg = new Command.Register('testing', 'newTeam.someNewUserId', accountWithWallet.walletAddress)

      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `Another user has already registered ${accountWithWallet.walletAddress}`);
    })

    // TODO: Make sure this updates the 'updatedAt' value of the Account object
    it (`should overwrite the user's current wallet info if they have a preexisting wallet, and send an appropriate message`, async () => {
      const newWalletId = "GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN"
      const msg = new Command.Register('testing', 'team.foo', newWalletId)
      const returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      const refreshedAccount = await Account.getOrCreate('testing', 'team.foo')
      assert.equal(returnedValue, `${accountWithWallet.walletAddress} replaced by ${newWalletId}`);
      assert.equal(refreshedAccount.walletAddress, newWalletId);
    })

    it ('should otherwise save the wallet info to the database for the user and return an appropriate message', async () => {
      const desiredWalletAddress = 'GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN'
      let msg = new Command.Register('testing', 'newTeam.userId', desiredWalletAddress)

      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `Successfully registered user's first wallet: ${desiredWalletAddress}`);
    })
  })

  describe(`handle withdrawal request`, () => {
    it (`should not do the withdrawal and should return an appropriate message if the user is not registered`, async() => {
      let command = new Command.Withdraw('testing', accountWithoutWallet.uniqueId, 1)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, "You must register a wallet address before making a withdrawal, or provide a wallet address as an additional argument");
    })

    it (`should not do the withdrawal and should return an appropriate message if the user provides an invalid public key`, async() => {
      const badWalletAddress = "badWallet"
      let command = new Command.Withdraw('testing', accountWithoutWallet.uniqueId, 1, badWalletAddress)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `\`${badWalletAddress}\` is not a valid public key. Please try again with a valid public key.`);
    })

    it (`should not do the withdrawal and should return an appropriate message if the  user does not have a sufficient balance`, async() => {
      let command = new Command.Withdraw(accountWithWallet.adapter, accountWithWallet.uniqueId, 500.0142)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, "You requested to withdraw \`500.0142 XLM\` but your wallet only contains \`1 XLM\`");
    })

    it (`should complete the withdrawal and should return an appropriate message if the  user has a sufficient balance`, async() => {
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, 1)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `You withdrew \`1 XLM\` to your wallet at \`${accountWithWallet.walletAddress}\``);
    })

    it (`should return an appropriate message if the  user supplies a string in place of a number`, async() => {
      let amount = 'asdf'
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, amount)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `\`${amount}\` is not a valid withdrawal amount. Please try again.`);
    })
  })

  describe(`receive potential tip`, () => {
    it (`should return an error message if the user's balance is not high enough`, async() => {
      let amount = 1000
      let command = new Command.Tip('testing', 'team.foo', 'team.new', amount)
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      assert.equal(`Sorry, your tip could not be processed. Your account only contains \`${utils.formatNumber(accountWithWallet.balance)} XLM\` but you tried to send \`${utils.formatNumber(amount)} XLM\``, returnedValue)
    })

    it (`should return a koan if the tipper tips them self`, async() => {
      let amount = 1
      let command = new Command.Tip('testing', 'team.foo', 'team.foo', amount)
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      assert.equal(returnedValue, `What is the sound of one tipper tipping?`)
    })

    it (`should return a confirmation message to the tipper once the tip has gone through`, async() => {
      let amount = 0.9128341 // Made this out to seven digits rather than just "1" to ensure robustness in testing
      let command = new Command.Tip('testing', 'team.foo', 'team.new', amount)
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      const tippedAccount = await Account.getOrCreate('testing', 'team.new')
      assert.equal(tippedAccount.balance, amount)
      assert.equal(returnedValue, `You successfully tipped \`${utils.formatNumber(amount)} XLM\``)
    })

    it (`should send a message with detailed sign up instructions to any tip receiver who is not yet registered after the tip goes through`, async() => {
      assert(false)
    })

    it (`should send a simple message to any tip receiver who has already registered after the tip goes through`, async() => {
      assert(false)
    })
  })
})
