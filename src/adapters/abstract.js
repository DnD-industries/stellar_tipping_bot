const utils = require('../utils')
const Big = require('big.js')
const StellarSdk = require('stellar-sdk')
const EventEmitter = require('events')
const Promise = require('../../node_modules/bluebird')
const Logger = require('../loggers/abstract-logger')

class Adapter extends EventEmitter {

  constructor (config) {
    super();

    this.config = config;

    this.Account      = config.models.account;
    this.Transaction  = config.models.transaction;

    this.Account.events.on('DEPOSIT', (sourceAccount, amount) => {
      if (this.name === sourceAccount.adapter) {
        this.onDeposit(sourceAccount, amount.toFixed(7));

        //TODO: notify user of received deposit
      }
    });

    this.Transaction.events.on('REFUND', (transaction) => {
      this.onRefund(transaction);
    });
  }

  getLogger() {
    return new Logger();
  }

  // *** +++ Deposit Hook Functions +

  /**
   *
   * @param sourceAccount The uniqueId of the account which made the deposit
   * @param amount The amount in XLM of the deposit
   * @returns {Promise<void>}
   */
  async onDeposit (sourceAccount, amount) {
    // Override this or listen to events!
    this.emit('deposit', sourceAccount, amount);
  }

  async onRefund (transaction) {
    // Override this or listen to events!
    this.emit('refund', transaction);
    try {
      const refundTx = await transaction.refund(this.config.stellar, transaction);
      console.log("Refund Succeeded");
    } catch (exc) {
      console.log("Refund Failed");
    }
  }

  /**
   *
   * @param potentialTip {Tip} The Command.Tip object created from the tip request
   * @param amount The tip amount fixed to 7 decimal places
   * @returns {Promise<void>}
   */
  async onTipWithInsufficientBalance (potentialTip, amount) {
    // Override this or listen to events!
    this.emit('tipWithInsufficientBalance', potentialTip, amount);
  }

  /**
   *
   * @param potentialTip {Tip} The Command.Tip object created from the tip request
   * @param amount The tip amount fixed to 7 decimal places
   * @returns {Promise<void>}
   */
  async onTipTransferFailed (potentialTip, amount) {
    // Override this or listen to events!
    this.emit('tipTransferFailed', potentialTip, amount);
  }

  /**
   *
   * @param potentialTip {Tip} The Command.Tip object created from the tip request
   * @param amount The tip amount fixed to 7 decimal places
   * @returns {Promise<void>}
   */
  async onTipReferenceError (potentialTip, amount) {
    // Override this or listen to events!
    this.emit('tipReferenceError', potentialTip, amount);
  }

  /**
   *
   * @param potentialTip {Tip} The Command.Tip object created from the tip request
   * @param amount The tip amount fixed to 7 decimal places
   * @returns {Promise<void>}
   */
  async onTip (potentialTip, amount) {
    // Override this or listen to events!
    this.emit('tip', potentialTip, amount);
  }

  // *** +++ Withdrawael Hook Functions +
  /**
   * Gets called when there is a problem submitting the transaction to the Horizon server with the Stellar SDK.
   *
   * @param withdrawal {Withdraw}
   * @returns {Promise<void>}
   */
  async onWithdrawalReferenceError (withdrawal) {
    // Override this or listen to events!
    this.emit('withdrawalReferenceError', withdrawal.uniqueId, withdrawal.address, withdrawal.amount, withdrawal.hash);
  }

  /**
   *
   * Called when the public key address you're trying to withdraw to doesn't exist
   *
   * @param withdrawal {Withdraw}
   * @returns {Promise<void>}
   */
  async onWithdrawalDestinationAccountDoesNotExist (withdrawal) {
    // Override this or listen to events!
    this.emit('withdrawalDestinationAccountDoesNotExist', withdrawal.uniqueId, withdrawal.address, withdrawal.amount, withdrawal.hash);
  }

