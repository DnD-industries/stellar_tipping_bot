const AbstractLogger = require('./abstract-logger')
const MixPanel = require('mixpanel')
const Utils = require('../utils')
var mixpanel = process.env.MIXPANEL_TOKEN ? MixPanel.init(process.env.MIXPANEL_TOKEN, {
  protocol: 'https'
}) : null;

class TipAnalytics extends AbstractLogger {

  constructor() {
    super()
    this.CommandEvents = {

      /**
       *
       * @param command {Command}
       * @returns {Object}
       */
      getCommandAnalyticsBase(command) {
        return {
          time: new Date(),
          sourceId: command.uniqueId,
          adapter: command.adapter,
          hash: command.hash,
          type: command.type,
          teamId: Utils.slackTeamIdFromUniqueId(command.uniqueId)
        }
      },

      /**
       *
       * @param tip {Tip}
       * @returns {Object}
       */
      getTipAnalyticsBase(tip) {
        return Object.assign(this.getCommandAnalyticsBase(tip), {
          amount: tip.amount,
          targetId: tip.targetId
        })
      },

      /**
       *
       * @param withdrawal {Withdraw}
       * @returns {Object}
       */
      getWithdrawalAnalyticsBase(withdrawal) {
        return Object.assign(this.getCommandAnalyticsBase(withdrawal), {
          amount: withdrawal.amount,
          address: withdrawal.address
        })
      },

      /**
       *
       * @param balance {Register}
       * @returns {Object}
       */
      getBalanceAnalyticsBase(balance) {
        return Object.assign(this.getCommandAnalyticsBase(balance), {
          address: balance.walletPublicKey,
        })
      },

      /**
       *
       * @param balance {Info}
       * @returns {Object}
       */
      getInfoAnalyticsBase(info) {
        return this.getCommandAnalyticsBase(info)
      },

      /**
       *
       * @param register {Register}
       * @returns {Object}
       */
      getRegistrationAnalyticsBase(register) {
        return Object.assign(this.getCommandAnalyticsBase(register), {
          walletAddress: register.walletPublicKey,
        })
      },

      getAccountAnalyticsBase(account) {
        return {
          time: new Date(),
          account_uniqueId: account.uniqueId,
          account_createdAt: account.createdAt,
          account_balance: account.balance,
          account_address: account.walletAddress
        }
      },

      /**
       *
       * @param command {Command}
       * @returns {Object}
       */
      getSlackOAuthAnalyticsBase(teamId) {
        return {
          time: new Date(),
          teamId: teamId
        }
      },

      /**
       *
       * @param tip {Tip}
       * @param amount
       */
      onTipWithInsufficientBalance(tip, balance) {
        let data = this.getTipAnalyticsBase(tip)
        data.balance = balance
        mixpanel.track('tip with insufficient balance', data)
      },

      onTipTransferFailed(tip) {
        let data = this.getTipAnalyticsBase(tip)
        mixpanel.track('tip transfer failed', data)
      },

      onUserAttemptedToTipThemself(tip) {
        let data = this.getTipAnalyticsBase(tip)
        mixpanel.track('user attempted to tip themself', data)
      },

      onTipNoTargetFound(tip) {
        let data = this.getTipAnalyticsBase(tip)
        mixpanel.track('tip no target found for id', data)
      },

      onTipSuccess(tip, amount) {
        let data = this.getTipAnalyticsBase(tip)
        mixpanel.track('tip success', data)
      },

      onWithdrawalNoAddressProvided(withdrawal) {
        let data = this.getWithdrawalAnalyticsBase(withdrawal)
        mixpanel.track('withdrawal no address provided', data)
      },

      onWithdrawalAttemptedToRobotTippingAddress(withdrawal) {
        let data = this.getWithdrawalAnalyticsBase(withdrawal)
        mixpanel.track(`withdrawal attempted with robot's tipping address`, data)
      },

      onWithdrawalDestinationAccountDoesNotExist(withdrawal) {
        let data = this.getWithdrawalAnalyticsBase(withdrawal)
        mixpanel.track('withdrawal destination account does not exist', data)
      },

      onWithdrawalInsufficientBalance(withdrawal, balance) {
        let data = this.getWithdrawalAnalyticsBase(withdrawal)
        mixpanel.track('withdrawal insufficient balance', data)
      },

      onWithdrawalBadlyFormedAddress(withdrawal, badWalletAddress) {
        let data = this.getWithdrawalAnalyticsBase(withdrawal)
        mixpanel.track('withdrawal no address provided', data)
      },

      onWithdrawalSubmissionToHorizonFailed(withdrawal) {
        let data = this.getWithdrawalAnalyticsBase(withdrawal)
        mixpanel.track('withdrawal submission to horizon failed', data)
      },

      onWithdrawalInvalidAmountProvided(withdrawal) {
        let data = this.getWithdrawalAnalyticsBase(withdrawal)
        mixpanel.track('withdrawal invalid amount', data)
      },

      onWithdrawalSuccess(withdrawal, address, txHash) {
        let data = this.getWithdrawalAnalyticsBase(withdrawal)
        data.address = address
        data.txHash = txHash
        mixpanel.track('withdrawal success', data)
      },

      onDepositSuccess(sourceAccount, amount) {
        let data = this.getAccountAnalyticsBase(sourceAccount)
        data.amount = amount
        mixpanel.track('deposit success', data)
      },

      onBalanceRequest(balanceCmd, userIsRegistered) {
        let data = this.getBalanceAnalyticsBase(balanceCmd)
        data.userIsRegistered = userIsRegistered
        mixpanel.track('balance request made', data)
      },

      onInfoRequest(infoCmd, userIsRegistered) {
        let data = this.getInfoAnalyticsBase(infoCmd)
        data.userIsRegistered = userIsRegistered
        mixpanel.track('info request made', data)
      },

      onOAuthAddMissingAuthTokenForTeam(team) {
        let data = this.getSlackOAuthAnalyticsBase(team)
        mixpanel.track('added missing oauth token for team', data)
      },

      onAddedNewAuthTokenForTeam(team) {
        let data = this.getSlackOAuthAnalyticsBase(team)
        mixpanel.track('added new oauth token for team', data)
      },

      onAddingOAuthForTeamFailed(team, exception) {
        let data = this.getSlackOAuthAnalyticsBase(team)
        data = Object.assign(data, exception)
        mixpanel.track('oauth add for team failed', data)
      },

      onRegisteredWithBadWallet(registration) {
        let data = this.getRegistrationAnalyticsBase(registration)
        mixpanel.track('registration with bad wallet', data)
      },

      onRegisteredWithCurrentWallet(registration) {
        let data = this.getRegistrationAnalyticsBase(registration)
        mixpanel.track('registration with current wallet', data)
      },

      onRegisteredWithWalletRegisteredToOtherUser(registration, otherUser) {
        let data = Object.assign(this.getRegistrationAnalyticsBase(registration), {
          otherUser_uniqueId: otherUser.uniqueId,
          otherUser_balance: otherUser.balance,
          otherUser_createdAt: otherUser.createdAt,
          otherUser_adapter: otherUser.adapter
        })
        mixpanel.track('registration with wallet registered to other user', data)
      },

      onRegisteredWithRobotsWalletAddress(registration) {
        let data = this.getRegistrationAnalyticsBase(registration)
        mixpanel.track(`registration with robots wallet address`, data)
      },

      onRegisteredSuccessfully(registration, isFirstRegistration) {
        let data = Object.assign(this.getRegistrationAnalyticsBase(registration), {
          isFirstRegistration: isFirstRegistration
        })
        mixpanel.track('registration success', data)
      }
    }
  }

}

module.exports = new TipAnalytics()