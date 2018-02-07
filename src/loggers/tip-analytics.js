const AbstractLogger = require('./abstract-logger')
const MixPanel = require('mixpanel')
var mixpanel = process.env.MIXPANEL_TOKEN ? MixPanel.init(process.env.MIXPANEL_TOKEN, {
  protocol: 'https'
}) : null;

class TipAnalytics extends AbstractLogger {

  constructor() {
    super()
    this.CommandEvents = {

      getCommandAnalyticsBase(command) {
        return {
          time: new Date(),
          sourceId: command.uniqueId,
          adapter: command.adapter,
          hash: command.hash
        }
      },

      getTipAnalyticsBase(tip) {
        return Object.assign(this.getCommandAnalyticsBase(tip), {
          amount: tip.amount,
          targetId: tip.targetId
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
       * @param withdrawal {Withdraw}
       * @returns {(*|{time, sourceId, adapter, hash}) & {amount, targetId: *}}
       */
      getWithdrawalAnalyticsBase(withdrawal) {
        return Object.assign(this.getCommandAnalyticsBase(withdrawal), {
          amount: withdrawal.amount,
          address: withdrawal.address
        })
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

      onSuccessfulTip(tip, amount) {
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

      onWithdrawalBadlyFormedAddress(withdrawal) {
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

      },

      onInfoRequest(infoCmd, userIsRegistered) {

      },

      onAddedNonExistantAuthTokenForTeam(team) {

      },

      onAddedNewAuthTokenForTeam(team) {

      },

      onAddingOAuthForTeamFailed(team) {

      },
    }
  }

}

module.exports = new TipAnalytics()