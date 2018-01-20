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
      credited: Boolean
    }, {
    validations : {
      source : orm.enforce.required('source is required'),
      target : orm.enforce.required('target is required'),
      type : orm.enforce.required('type is required'),
      amount : orm.enforce.required('amount is required'),
      createdAt: orm.enforce.required('createdAt is required'),
      hash: [orm.enforce.unique('Hash already exists.'), orm.enforce.required()]
    },
    methods: {
      // /**
      //  * Refund money from the main account to the source public account of the transaction
      //  *
      //  * You can get the stellar object from the adapter config.
      //  *
      //  * to should be a public address
      //  * withdrawalAmount can be a string or a Big
      //  * hash should just be something unique - we use the msg id from reddit,
      //  * but a uuid4 or sth like that would work as well.
      //  */
      // refund: async function (stellar, to, withdrawalAmount, hash) {
      //   const Transaction = db.models.transaction
      //   const Action = db.models.action

      //   return await Account.withinTransaction(async () => {
      //     if (!this.canPay(withdrawalAmount)) {
      //       throw new Error('Insufficient balance. Always check with `canPay` before withdrawing money!')
      //     }
      //     const sourceBalance = new Big(this.balance)
      //     const amount = new Big(withdrawalAmount)
      //     this.balance = sourceBalance.minus(amount).toFixed(7)
      //     const refundBalance = new Big(this.balance)

      //     const now = new Date()
      //     const doc = {
      //       memoId: 'XLM Tipping bot',
      //       amount: amount.toFixed(7),
      //       createdAt: now.toISOString(),
      //       asset: 'native',
      //       source: stellar.address,
      //       target: to,
      //       hash: hash,
      //       type: 'withdrawal'
      //     }
      //     const txExists = await Transaction.existsAsync({
      //       hash: hash,
      //       type: 'withdrawal',
      //       target: to
      //     })

      //     if (txExists) {
      //       // Withdrawal already happened within a concurrent transaction, let's skip
      //       this.balance = refundBalance.plus(amount).toFixed(7)
      //       throw 'DUPLICATE_WITHDRAWAL'
      //     }

      //     try {
      //       const tx = await stellar.createTransaction(to, withdrawalAmount.toFixed(7), hash)
      //       await stellar.send(tx)
      //     } catch (exc) {
      //       this.balance = refundBalance.plus(amount).toFixed(7)
      //       throw exc
      //     }

      //     await this.saveAsync()
      //     await Transaction.createAsync(doc)
      //     await Action.createAsync({
      //       hash: hash,
      //       type: 'withdrawal',
      //       sourceaccount_id: this.id,
      //       amount: amount.toFixed(7),
      //       address: to
      //     })
      //   })
      //}
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
          const Account = db.models.account

          //***If the CLOSE_DEPOSIT env variable is activated, refund ALL new deposits***
          if(process.env.CLOSE_DEPOSITS.toLowerCase() === "true"){
            console.log("DEPOSITS CLOSED, refunding transaction:", JSON.stringify(this));
            Transaction.events.emit('REFUND', this, this.amount);
            return;
          }

          //Check for the presence of a memo in this transaction
          if (this.memoId) {
            const accountParts = this.memoId.replace(/\s/g, '').split('/')
            if (accountParts.length === 2) {
              const adapter = accountParts[0]
              const uniqueId = accountParts[1]

              //If this transaction/memo is from reddit, then use the memo parameters to parse the deposit
              if(adapter === "reddit"){
                const userWithUniqueId = await Account.getOrCreate(adapter, uniqueId);
                //If we found our user with the given adapter and uniqueId, credit the deposit.
                //If we haven't found our user, we'll try again below using the public wallet id.
                if (userWithUniqueId) {
                  Transaction.creditDepositToAccount(this, userWithUniqueId);
                  return; //Return, as we found our account
                }
              } else {
                console.error("Unrecognized transaction memo: '" + this.memoId + "'. Searching by public wallet address...")
              }
            }
          }

          const userWithWalletId = await Account.userForWalletAddress(this.source);
          if(userWithWalletId){
            //We found a user with the public wallet address.
            //Credit the deposit to the appropriate account.
            console.log("found user:",JSON.stringify(userWithWalletId));
            console.log("crediting deposit from address:",this.source);
            Transaction.creditDepositToAccount(this, userWithWalletId);
          } else {
            //If there is no user registered with this public wallet address we need to refund the deposit.
            console.error("Unrecognized source wallet address in deposit transaction, issuing a refund.")
            Transaction.events.emit('REFUND', this, this.amount);
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
        if (err || !results) {
          console.log("reject latest:", err);
          reject(err);
        }
        console.log("resolve latest");
        resolve(results[0]);
      })
    })
  }

  return Transaction
}