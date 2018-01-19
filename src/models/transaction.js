const orm = require('orm')
const Big = require('big.js')


module.exports = (db) => {

  /**
   * A stellar network transaction
   */
  const Transaction = db.define('transaction', {
      source: String,
      target: String,
      cursor: String,
      memoId: String,
      type: ['deposit', 'withdrawal'],
      createdAt: String,
      amount: String,
      asset: String,
      hash: String,
      credited: Boolean,
      refunded: Boolean
    }, {
    validations : {
      source : orm.enforce.required('source is required'),
      target : orm.enforce.required('target is required'),
      type : orm.enforce.required('type is required'),
      amount : orm.enforce.required('amount is required'),
      createdAt: orm.enforce.required('createdAt is required'),
      hash: [orm.enforce.unique('Hash already exists.'), orm.enforce.required()]
    },
    hooks: {
      beforeSave: function () {
        if (!this.credited) {
          this.credited = false;
        }
        if (!this.refunded) {
          this.refunded = false;
        }
      },
      afterSave: async function (success) {
        if (success && !this.credited && this.type === 'deposit') {
          const Account = db.models.account;
          const accountParts = [];
          let adapter, uniqueId; //Javascript has no block scope so we could also declare these as consts in the below conditional. Doing instead this for readability.
          if (this.memoId) {
            accountParts = this.memoId.replace(/\s/g, '').split('/');
            if (accountParts.length === 2) {
              adapter = accountParts[0];
              uniqueId = accountParts[1];
            }
          }

          //***If the CLOSE_DEPOSIT env variable is activated, refund all deposits***
          if(process.env.CLOSE_DEPOSITS){
            Transaction.events.emit('REFUND', this, amount);
            return;
          }

          //If this is from reddit, then use the memo parameters to parse the deposit
          if(adapter === "reddit"){
            const userWithUniqueId = await Account.getOrCreate(adapter, uniqueId);
            //If we found our user with the given adapter and uniqueId, credit the deposit.
            //If we haven't found our user, we'll try again below using the public wallet id.
            if (userWithUniqueId) {
              await Transaction.creditDepositToAccount(this, userWithUniqueId);
              return; //Return, as we found our account
            }
          } 

          const userWithWalletId = await Account.userForWalletAddress(this.source);
          //If there is no user registered with this public wallet address we need to refund the deposit.
          if(!userWithWalletId){
            Transaction.events.emit('REFUND', this, amount);
          } else {
            //We found a user with the public wallet address.
            //Credit the deposit to the appropriate account.
            await Transaction.creditDepositToAccount(this, userWithWalletId);
          }
        }
      }
    },
  })

  Transaction.creditDepositToAccount = async function (transaction, user) {
    try {
      return await user.deposit(transaction);
    } catch (exc) {
      if (exc !== 'DUPLICATE_DEPOSIT') {
        throw exc;
      }
    }
  }

  Transaction.latest = function () {
    return new Promise((resolve, reject) => {
      this.find({type: 'deposit'}).order('-createdAt').run((err, results) => {
        if (err) {
          reject(err)
        }
        resolve(results[0])
      })
    })
  }

  return Transaction
}