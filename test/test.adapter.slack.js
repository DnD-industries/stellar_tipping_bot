const assert = require('assert')

const Command = require('../src/adapters/commands/command')
const sinon = require('sinon')
const Utils = require('../src/utils')
const Logger = require('../src/loggers/abstract-logger')


describe('slackAdapter', async () => {

  let slackAdapter;
  let accountWithWallet;
  let accountWithoutWallet;
  let stellarpubkey;
  let mockClient;
  let Slack;

  beforeEach(async () => {
    const config = await require('./setup')()
    config.stellar = {
      createTransaction : function() {},
      send : function() {}
    }

    Slack = require('../src/adapters/slack/slack-adapter')

    mockClient = {
      sendPlainTextDMToSlackUser : sinon.spy(),
      getDMIdForUser : async function() {
        return "dmId"
      }
    }

    class TestableSlack extends Slack {
      constructor (config) {
        super(config);
        this.logger = new Logger();

        this.getBotClientForCommand = function() {
          return mockClient;
        }

        this.getBotClientForUniqueId = function() {
          return mockClient;
        }

        this.getLogger = function() {
          return this.logger;
        }
      }
    }

    slackAdapter = new TestableSlack(config);
    Account = config.models.account;

    accountWithWallet = await Account.createAsync({
      adapter: 'testing',
      uniqueId: 'team.foo',
      balance: '100.0000000',
      walletAddress: 'GDTWLOWE34LFHN4Z3LCF2EGAMWK6IHVAFO65YYRX5TMTER4MHUJIWQKB'
    });

    accountWithoutWallet = await Account.createAsync({
      adapter: 'testing',
      uniqueId: 'team.bar',
      balance: '1.0000000'
    })

    stellarpubkey = process.env.STELLAR_PUBLIC_KEY;
  });

  afterEach('slackAdapter', async() => {
    process.env.STELLAR_PUBLIC_KEY = stellarpubkey;
  })

  describe('handle registration request', () => {

    it ('should return a message to be sent back to the user if their wallet fails validation', async () => {
      const badWalletAddress = 'badwalletaddress013934888318';
      let msg = new Command.Register('testing', 'someUserId', badWalletAddress)
      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `${badWalletAddress} is not a valid Public Key / wallet address`);
    })

    it ('should return a message to send back to the user if this user has already registered with that wallet', async () => {
      const sameAddressAsOtherAccount = accountWithWallet.walletAddress
      let msg = new Command.Register('testing', 'team.foo', sameAddressAsOtherAccount)

      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `You are already using the public key \`${accountWithWallet.walletAddress}\``);
    })

    it ('should send a message back to the user if someone else has already registered with that wallet', async () => {
      let msg = new Command.Register('testing', 'newTeam.someNewUserId', accountWithWallet.walletAddress)
      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `Another user has already registered the wallet address \`${accountWithWallet.walletAddress}\`. If you think this is a mistake, please contact @dlohnes on Slack.`);
    })

    // TODO: Make sure this updates the 'updatedAt' value of the Account object
    it (`should overwrite the user's current wallet info if they have a preexisting wallet, and send an appropriate message`, async () => {
      const newWalletId = "GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN"
      const msg = new Command.Register('testing', 'team.foo', newWalletId)
      const returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      const refreshedAccount = await Account.getOrCreate('testing', 'team.foo')
      assert.equal(returnedValue, `Your old wallet \`${accountWithWallet.walletAddress}\` has been replaced by \`${newWalletId}\``);
      assert.equal(refreshedAccount.walletAddress, newWalletId);
    })

    it ('should send a message back to the user if they are trying to register with the robot`s own wallet address', async () => {
      process.env.STELLAR_PUBLIC_KEY = 'GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN'
      let msg = new Command.Register('testing', 'newTeam.someNewUserId', process.env.STELLAR_PUBLIC_KEY)
      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `That is my address. You must register with your own address.`);
    })

    it ('should otherwise save the wallet info to the database for the user and return an appropriate message', async () => {
      const desiredWalletAddress = 'GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN'
      let msg = new Command.Register('testing', 'newTeam.userId', desiredWalletAddress)

      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `Successfully registered with wallet address \`${desiredWalletAddress}\`.\n\nSend XLM deposits to \`${process.env.STELLAR_PUBLIC_KEY}\` to make funds available for use with the '/tip' command.`);
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
      const withdrawAmount = 500.0142
      let command = new Command.Withdraw(accountWithWallet.adapter, accountWithWallet.uniqueId, 500.0142)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `You requested to withdraw \`${withdrawAmount} XLM\` but your wallet only contains \`${Utils.formatNumber(accountWithWallet.balance)} XLM\``);
    })

    it (`should complete the withdrawal and should return a message with the amount withdrawn and a transaction receipt if the  user has a sufficient balance`, async() =>
    {
      const transactionHash = "txHash"
      const amount = 11
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, amount)
      // A little messy, but the general idea here is that we are getting the command to just
      // return what it would have already been returning, but with its 'withdraw' function's return value pre-determined for testing purposes
      let sourceAccount = await command.getSourceAccount()
      sourceAccount.withdraw = () => {
        return transactionHash
      }
      command.getSourceAccount = () => {
        return sourceAccount;
      }
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `You withdrew \`${amount} XLM\` to your wallet at \`${accountWithWallet.walletAddress}\`\n\nYour transaction hash is \`${transactionHash}\`\nYou can validate the transaction at: ${process.env.STELLAR_TX_VIEWER_URL_BASE}/${transactionHash}`);
    })

    it (`should return an appropriate message if the  user supplies a string in place of a number`, async() => {
      let amount = 'asdf'
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, amount)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `\`${amount}\` is not a valid withdrawal amount. Please try again.`);
    })

    it (`should return an appropriate message if the user supplies a public address that doesn't exist on the chain`, async() => {
      let nonexistantButValidAddress = "GBZKOHL2DJHVNPWWRFCDBDGMC2T5OWNVA33LN7DOY55ETALXU3PBXTN3";
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, 1, nonexistantButValidAddress)
      slackAdapter.config.stellar = {
        createTransaction: () => new Promise((res, rej) => {
          return rej('DESTINATION_ACCOUNT_DOES_NOT_EXIST')
        })
      }
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `I could not complete your request. The address you tried to withdraw from does not exist.`);
    })

    it (`should return an appropriate message if the user tries to tip out to the tipping bot's wallet address`, async() => {
      // This isn't actually the bot's address, but the var name should tell you "what is going on here" for purposes of testability
      let robotsOwnTippingAddress = "GBZKOHL2DJHVNPWWRFCDBDGMC2T5OWNVA33LN7DOY55ETALXU3PBXTN3";
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, 1, robotsOwnTippingAddress)
      slackAdapter.config.stellar = {
        createTransaction: () => new Promise((res, rej) => {
          return rej('TRANSACTION_REFERENCE_ERROR')
        })
      }
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `You're not allowed to send money through this interface to the tipping bot. If you'd like to tip the creators, check our repository on GitHub.`);
    })
  })

  describe(`receive potential tip`, () => {
    it (`should return an error message, and a log should be made, if the user's balance is not high enough`, async() => {
      let amount = 1000
      let command = new Command.Tip('testing', 'team.foo', 'team.new', amount)
      var spy = sinon.spy(slackAdapter.getLogger().CommandEvents, "onTipWithInsufficientBalance")
      let returnedValue = await slackAdapter.receivePotentialTip(command)

      assert(spy.withArgs(command, accountWithWallet.balance).calledOnce)
      assert.equal(returnedValue, `Sorry, your tip could not be processed. Your account only contains \`${Utils.formatNumber(accountWithWallet.balance)} XLM\` but you tried to send \`${Utils.formatNumber(amount)} XLM\``)
    })

    it (`should return a koan if the tipper tips them self`, async() => {
      let amount = 1
      let command = new Command.Tip('testing', 'team.foo', 'team.foo', amount)
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      assert.equal(returnedValue, `What is the sound of one tipper tipping?`)
    })

    it (`should return a confirmation message with transaction hash to the tipper once the tip has gone through`, async() => {
      let amount = 0.9128341 // Made this out to seven digits rather than just "1" to ensure robustness in testing
      let command = new Command.Tip('testing', 'team.foo', 'team.new', amount)
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      const tippedAccount = await Account.getOrCreate('testing', 'team.new')
      assert.equal(tippedAccount.balance, amount)
      assert.equal(returnedValue, `You successfully tipped \`${Utils.formatNumber(amount)} XLM\``)
    })

    it (`should send back an appropriate error message if the tipper tries to tip a username that doesn't actually exist, and log it`, async() => {
      let amount = 0.9128341 // Made this out to seven digits rather than just "1" to ensure robustness in testing
      let recipientId = 'NON_EXISTANT_USER'
      let command = new Command.Tip('testing', 'team.foo', recipientId, amount)
      var spy = sinon.spy(slackAdapter.getLogger().CommandEvents, "onTipNoTargetFound")


      // Simulate us not finding a corresponding ID
      mockClient.getDMIdForUser = async function() {
        throw "Error"
      }


      let returnedValue = await slackAdapter.receivePotentialTip(command)
      assert.equal(returnedValue, `Your tip was cancelled. We could not find a user with that username. Make sure it is formatted correctly, such as '@username'.`)
      assert(spy.withArgs(command).calledOnce)
    })

    it (`should send a message with detailed sign up instructions to any tip receiver who is not yet registered after the tip goes through, and make a log of it`, async() => {
      let amount = 0.9128341 // Made this out to seven digits rather than just "1" to ensure robustness in testing
      let recipientId = 'team.bar'
      let command = new Command.Tip('testing', 'team.foo', recipientId, amount)
      var spy = sinon.spy(slackAdapter.getLogger().MessagingEvents, "onTipReceivedMessageSent")
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      assert(await slackAdapter.getBotClientForCommand(command).sendPlainTextDMToSlackUser.calledWith(recipientId,
          `Someone tipped you \`${Utils.formatNumber(amount)} XLM\`\n\nIn order to withdraw your funds, first register your public key by typing /register [your public key]\n\nYou can also tip other users using the /tip command.`), "The client should receive a message telling it to DM the recipient once the tip goes through")
      assert.equal(returnedValue, `You successfully tipped \`${Utils.formatNumber(amount)} XLM\``)
      assert(spy.withArgs(command, false).calledOnce)
    })

    it (`should send a simple message and to any tip receiver who has already registered after the tip goes through, and make a log of doing so`, async() => {
      let amount = 0.9128341 // Made this out to seven digits rather than just "1" to ensure robustness in testing
      let recipientId = 'team.foo'
      let command = new Command.Tip('testing', 'team.bar', recipientId, amount)
      var spy = sinon.spy(slackAdapter.getLogger().MessagingEvents, "onTipReceivedMessageSent")
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      assert(slackAdapter.getBotClientForCommand(command).sendPlainTextDMToSlackUser.calledWith(recipientId, `Someone tipped you \`${Utils.formatNumber(amount)} XLM\``), "The client should receive a message telling it to DM the recipient once the tip goes through")
      assert.equal(returnedValue, `You successfully tipped \`${Utils.formatNumber(amount)} XLM\``)
      assert(spy.withArgs(command, true).calledOnce)
    })

    // var spy = sinon.spy(slackAdapter.getLogger().CommandEvents, "onBalanceRequest")
    // assert(spy.withArgs(balanceCommand, false).calledOnce)
  })

  describe('receive Balance Request', () => {
    it('should return the user`s account balance and instructions on how to register if they are not registered', async () => {
      let balanceCommand = new Command.Balance(accountWithoutWallet.adapter, accountWithoutWallet.uniqueId, accountWithoutWallet.walletAddress)
      const returned = await slackAdapter.receiveBalanceRequest(balanceCommand)
      assert.equal(returned, `Your wallet address is: \`Use the /register command to register your wallet address\`\nYour balance is: \'${accountWithoutWallet.balance}\'`)
    })

    it('should properly log a balance request if the user is not registered', async () => {
      let balanceCommand = new Command.Balance(accountWithoutWallet.adapter, accountWithoutWallet.uniqueId, accountWithoutWallet.walletAddress)
      var spy = sinon.spy(slackAdapter.getLogger().CommandEvents, "onBalanceRequest")
      await slackAdapter.receiveBalanceRequest(balanceCommand)
      assert(spy.withArgs(balanceCommand, false).calledOnce)
    })

    it('should properly log a balance request if the user is registered', async () => {
      let balanceCommand = new Command.Balance(accountWithWallet.adapter, accountWithWallet.uniqueId, accountWithWallet.walletAddress)
      var spy = sinon.spy(slackAdapter.getLogger().CommandEvents, "onBalanceRequest")
      const returned = await slackAdapter.receiveBalanceRequest(balanceCommand)
      assert(spy.withArgs(balanceCommand, true).calledOnce)
    })

    it(`should return the user's wallet address & account balance if they are registered`, async () => {
      let balanceCommand = new Command.Balance(accountWithWallet.adapter, accountWithWallet.uniqueId, accountWithWallet.walletAddress)
      const returned = await slackAdapter.receiveBalanceRequest(balanceCommand)
      assert.equal(returned, `Your wallet address is: \`${accountWithWallet.walletAddress}\`\nYour balance is: \'${accountWithWallet.balance}\'`)
    })
  })

  describe('receive Info Request', () => {
    it('should return the GitHub page info and a standin for the stellar bot`s address if they are not registered', async () => {
      process.env.GITHUB_URL = 'testurl'
      let infoCommand = new Command.Info(accountWithoutWallet.adapter, accountWithoutWallet.uniqueId)
      var spy = sinon.spy(slackAdapter.getLogger().CommandEvents, "onInfoRequest")
      const returned = await slackAdapter.receiveInfoRequest(infoCommand)
      assert(spy.withArgs(infoCommand, false).calledOnce)
      assert.equal(returned, `Deposit address: Register a valid wallet address to show the tipping bot's Deposit Address\nGitHub homepage: ${process.env.GITHUB_URL}`)
    })

    it(`should return the bot's wallet address and the GitHub url info if they are registered`, async () => {
      process.env.GITHUB_URL = 'testurl'
      process.env.STELLAR_PUBLIC_KEY = 'testpubkey'
      let infoCommand = new Command.Info(accountWithWallet.adapter, accountWithWallet.uniqueId)
      var spy = sinon.spy(slackAdapter.getLogger().CommandEvents, "onInfoRequest")
      const returned = await slackAdapter.receiveInfoRequest(infoCommand)

      assert(spy.withArgs(infoCommand, true).calledOnce)
      assert.equal(returned, `Deposit address: \`${process.env.STELLAR_PUBLIC_KEY}\`\nGitHub homepage: ${process.env.GITHUB_URL}`)
    })
  })

  describe('on deposit', () => {
    it('should send a message to the receiver of a deposit when their deposit goes through', async () => {
      let amount = 5.0
      await slackAdapter.onDeposit(accountWithWallet, amount)
      assert(await slackAdapter.getBotClientForUniqueId(accountWithWallet.uniqueId).sendPlainTextDMToSlackUser.calledWith(Utils.slackUserIdFromUniqueId(accountWithWallet.uniqueId), `You made a deposit of ${Utils.formatNumber(amount)} XLM`));
    })

    it('should log a deposit when their deposit goes through', async () => {
      let amount = 5.0
      var spy = sinon.spy(slackAdapter.getLogger().CommandEvents, "onDepositSuccess")
      await slackAdapter.onDeposit(accountWithWallet, amount)
      assert(spy.withArgs(accountWithWallet, amount).calledOnce)
    })
  })
})
