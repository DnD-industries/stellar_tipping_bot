const StellarSdk = require('stellar-sdk');
const EventEmitter = require('events');

module.exports = async function (models) {
  const server = new StellarSdk.Server(process.env.STELLAR_HORIZON);
  const keyPair = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SECRET_KEY);
  const publicKey = keyPair.publicKey();
  const callBuilder = server.payments().forAccount(publicKey);
  const Transaction = models.transaction;
  const Account = models.account;
  const events = new EventEmitter();
  let accountSequenceNumber = 0;

  console.log("publickey:", publicKey);
  process.env.STELLAR_PUBLIC_KEY = publicKey; //set the public key associated with our private key, for use elsewhere

  if (process.env.MODE === 'production') {
    StellarSdk.Network.usePublicNetwork();
  } else {
    StellarSdk.Network.useTestNetwork();
  }

  //Retrieve the latest transaction involving our public key from the db
  latestTx = await Transaction.latest();
  //If we found a transaction in our db, use the latest, otherwise use the paging token defined in .env
  const startingCursor = latestTx ? latestTx.cursor : process.env.STELLAR_CURSOR_PAGING_TOKEN;
  console.log("Starting stream from Horizon from paging token:", startingCursor);
  callBuilder.cursor(startingCursor);
  
  callBuilder.stream({
    onmessage: (record) => {
      record.transaction()
        .then(async function(txn) {
          // If this isn't a payment to the account address, skip
          if (record.to != publicKey) {
            return;
          }
          if (record.asset_type != 'native') {
             // If you are a XLM exchange and the customer sends
             // you a non-native asset, some options for handling it are
             // 1. Trade the asset to native and credit that amount
             // 2. Send it back to the customer
             // 3. If the tx comes from a known address, add it to the balance for that account 

             // We haven't implemented that yet! fairx.io to come!
             console.log('Trying to send non-XLM credit.');
             events.emit('NOT_NATIVE_ASSET_RECEIVED', record);
             return;
          }
          try {
            const txInstance = await Transaction.createAsync({
              memoId: txn.memo,
              amount: record.amount,
              createdAt: new Date(record.created_at),
              asset: record.asset_type,
              cursor: record.paging_token,
              source: record.from,
              target: record.to,
              hash: record.transaction_hash,
              type: 'deposit'
            });

            //console.log(`Incoming txOriginal: `,JSON.stringify(txn))
            console.log(`INCOMING_TRANSACTION: `, JSON.stringify(record, null, 2));
            //console.log(`Incoming txInstance:`, JSON.stringify(txInstance))
            events.emit('INCOMING_TRANSACTION', txInstance);
          } catch (exc) {
            console.log('Unable to commit transaction.');
            console.log(exc);
            events.emit('UNABLE_TO_COMMIT_TRANSACTION', exc);
          }
        })
        .catch(function(exc) {
          console.log('Unable to process a record.');
          console.log(exc);
          events.emit('UNABLE_TO_PROCESS_RECORD', exc);
        });
    }
  })

  return {
    address: publicKey,
    events: events,

    //If the wallet is not in our db, we need to refund the payment (minus tx fee) with a memo
    //Step one: determine if wallet is not in our db
    //Step two: refund the paymen with memo using Stellar SDK

    /**
     * Build a transaction into the network.
     *
     * to should be a public address
     * amount can be a string or a Big
     * hash should just be something unique - we use the msg id from reddit,
     * but a uuid4 or sth like that would work as well.
     */
    createTransaction: function (to, amount, hash, memo = "") {
      let data = {to, amount, hash};
      return new Promise(function (resolve, reject) {
        // Do not deposit to self, it wouldn't make sense
        if (to === publicKey) {
          data = 'TRANSACTION_REFERENCE_ERROR';
          return reject(data);
        }

        // First, check to make sure that the destination account exists.
        // You could skip this, but if the account does not exist, you will be charged
        // the transaction fee when the transaction fails.
        server.loadAccount(to)
          // If the account is not found, surface a nicer error message for logging.
          .catch(StellarSdk.NotFoundError, function (error) {
            data = 'DESTINATION_ACCOUNT_DOES_NOT_EXIST';
            return reject(data);
          })
          // If there was no error, load up-to-date information on your account.
          .then(function() {
            return server.loadAccount(publicKey);
          })
          .then(async function(sourceAccount) {
            // Start building the transaction.
            console.log("Source account sequence:", sourceAccount.sequenceNumber());
            while (sourceAccount.sequenceNumber() <= accountSequenceNumber) {
              console.log("Sequence number already used, incrementing...");
              sourceAccount.incrementSequenceNumber();
              console.log("New source account sequence:", sourceAccount.sequenceNumber());
            }
            accountSequenceNumber = sourceAccount.sequenceNumber();
            var transaction = new StellarSdk.TransactionBuilder(sourceAccount)
              .addOperation(StellarSdk.Operation.payment({
                destination: to,
                // Because Stellar allows transaction in many currencies, you must
                // specify the asset type. The special "native" asset represents Lumens.
                asset: StellarSdk.Asset.native(),
                amount: amount
              }))
              // A memo allows you to add your own metadata to a transaction. It's
              // optional and does not affect how Stellar treats the transaction.
              // We substring here to limit memo strings to the allowed 28-byte maximum.
              .addMemo(StellarSdk.Memo.text(memo.length ? memo.substring(0,27) : "XLM Tipping Bot"))
              .build();
            // Sign the transaction to prove you are actually the person sending it.
            transaction.sign(keyPair);

            resolve(transaction);
          })
      })
    },

    /**
     * Send a transaction into the horizon network
     */
    send: async function (tx) {
      return new Promise(async (resolve, reject) => {
        try {
          const transactionResult = await server.submitTransaction(tx);
          console.log("Transaction Success:", JSON.stringify(transactionResult, null, 2));
          return resolve("Success");
        } catch (exc) {
          console.log("Transaction Failure:", JSON.stringify(exc, null, 2));
          return reject("Failure");
        }
      })
    }
  }
}