  /**
   *
   * Called when you try to withdraw with no address
   *
   * @param withdrawal {Withdraw}
   * @returns {Promise<void>}
   */
  async onWithdrawalNoAddressProvided (withdrawal) {
    // Override this or listen to events!
      this.emit('withdrawalNoAddressProvided', withdrawal.uniqueId, withdrawal.address, withdrawal.amount, withdrawal.hash);
  }

  /**
   *
   * Called when you try to make a withdraw with an invalid amount, such as "asdf"
   *
   * @param withdrawal {Withdraw}
   * @returns {Promise<void>}
   */
  async onWithdrawalInvalidAmountProvided (withdrawal) {
    // Override this or listen to events!
    this.emit('withdrawalInvalidAmountProvided', withdrawal.uniqueId, withdrawal.address, withdrawal.amount, withdrawal.hash);
  }

  /**
   *
   * Called when the user does not have a high enough balance to complete their withdrawal.
   * Balance is not part of the Command.Withdraw object's params. It is acquired via the Account class.
   *
   * @param withdrawal {Withdraw}
   * @param balance {Number}
   * @returns {Promise<void>}
   */
  async onWithdrawalFailedWithInsufficientBalance (withdrawal, balance) {
    // Override this or listen to events!
    this.emit('withdrawalFailedWithInsufficientBalance', withdrawal.amount, balance);
  }

  /**
   * Called when, for any reason, we attempt to withdraw but sending the transaction to the Horizon server fails.
   * @param withdrawal {Withdraw}
   * @returns {Promise<void>}
   */
  async onWithdrawalSubmissionFailed (withdrawal) {
    // Override this or listen to events!
    this.emit('withdrawalSubmissionFailed', withdrawal.uniqueId, withdrawal.address, withdrawal.amount, withdrawal.hash);
  }

  /**
   *
   * Called when you try to withdraw with any invalid address (should only occur when the address is provided as an additional argument / is not retreived directly from the Account db).
   *
   * @param withdrawal {Withdraw}
   * @returns {Promise<void>}
   */
  async onWithdrawalInvalidAddress (withdrawal) {
    // Override this or listen to events!
   this.emit('withdrawalInvalidAddress', withdrawal.uniqueId, withdrawal.address, withdrawal.amount, withdrawal.hash);
  }

  /**
   * Called on a successfull withdrawal
   * @param withdrawal {Withdraw}
   * @param address {String} The address to which the withdrawal was made. Included here because the Withdraw command is not responsible for obtaining the wallet of the given user at the time it is created.
   * @returns {Promise<void>}
   */
  async onWithdrawal (withdrawal, address, txHash) {
    // Override this or listen to events!
    this.emit('withdrawal', withdrawal.uniqueId, address, withdrawal.amount, withdrawal.hash);
  }

  // *** +++ Registration related functions +
  /**
   * Called when the user tries to register with an invalid wallet address.
   *
   * @param walletAddressGiven
   * @returns {Promise<string>}
   */
  async onRegistrationBadWallet (walletAddressGiven) {
    return `${walletAddressGiven} is not a valid Public Key / wallet address`;
  }

  /**
   * Called when the user successfully registers and replaces their old wallet with a new wallet.
   *
   * @param oldWallet {String} The old wallet which has now been replaced
   * @param newWallet {String} The new wallet address of the user
   * @returns {Promise<string>}
   */
  async onRegistrationReplacedOldWallet(oldWallet, newWallet) {
    return `Your old wallet \`${oldWallet}\` has been replaced by \`${newWallet}\``;
  }

  /**
   * Called when the user tries to register with the wallet they are already registered with.
   *
   * @param walletAddress {String} The wallet address the user was trying to replace with the same value
   * @returns {Promise<string>}
   */
  async onRegistrationSameAsExistingWallet(walletAddress) {
    return `You are already using the public key \`${walletAddress}\``;
  }

