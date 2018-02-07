const Command = require('../adapters/commands/command')
const EventEmitter = require('events');

class Logger {

  constructor() {


    this.CommandEvents = {

      events: new EventEmitter(),

      onTipWithInsufficientBalance(tip, balance) {
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

module.exports = Logger