const Adapter     = require('../abstract');
const slackClient = require('./slack-client');
const StellarSdk = require('stellar-sdk')
const Utils       = require('../../utils')
const oauth_token = process.env.SLACK_BOT_OAUTH_TOKEN;
const Command     = require('../commands/command')

/**
 * The Slack adapter itself is actually what is responsible for generating
 * messages during particular events (such as when a user withdraws XLM, or doesn't have a high enough balance).
 */
class Slack extends Adapter {

  async onTipWithInsufficientBalance (tip, amount) {
    const account = await this.Account.getOrCreate(tip.adapter, tip.sourceId);
    return `Sorry, your tip could not be processed. Your account only contains \`${Utils.formatNumber(account.balance)} XLM\` but you tried to send \`${Utils.formatNumber(amount)} XLM\``
  }

  // TODO: Put this under test.
  /**
   * Called when our attempt at placing the tip transaction through Horizon fails for some reason.
   * Could be a non-responsive server, or any number of reasons.
   * @param tip
   * @param amount
   * @returns {Promise<string>}
   */
  async onTipTransferFailed(tip, amount) {
    return "There was an error while trying to send your tip. Please try again."
  }

  /**
   * Called when the user attempts to tip themself.
   * // TODO: Should probably come up with a less generic sounding name than this.
   *
   * @param tip {Tip}
   * @param amount The amount which the user tried to tip
   * @returns {Promise<string>}
   */
  async onTipReferenceError (tip, amount) {
    return `What is the sound of one tipper tipping?`
  }

  /**
   * Called when the tip goes through successfully.
   * For the Slack Adapter, a DM will get sent to the tip recipient whose content depends on whether or not they are already registered.
   * Text is also returned so that the Slack Server can respond with an appropriate message.
   *
   * @param tip {Tip}
   * @param amount {float}
   * @returns {Promise<string>}
   */
  async onTip (tip, amount) {
    const account = await this.Account.getOrCreate(tip.adapter, tip.targetId)
    // const client = slackClient.clientForCommand(tip);
    if(!account.walletAddress) {
      this.client.sendPlainTextDMToSlackUser(tip.targetId,
          `Someone tipped you \`${Utils.formatNumber(amount)} XLM\`\n\nIn order to withdraw your funds, first register your public key by typing /register [your public key]\n\nYou can also tip other users using the /tip command.`)
    } else {
      this.client.sendPlainTextDMToSlackUser(tip.targetId,
          `Someone tipped you \`${Utils.formatNumber(amount)} XLM\``);
    }
    return `You successfully tipped \`${Utils.formatNumber(amount)} XLM\``
  }

  /**
   *
   * @param withdrawal {Withdraw}
   * @returns {Promise<string>}
   */
  // TODO: Refactor {Withdraw}
  async onWithdrawalNoAddressProvided (withdrawal) {
    return "You must register a wallet address before making a withdrawal, or provide a wallet address as an additional argument"
  }


  /**
   * Gets called if ever a withdraw command is sent which provides the Tip Bot's own wallet address
   *
   * @param withdrawal {Withdraw}
   * @returns {Promise<void>}
   */
  async onWithdrawalReferenceError (withdrawal) {
    return `You're not allowed to send money through this interface to the tipping bot. If you'd like to tip the creators, check our repository on GitHub.`;
  }

  /**
   * Called when the Stellar SDK determines that the destination for a withdrawal doesn't yet actually exist.
   * Note that this is distinct from onWithdrawalInvalidAddress. You can have a valid address that doesn't exist.
   * @param withdrawal {Withdraw}
   * @returns {Promise<void>}
   */
  async onWithdrawalDestinationAccountDoesNotExist (withdrawal) {
    return `I could not complete your request. The address you tried to withdraw from does not exist.`;
  }

  /**
   * Called when the user submits a withdrawal but doesn't have enough XLM in balance to cover the amount.
   *
   * @param amountRequested The user's amount requested to withdraw in XLM
   * @param balance The user's current balance in XLM
   * @returns {Promise<string>}
   */
  async onWithdrawalFailedWithInsufficientBalance (amountRequested, balance) {
    return `You requested to withdraw \`${Utils.formatNumber(amountRequested)} XLM\` but your wallet only contains \`${Utils.formatNumber(balance)} XLM\``;
  }

  /**
   * Called when the user attempts to withdraw to an invalid address. Should only occur when supplying
   * a secondary wallet address, which is to say validation should prevent users from registering
   * an invalid address (though they may be able to register a non-existant address).
   *
   * @param withdrawal {Withdraw}
   * @returns {Promise<string>}
   */
  async onWithdrawalInvalidAddress (withdrawal) {
    return `\`${withdrawal.address}\` is not a valid public key. Please try again with a valid public key.`
  }

  /**
   * Gets called when there is a problem submitting the transaction to the Horizon server with the Stellar SDK.
   *
   * @param withdrawal {Withdraw}
   * @returns {Promise<void>}
   * // TODO: Implement this
   */
  async onWithdrawalSubmissionFailed (withdrawal) {
    this.emit('withdrawalSubmissionFailed ', withdrawal.uniqueId, withdrawal.address, withdrawal.amount, withdrawal.hash)
  }