  /**
   * Called when the user tries to register a wallet address which another user has already registered.
   *
   * @param walletAddress {String} The wallet address which the user was trying to replace.
   * @returns {Promise<string>}
   */
  async onRegistrationOtherUserHasRegisteredWallet(walletAddress) {
    // TODO: Factor contact info out into env vars or something
    return `Another user has already registered the wallet address \`${walletAddress}\`. If you think this is a mistake, please contact @dlohnes on Slack.`;
  }

  /**
   * Called when the user registers a wallet for the first time i.e. they did not previously have a wallet address.
   *
   * @param walletAddress {String} The wallet address the user has registered.
   * @returns {Promise<string>}
   */
  async onRegistrationRegisteredFirstWallet(walletAddress) {
    return `Successfully registered with wallet address \`${walletAddress}\`.\n\nSend XLM deposits to \`${process.env.STELLAR_PUBLIC_KEY}\` to make funds available for use with the '/tip' command.`;
  }

  /**
   * Will transfer the tip provided if possible, otherwise will call the appropriate function on the adapter
   * in the event that there is an insufficient balance or other issue.
   * @param tip {Tip}
   * @returns {Promise<void>}
   */
  async receivePotentialTip (tip) {
      // Let's see if the source has a sufficient balance
      const source = await this.Account.getOrCreate(tip.adapter, tip.sourceId);
      const payment = new Big(tip.amount);
      const hash = tip.hash;

      if (!source.canPay(payment)) {
        this.getLogger().CommandEvents.onTipWithInsufficientBalance(tip, source.balance)
        return this.onTipWithInsufficientBalance(tip, payment.toFixed(7));
      }

      console.log(`sourceID: ${tip.sourceId}\ntargetID: ${tip.targetId}`)
      if (tip.sourceId === tip.targetId) {
        this.getLogger().CommandEvents.onUserAttemptedToTipThemself(tip)
        return this.onTipReferenceError(tip, payment.toFixed(7));
      }

      const target = await this.Account.getOrCreate(tip.adapter, tip.targetId);

      // ... and tip.
    try {
        await source.transfer(target, payment, hash);
        return this.onTip(tip, payment.toFixed(7));
    } catch (exc) {
        if (exc !== 'DUPLICATE_TRANSFER') {
          // TODO: Get this under test
          this.getLogger().CommandEvents.onTipTransferFailed(tip)
          this.onTipTransferFailed(tip, payment.toFixed(7));
        }
    }
  }

  /**
   * Returns the balance for the requested adapter / uniqueId combination.
   *
   * A fresh account with an initial balance of zero is created if it does not exist.
   */
  requestBalance (adapter, uniqueId) {
    return new Promise(async (resolve, reject) => {
      const target = await this.Account.getOrCreate(adapter, uniqueId);
      resolve(target.balance);
    })
  }

