const assert = require('assert')
const Slack = require('../src/adapters/slack/slack-adapter')
const Command = require('../src/adapters/commands/command')
const sinon = require('sinon')


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
      let returnedValue = await slackAdapter.handleWithdrawalRequest(command);
      assert.equal(returnedValue, "You must register a wallet address before making a withdrawal, or provide a wallet address as an additional argument");
    })

    it (`should not do the withdrawal and should return an appropriate message if the user provides an invalid public key`, async() => {
      const badWalletAddress = "badWallet"
      let command = new Command.Withdraw('testing', accountWithoutWallet.uniqueId, 1, badWalletAddress)
      let returnedValue = await slackAdapter.handleWithdrawalRequest(command);
      assert.equal(returnedValue, `\`${badWalletAddress}\` is not a valid public key. Please try again with a valid public key.`);
    })

    it (`should not do the withdrawal and should return an appropriate message if the  user does not have a sufficient balance`, async() => {
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, 500)
      let returnedValue = await slackAdapter.handleWithdrawalRequest(command);
      assert.equal(returnedValue, "You requested to withdraw 500XLM but your wallet only contains 1XLM");
    })

    it (`should complete the withdrawal and should return an appropriate message if the  user has a sufficient balance`, async() => {
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, 1)
      let returnedValue = await slackAdapter.handleWithdrawalRequest(command);
      assert.equal(returnedValue, `You withdrew \`1XLM\` to your wallet at \`${accountWithWallet.walletAddress}\``);
    })
  })
})
