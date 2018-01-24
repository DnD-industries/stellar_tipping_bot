const Adapter     = require('../abstract');
const slackClient = require('./slack-client');
const StellarSdk = require('stellar-sdk')
const Utils       = require('../../utils')
const oauth_token = process.env.SLACK_BOT_OAUTH_TOKEN;
const Command     = require('../commands/command')

// Constants
const _REG_FAIL_WALLET_VALIDATION = "The provided wallet address is invalid"
const _REG_FAIL_SAME_WALLET = "The user has already registered with this wallet"
const _REG_FAIL_WALLET_ALREADY_REGISTERED = "Another user has already registered with that wallet"

function formatMessage(txt) {
  return txt +
      '\n\n\n\n' + `*This bot is in BETA Phase. Everything runs on the testnet. Do not send real XLM!*` +
      '\n\n\n\n' +
      `[Deposit](https://www.reddit.com/user/stellar_bot/comments/7o2ex9/deposit/) | ` +
      `[Withdraw](https://np.reddit.com/message/compose/?to=${process.env.REDDIT_USER}&subject=Withdraw&message=Amount%20XLM%0Aaddress%20here) | ` +
      `[Balance](https://np.reddit.com/message/compose/?to=${process.env.REDDIT_USER}&subject=Balance&message=Tell%20me%20my%20XLM%20Balance!) | ` +
      `[Help](https://www.reddit.com/user/stellar_bot/comments/7o2gnd/help/) | ` +
      `[Donate](https://www.reddit.com/user/stellar_bot/comments/7o2ffl/donate/) | ` +
      `[About Stellar](https://www.stellar.org/)`
}


/**
 * The Slack adapter itself is actually what is responsible for generating
 * messages during particular events (such as when a user withdraws XLM, or doesn't have a high enough balance).
 */
class Slack extends Adapter {

  static get REG_FAIL_SAME_WALLET() {
    return _REG_FAIL_SAME_WALLET;
  }

  static get REG_FAIL_WALLET_VALIDATION() {
    return _REG_FAIL_WALLET_VALIDATION;
  }

  async onTipWithInsufficientBalance (tip, amount) {
    const account = await this.Account.getOrCreate(tip.adapter, tip.sourceId);
    return `Sorry, your tip could not be processed. Your account only contains \`${Utils.formatNumber(account.balance)} XLM\` but you tried to send \`${Utils.formatNumber(amount)} XLM\``
  }

  async onTipTransferFailed(tip, amount) {
    await callReddit('reply', formatMessage(`Sorry. I can not tip for you. Your balance is insufficient.`), tip.original)
  }

  async onTipReferenceError (tip, amount) {
    return `What is the sound of one tipper tipping?`
  }

  /**
   *
   * @param tip {Tip}
   * @param amount {float}
   * @returns {Promise<string>}
   */
  async onTip (tip, amount) {
    const account = await this.Account.getOrCreate(tip.adapter, tip.targetId)
    if(!account.walletAddress) {
      this.client.sendPlainTextDMToSlackUser(tip.targetId,
          `Someone tipped you \`${Utils.formatNumber(amount)} XLM\`\n\nIn order to withdraw your funds, first register your public key by typing /register [your public key]\n\nYou can also tip other users using the /tip command.`)
    } else {
      this.client.sendPlainTextDMToSlackUser(tip.targetId,
          `Someone tipped you \`${Utils.formatNumber(amount)} XLM\``);
    }
    return `You successfully tipped \`${Utils.formatNumber(amount)} XLM\``
  }

  async onWithdrawalNoAddressProvided (uniqueId, address, amount, hash) {
    return "You must register a wallet address before making a withdrawal, or provide a wallet address as an additional argument"
  }

  async onWithdrawalReferenceError (uniqueId, address, amount, hash) {
    // console.log(`XML withdrawal failed - unknown error for ${uniqueId}.`)
    // exeucte('composeMessage', {
    //   to: uniqueId,
    //   subject: 'XLM Withdrawal failed',
    //   text: formatMessage(`An unknown error occured. This shouldn't have happened. Please contact the bot.`)
    // })
  }

  async onWithdrawalDestinationAccountDoesNotExist (uniqueId, address, amount, hash) {
    // console.log(`XML withdrawal failed - no public address for ${uniqueId}.`)
    // await callReddit('composeMessage', {
    //   to: uniqueId,
    //   subject: 'XLM Withdrawal failed',
    //   text: formatMessage(`We could not withdraw. The requested public address does not exist.`)
    // })
  }

  async onWithdrawalFailedWithInsufficientBalance (amountRequested, balance) {
    return `You requested to withdraw \`${Utils.formatNumber(amountRequested)} XLM\` but your wallet only contains \`${Utils.formatNumber(balance)} XLM\``;
  }

  async onWithdrawalInvalidAddress (withdrawal) {
    return `\`${withdrawal.address}\` is not a valid public key. Please try again with a valid public key.`
  }

  async onWithdrawalSubmissionFailed (withdrawal) {
    this.emit('withdrawalSubmissionFailed ', withdrawal.uniqueId, withdrawal.address, withdrawal.amount, withdrawal.hash)
  }

  async onWithdrawalInvalidAmountProvided (withdrawal) {
    return `\`${withdrawal.amount}\` is not a valid withdrawal amount. Please try again.`
  }

  async onWithdrawal (withdrawal, address) {
    return `You withdrew \`${Utils.formatNumber(withdrawal.amount)} XLM\` to your wallet at \`${address}\``
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
   * @param cmd {Balance}
   * @returns {Promise<void>}
   */
  async receiveBalanceRequest (cmd) {
    const account = await this.Account.getOrCreate(cmd.adapter, cmd.sourceId)
    if(!account.walletAddress) {
      return `Your wallet address is: \`Use the /register command to register your wallet address\`\nYour balance is: \'${account.balance}\'`
    } else {
      return `Your wallet address is: \`${account.walletAddress}\`\nYour balance is: \'${account.balance}\'`
    }
  }


  constructor (config) {
    super(config);

    this.name = 'slack';
    this.client = new slackClient(oauth_token);
  }

  extractTipAmount (tipText) {
    const matches =  tipText.match(/\+\+\+([\d\.]*)[\s{1}]?XLM/i)
    if (matches) {
      return matches[1]
    }
    return undefined
  }
}

module.exports = Slack;