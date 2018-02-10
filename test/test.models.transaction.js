const assert = require('assert')
const utils = require('../src/utils')

describe('models / transaction', async () => {

  let Transaction;
  let Account;

  beforeEach(async () => {
    const config = await require('./setup')()
    Transaction = config.models.transaction
    Account = config.models.account
  });

  describe('deposit', () => {
    it ('should credit deposits from known public wallet addresses to associated accounts', async () => {
      await Account.createAsync({
        adapter: 'slack',
        uniqueId: 'foo',
        balance: '1.5000000',
        walletAddress: 'GAV3KFQ3NP5FFPBOMUACINRWSK2GPJUEUOIWO5R7GZSZVB5SCEHLLC7N'
      });

      //'slack/foo' will not be recognized as a valid memo id string.
      //The deposit should clear regardless.
      await Transaction.createAsync({
        memoId: 'slack/foo',
        amount: '5.0000000',
        createdAt: new Date('2018-01-01'),
        asset: 'native',
        cursor: 'token',
        source: 'GAV3KFQ3NP5FFPBOMUACINRWSK2GPJUEUOIWO5R7GZSZVB5SCEHLLC7N',
        target: 'target',
        hash: 'hash',
        type: 'deposit'
      });

      await utils.sleep(100);

      const acc = await Account.oneAsync({ adapter: 'slack', uniqueId: 'foo'});
      assert.equal('6.5000000', acc.balance);

      const txn = await Transaction.oneAsync({ hash: 'hash' });
      assert.ok(txn.credited);
    });

    it ('should refund deposits from unknown public wallet addresses', (done) => {
      Transaction.events.on('REFUND',  () => done());

      Account.createAsync({
        adapter: 'testing',
        uniqueId: 'foo',
        balance: '1.5000000',
        walletAddress: 'GCDPCA3F2FP7HHOUDMVWPZJK6GLBGCCHX5EAIM3JNFZTW6CP2IOP3OQ4'
      });

      Transaction.createAsync({
        memoId: '',
        amount: '5.0000000',
        createdAt: new Date('2018-01-01'),
        asset: 'native',
        cursor: 'token',
        source: 'GC6ELROZMOANRK4E7RUCI2SKDY24EG2R6Z23F5AO3BIZDIKI5RMJAKI6',
        target: 'target',
        hash: 'hash',
        type: 'deposit'
      });
    });
  });




  describe('CLOSE_DEPOSITS flag', () => {
    it ('should not credit valid deposits when the CLOSE_DEPOSITS env variable is "true"', async () => {
      process.env.CLOSE_DEPOSITS = "true";
      await Account.createAsync({
        adapter: 'testing',
        uniqueId: 'foo',
        balance: '1.5000000',
        walletAddress: 'GBGK7N4MVOXOQR4B2BZYAJ2WLK5E4GQ5APCJEVQYDVSE6QSNSIBIE47E'
      });

      //This is an otherwise valid deposit tx
      await Transaction.createAsync({
            memoId: 'testing/foo',
            amount: '5.0000000',
            createdAt: new Date('2018-01-01'),
            asset: 'native',
            cursor: 'token',
            source: 'GBGK7N4MVOXOQR4B2BZYAJ2WLK5E4GQ5APCJEVQYDVSE6QSNSIBIE47E',
            target: 'target',
            hash: 'hash',
            type: 'deposit'
      });

      await utils.sleep(100);

      const acc = await Account.oneAsync({ adapter: 'testing', uniqueId: 'foo'});
      assert.equal('1.5000000', acc.balance);

      const txn = await Transaction.oneAsync({ hash: 'hash' });
      assert.ok(!txn.credited);
      process.env.CLOSE_DEPOSITS = "false";
    });
  });

  it ('should refund valid deposits when the CLOSE_DEPOSITS env variable is "true"', (done) => {
    process.env.CLOSE_DEPOSITS = "true";
    
    Transaction.events.on('REFUND',  () => {
      process.env.CLOSE_DEPOSITS = "false";
      done();
    });
    
    Account.createAsync({
      adapter: 'testing',
      uniqueId: 'foo',
      balance: '1.5000000',
      walletAddress: 'GC6ELROZMOANRK4E7RUCI2SKDY24EG2R6Z23F5AO3BIZDIKI5RMJAKI6'
    });

    //This is an otherwise valid deposit tx
    Transaction.createAsync({
          memoId: '',
          amount: '5.0000000',
          createdAt: new Date('2018-01-01'),
          asset: 'native',
          cursor: 'token',
          source: 'GC6ELROZMOANRK4E7RUCI2SKDY24EG2R6Z23F5AO3BIZDIKI5RMJAKI6',
          target: 'target',
          hash: 'hash',
          type: 'deposit'
    });
  });

  // describe('refund method', () => {
  //   it ('should not deposit transaction', async () => {      
  //     process.env.CLOSE_DEPOSITS = "true";
  //     await Account.createAsync({
  //       adapter: 'testing',
  //       uniqueId: 'foo',
  //       balance: '1.5000000',
  //       walletAddress: 'GBGK7N4MVOXOQR4B2BZYAJ2WLK5E4GQ5APCJEVQYDVSE6QSNSIBIE47E'
  //     });

  //     //'slack/foo' will not be recognized as a valid memo id string.
  //     //The deposit should clear regardless.
  //     await Transaction.createAsync({
  //           memoId: 'testing/foo',
  //           amount: '5.0000000',
  //           createdAt: new Date('2018-01-01'),
  //           asset: 'native',
  //           cursor: 'token',
  //           source: 'GBGK7N4MVOXOQR4B2BZYAJ2WLK5E4GQ5APCJEVQYDVSE6QSNSIBIE47E',
  //           target: 'target',
  //           hash: 'hash',
  //           type: 'deposit'
  //     });

  //     await utils.sleep(100);

  //     const acc = await Account.oneAsync({ adapter: 'testing', uniqueId: 'foo'});
  //     assert.equal('1.5000000', acc.balance);

  //     const txn = await Transaction.oneAsync({ hash: 'hash' });
  //     assert.ok(!txn.credited);
  //     assert.ok(txn.refunded, "Expected to fail until refunds are complete");
  //     process.env.CLOSE_DEPOSITS = "false";
  //   });
  // });

  describe('latest', () => {
    it ('should only get the last created transaction with latest()', async () => {
      await Transaction.createAsync({
            memoId: 'a',
            amount: '5.0000000',
            createdAt: new Date('2018-01-01'),
            asset: 'native',
            cursor: 'token',
            source: 'source',
            target: 'target',
            hash: 'hash',
            type: 'deposit'
      });
      await Transaction.createAsync({
            memoId: 'b',
            amount: '5.0000000',
            createdAt: new Date('2018-01-03'),
            asset: 'native',
            cursor: 'token',
            source: 'source',
            target: 'target',
            hash: 'hash2',
            type: 'deposit'
      });
      await Transaction.createAsync({
            memoId: 'c',
            amount: '5.0000000',
            createdAt: new Date('2018-01-02'),
            asset: 'native',
            cursor: 'token',
            source: 'source',
            target: 'target',
            hash: 'hash3',
            type: 'deposit'
      });

      const tx = await Transaction.latest();
      assert.equal(tx.memoId, 'b');

    });
  });
});
