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

      /**
       *
       * @param tip {Tip}
       * @param amount
       */
      onTipWithInsufficientBalance(tip, balance) {
        mixpanel.track('tip with insufficient balance', {
          command: this.getCommandAnalyticsBase(tip),
          amount: tip.amount,
          targetId: tip.targetId,
          balance: balance
        })

      },

      onTipTransferFailed(tip, amount) {

      },

      onUserAttemptedToTipThemself(tip, amount) {

      },

      onTipNoTargetFound(tip) {

      },

      onSuccessfulTip(tip, amount) {

      },

      onWithdrawalNoAddressProvided(withdrawal) {

      },

      onWithdrawalAttemptedToRobotTippingAddress(withdrawal) {

      },

      onWithdrawalDestinationAccountDoesNotExist(withdrawal) {

      },

      onWithdrawalInsufficientBalance(withdrawal, balance) {

      },

      onWithdrawalBadlyFormedAddress(withdrawal) {

      },

      onWithdrawalSubmissionToHorizonFailed(withdrawal) {

      },

      onWithdrawalInvalidAmountProvided(withdrawal) {

      },

      onWithdrawalSuccess(withdrawal, address, txHash) {

      },

      onDepositSuccess(sourceAccount, amount) {

      },

      onBalanceRequest(balanceCmd) {

      },

      onInfoRequest(infoCmd) {

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