  /**
   * Called when the user provides an invalid withdrawal amount, such as a string containing letters.
   *
   * @param withdrawal {Withdraw}
   * @returns {Promise<string>}
   */
  async onWithdrawalInvalidAmountProvided (withdrawal) {
    return `\`${withdrawal.amount}\` is not a valid withdrawal amount. Please try again.`
  }

  /**
   * Called when a user successfully withdraws any amount of XLM.
   *
   * @param withdrawal {Withdraw}
   * @param address {String}
   * @returns {Promise<string>}
   */
  async onWithdrawal (withdrawal, address, txHash) {
    return `You withdrew \`${withdrawal.amount} XLM\` to your wallet at \`${address}\`\n\nYour transaction hash is \`${txHash}\`\nYou can validate the transaction at: ${process.env.STELLAR_TX_VIEWER_URL_BASE}/${txHash}`;
  }

  /**
   * Routes a command depending on its class to the appropriate function
   *
   * @param command {Command}
   */
  handleCommand(command) {
    console.log(`Handling command: ${JSON.stringify(command)}`)
    if(!command) {
      return;
    }
    if(command instanceof Command.Register) {
      return this.handleRegistrationRequest(command);
    } else if (command instanceof Command.Balance) {
      return this.receiveBalanceRequest(command);
    } else if (command instanceof Command.Tip) {
      return this.receivePotentialTip(command);
    } else if (command instanceof Command.Withdraw) {
      return this.receiveWithdrawalRequest(command);
    } else if (command instanceof Command.Info) {
      return this.receiveInfoRequest(command);
    }
  }

  /**
   * handleRegistrationRequest(command)
   *
   * @param command a Registration command object
   */
  async handleRegistrationRequest(command) {
    if (!(command.walletPublicKey && StellarSdk.StrKey.isValidEd25519PublicKey(command.walletPublicKey))) {
      return this.onRegistrationBadWallet(command.walletPublicKey)
    }

    if(command.walletPublicKey == process.env.STELLAR_PUBLIC_KEY) {
      return `That is my address. You must register with your own address.`;
    }

    // If the user is already registered, send them a message back explaining (and what their Wallet Address is)
    const usersExistingWallet = await this.Account.walletAddressForUser(command.adapter, command.sourceId)

    // If it's the same wallet, just send a message back
    if(usersExistingWallet && usersExistingWallet == command.walletPublicKey) {
      return this.onRegistrationSameAsExistingWallet(usersExistingWallet)
    }

    // Check to see if a user already exists with that wallet
    const userWithWalletId = await this.Account.userForWalletAddress(command.walletPublicKey)
    if(userWithWalletId) {
      return this.onRegistrationOtherUserHasRegisteredWallet(command.walletPublicKey)
    }

    // In both remaining cases, we save the new wallet
    const account = await this.Account.getOrCreate(command.adapter, command.sourceId)
    await account.setWalletAddress(command.walletPublicKey)

    // If we replaced an old wallet, send the appropriate message
    if (usersExistingWallet) {
      return this.onRegistrationReplacedOldWallet(usersExistingWallet, command.walletPublicKey)
    } else {
      // Otherwise, we've simply saved the user's first wallet
      return this.onRegistrationRegisteredFirstWallet(command.walletPublicKey)
    }
  }

  /**
   *
   * @param sourceAccount The uniqueId of the account which made the deposit
   * @param amount The amount in XLM of the deposit
   * @returns String
   */
  async onDeposit (sourceAccount, amount) {
    this.client.sendPlainTextDMToSlackUser(Utils.slackUserIdFromUniqueId(sourceAccount.uniqueId),
        `You made a deposit of ${Utils.formatNumber(amount)} XLM`);
  }

  /**
   *
   * @param cmd {Balance}
   * @returns String
   */
  async receiveBalanceRequest (cmd) {
    console.log("in Receive balance request");
    const account = await this.Account.getOrCreate(cmd.adapter, cmd.sourceId)
    if(!account.walletAddress) {
      return `Your wallet address is: \`Use the /register command to register your wallet address\`\nYour balance is: \'${account.balance}\'`
    } else {
      return `Your wallet address is: \`${account.walletAddress}\`\nYour balance is: \'${account.balance}\'`
    }
  }

  /**
   *
   * @param cmd {Info}
   * @returns String
   */
  async receiveInfoRequest (cmd) {
    const account = await this.Account.getOrCreate(cmd.adapter, cmd.sourceId)
    if(!account.walletAddress) {
      return `Deposit address: Register a valid wallet address to show the tipping bot's Deposit Address\nGitHub homepage: ${process.env.GITHUB_URL}`
    } else {
      return `Deposit address: \`${process.env.STELLAR_PUBLIC_KEY}\`\nGitHub homepage: ${process.env.GITHUB_URL}`
    }
  }

  async receiveNewAuthTokensForTeam (team, authToken, botToken) {
    try {
      if (!authToken.length || !botToken.length) {
        throw `Missing OAuth token for your team. Adding Starry to Slack failed. Please try again.`;
      }
      const newAuth = await this.slackAuth.getOrCreate(team, authToken, botToken);
      return `Adding Starry to Slack succeeded. Open Slack to start tipping!`;
    } catch (exc) {
      throw exc;
    }
  }

  constructor (config) {
    super(config);
    this.name = 'slack';
    this.client = new slackClient(oauth_token);
    this.slackAuth = config.models.slackAuth;
  }

}

module.exports = Slack;