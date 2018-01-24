const orm = require('orm')
const Big = require('big.js')
const utils = require('../utils')
const md5 = require('md5');

module.exports = (db) => {

  /**
   * A stellar network transaction
   */
  const Transaction = db.define('transaction', {
      source: String,
      target: String,
      cursor: String,
      memoId: String,
      type: ['deposit', 'withdrawal', 'refund'],
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
    methods: {
      /**
       * Refund money from the main account to the source public account of the transaction
       *
       * You get the stellar object from the adapter config.
       *
       * @param stellar The stellar object to send the refund with
       * @param transaction The transaction to be refunded
       * @returns {Promise<void>}
       */
      refund: async function (stellar, transaction) {
        const Transaction = db.models.transaction;
        const Action      = db.models.action;
        const Account     = db.models.account;

        return await Transaction.withinTransaction(async () => {
          const memo = 'Tipping bot refund: ' + this.hash.substring(0,6);
          const amount = new Big(transaction.amount) - 0.00001; //TODO: Grab the tx fee dynamically from Horizon
          const now = new Date();
          const tempHash = md5(transaction.source + amount + now);
          console.log("tempHash:", tempHash);
          //TODO: Validate that the tx we're refunding in fact does not have an associated account it can be credited to
          //accountsExists = await Account.oneAsync({ adapter, uniqueId })

          const refundTransaction = {
            memoId: memo,
            amount: amount.toFixed(7),
            createdAt: now.toISOString(),
            asset: 'native',
            source: stellar.address,
            target: transaction.source,
            hash: tempHash,
            type: 'refund'
          };

          const txExists = await Transaction.existsAsync({
            hash: tempHash
          });

          if (txExists) {
            // Tx already happened within a concurrent transaction, let's skip
            throw 'DUPLICATE_REFUND';
          }

          try {
            const tx = await stellar.createTransaction(transaction.source, amount.toFixed(7), tempHash, memo);
            const sentTransaction = await stellar.send(tx);
            refundTransaction.hash = sentTransaction.hash; //assign the tx id from the stellar network
          } catch (exc) {
            throw exc;
          }


          this.credited = false;
          this.refunded = true;
          await this.saveAsync();
          await Transaction.createAsync(refundTransaction);
          await Action.createAsync({
            hash: refundTransaction.hash,
            sourceaccount_id: this.id,
            type: 'refund',
            amount: amount.toFixed(7),
            address: transaction.source
          });
        })
      }
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
        if (success && !this.credited && !this.refunded && this.type === 'deposit') {
          console.log("afterSave: ", JSON.stringify(this));
          const Account = db.models.account;

          //***If the CLOSE_DEPOSIT env variable is activated, refund ALL new deposits***
          if(process.env.CLOSE_DEPOSITS.toLowerCase() === "true"){
            console.log("DEPOSITS CLOSED, refunding transaction:", JSON.stringify(this));
            Transaction.events.emit('REFUND', this);
            return;
          }

          //Check for the presence of a memo in this transaction
          if (this.memoId) {
            const accountParts = this.memoId.replace(/\s/g, '').split('/')
            if (accountParts.length === 2) {
              const adapter = accountParts[0];
              const uniqueId = accountParts[1];

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
                console.error("Unrecognized transaction memo: '" + this.memoId + "'. Searching by public wallet address...");
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
            console.error("Unrecognized source wallet address in deposit transaction, issuing a refund.");
            Transaction.events.emit('REFUND', this);
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