  /**
   * Will cause the bot to send the requested amount of XLM to the withdrawer's provided wallet address if possible,
   * otherwise will call the appropriate function on the adapter in the event that there is an insufficient balance or other issue.
   *
   * @param withdrawalRequest {Withdraw}
   * @returns {Promise<void>}
   */
  async receiveWithdrawalRequest (withdrawalRequest) {
    const adapter = withdrawalRequest.adapter;
    const uniqueId = withdrawalRequest.uniqueId;
    const hash = withdrawalRequest.hash;
    const address = withdrawalRequest.address || await this.Account.walletAddressForUser(adapter, uniqueId);
    const amountRequested = withdrawalRequest.amount;
    console.log(`Original withdrawal request amount is ${amountRequested}`)
    let withdrawalAmount;
    try {
      withdrawalAmount = new Big(amountRequested);
    } catch (e) {
      console.log(`Bad data fed to new Big() in Adapter::receiveWithdrawalRequest()\n${JSON.stringify(e)}`);
      console.log(`Withdrawal request amount is ${amountRequested}`);
      this.getLogger().CommandEvents.onWithdrawalInvalidAmountProvided(withdrawalRequest)
      return this.onWithdrawalInvalidAmountProvided(withdrawalRequest);
    }
    const fixedAmount = withdrawalAmount.toFixed(7);

    if(typeof address === 'undefined' || address === null) {
      this.getLogger().CommandEvents.onWithdrawalNoAddressProvided(withdrawalRequest)
        return this.onWithdrawalNoAddressProvided(withdrawalRequest);
    }


    if (!StellarSdk.StrKey.isValidEd25519PublicKey(address)) {
      this.getLogger().CommandEvents.onWithdrawalBadlyFormedAddress(withdrawalRequest, address)
      return this.onWithdrawalInvalidAddress(withdrawalRequest);
    }

    // Fetch the account
    const target = await withdrawalRequest.getSourceAccount();
    // TODO: Rather than having this fetch occur here, I think it might make more sense to move this to the  Command constructor
    if (!target.canPay(withdrawalAmount)) {
      this.getLogger().CommandEvents.onWithdrawalInsufficientBalance(withdrawalRequest, target.balance)
      return this.onWithdrawalFailedWithInsufficientBalance(withdrawalRequest, target.balance);
    }

    // Withdraw
    try {
      // txHash is the hash from the stellar blockchain, not our internal hash
      const txHash = await target.withdraw(this.config.stellar, address, withdrawalAmount, hash);
      this.getLogger().CommandEvents.onWithdrawalSuccess(withdrawalRequest, address, txHash)
      return this.onWithdrawal(withdrawalRequest, address, txHash);
    } catch (exc) {
      if (exc === 'DESTINATION_ACCOUNT_DOES_NOT_EXIST') {
        this.getLogger().CommandEvents.onWithdrawalDestinationAccountDoesNotExist(withdrawalRequest)
        return this.onWithdrawalDestinationAccountDoesNotExist(uniqueId, address, fixedAmount, hash);
      }
      if (exc === 'TRANSACTION_REFERENCE_ERROR') {
        this.getLogger().CommandEvents.onWithdrawalAttemptedToRobotTippingAddress(withdrawalRequest)
        return this.onWithdrawalReferenceError(uniqueId, address, fixedAmount, hash);
      }
      if (exc === 'WITHDRAWAL_SUBMISSION_FAILED') {
        this.getLogger().CommandEvents.onWithdrawalSubmissionToHorizonFailed(withdrawalRequest)
        return this.onWithdrawalSubmissionFailed(uniqueId, address, fixedAmount, hash);
      }
      // throw (exc)
    }
  }

  /**
   *
   * @param cmd {Balance}
   * @returns {Promise<void>}
   */
  async receiveBalanceRequest (cmd) {
    this.emit('receiveBalanceRequest', cmd);
  }

  /**
   * * Validates the options provided and gives back an object wher the key is the request option
   * and the value is the value which will be set on an account.
   *
   * Feel free to do any validation you like. Just be sure to handle errors / rejections to your liking.
   *
   * Technically 'options' can look like anything you want, but right now we only support changing wallet address.
   *
   *  * {
   *     walletAddress: 'GDTWLOWE34LFHN4Z3LCF2EGAMWK6IHVAFO65YYRX5TMTER4MHUJIWQKB',
   * }
   *
   * @param options
   * @returns {{walletAddress: string|string|string|*|null|string}}
   */
    setAccountOptions(options) {
      let walletAddr = options.walletAddress;
      if(!StellarSdk.StrKey.isValidEd25519PublicKey(walletAddr)) {
        throw new Error("setAccountOptions was given a bad public key");
      }
      // We could just return `options` here, but in the interest
      // of future proofing / illustrating what we're more likely to do later as
      // options are added...
      return {walletAddress : walletAddr};
  }
}

module.exports = Adapter