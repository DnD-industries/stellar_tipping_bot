const assert = require('assert')
const sinon = require('sinon')


describe('models / account', async () => {

  let Account
  let Transaction
  let Action
  let account
  let accountWithWallet

  beforeEach(async () => {
    const config = await require('./setup')()
    Account = config.models.account
    Transaction = config.models.transaction
    Action = config.models.action

    account = await Account.createAsync({
      adapter: 'reddit',
      uniqueId: 'foo',
      balance: '1.0000000'
    })

    accountWithWallet = await Account.createAsync({
      adapter: 'reddit',
      uniqueId: 'goodwall',
      balance: '1.0000000',
      walletAddress: 'GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN'
    })
  })

  describe('deposit', () => {
    it ('should deposit on the account and create action', async () => {
      const tx = await Transaction.createAsync({
            memoId: 'reddit/foo',
            amount: '5.0000000',
            createdAt: new Date('2018-01-01'),
            asset: 'native',
            cursor: 'token',
            source: 'source',
            target: 'target',
            hash: 'hash',
            type: 'deposit'
      })
      await account.deposit(tx)

      const reloaded = await Account.getOrCreate('reddit', 'foo')
      const action = await Action.oneAsync({hash: 'hash', type: 'deposit', sourceaccount_id: reloaded.id})

      assert.equal(reloaded.balance, '6.0000000')
      assert.equal(action.amount, '5.0000000')
    })

    it ('should not deposit on the account if action exists', (done) => {
      Transaction.createAsync({
            memoId: 'reddit/foo',
            amount: '1.0000000',
            createdAt: new Date('2018-01-01'),
            asset: 'native',
            cursor: 'token',
            source: 'source',
            target: 'target',
            hash: 'hash',
            type: 'deposit'
      }).then((tx) => {
        Account.events.on('DEPOSIT', async () => {
          const exists = await Action.existsAsync({
            hash: 'hash',
            sourceaccount_id: account.id,
            type: 'deposit'
          })
          assert.ok(exists)

          let assertExc;

          try {
            await account.deposit(tx)
          } catch (exc) {
            assertedExc = exc
          }

          assert.equal(assertedExc, 'DUPLICATE_DEPOSIT')
          const reloaded = await Account.getOrCreate('reddit', 'foo')
          // 1 + the initial transaction, but not three when we deposit again
          assert.equal(reloaded.balance, '2.0000000')
          done()
        })
      })
    })
  })

  describe('getOrCreate', () => {
    it ('should only create a new account if it does not already exist', async () => {
      const sameAccount = await Account.getOrCreate('reddit', 'foo')
      assert.equal(account._id, sameAccount._id)

      const otherAccount = await Account.getOrCreate('reddit', 'bar', {
        balance: '5.0000000'
      })
      assert.equal(otherAccount.adapter, 'reddit')
      assert.equal(otherAccount.uniqueId, 'bar')
      assert.equal(otherAccount.balance, '5.0000000')
    })
    
  })

  describe('canPay', () => {
    it ('should return true if balance is gte', () => {
      assert.ok(account.canPay('1'))
      assert.ok(account.canPay('0.65'))
    })

    it ('should return false if balance is lte', () => {
      assert.ok(!account.canPay('2'))
    })
  })

  describe('setWalletAddress', () => {
    it ('should set the wallet address if it is a valid stellar wallet address', async() => {
      const desiredWalletAddress = "GDTWLOWE34LFHN4Z3LCF2EGAMWK6IHVAFO65YYRX5TMTER4MHUJIWQKB"
      await account.setWalletAddress(desiredWalletAddress)
      account = await Account.getOrCreate(account.adapter, account.uniqueId)
      assert.equal(account.walletAddress, desiredWalletAddress, "Public wallet address should now be set to desired wallet address")
    })

    it ('should throw an error if you provide an invalid wallet address', (done) => {
      const desiredWalletAddress = "badaddress"

      account.setWalletAddress(desiredWalletAddress).catch (e => {
        done()
      })
    })
  })

  describe('walletAddressForUser', () => {
    it ('should return the user`s wallet if the user with the given uniqueId for the given adapter has a wallet address set', async () => {
      const usersWallet = await Account.walletAddressForUser('reddit', 'goodwall')
      assert.equal(usersWallet, `GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN`, "User should have a wallet address")
    })

    it ('should return null if the given user does not have a wallet address set', async () => {
      const usersWallet = await Account.walletAddressForUser('reddit', 'foo')
      assert.equal(usersWallet, null, "User should not have a wallet address")
    })
  })

  describe('userForWalletAddress', () => {
    it ('should return a user if someone has registered with that wallet', async () => {
      const user = await Account.userForWalletAddress(accountWithWallet.walletAddress)
      assert.equal(user.uniqueId, accountWithWallet.uniqueId)
    })

    it ('should return null if no user is registered for that wallet', async () => {
      const user = await Account.userForWalletAddress("somedifferentunvalidatedwalletaddress")
      assert.equal(user, null)
    })
  })
})
