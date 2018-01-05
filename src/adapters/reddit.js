const Snoowrap = require('snoowrap')
const Snoostorm = require('snoostorm')
const Adapter = require('./abstractAdapter')
const utils = require('../utils')

function getR() {
  const r = new Snoowrap({
    userAgent: process.env.REDDIT_USER,
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    username: process.env.REDDIT_USER,
    password: process.env.REDDIT_PASS,
  })

  r.config({
    continueAfterRatelimitError: true,
    warnings: false,
    maxRetryAttempts: 10
  })

  return r
}

async function callReddit(func, data, client) {
  client = client || getR()

  try {
    if (data) {
      return await client[func](data)
    } else {
      return await client[func]()
    }
  } catch (exc) {
    console.log(exc.name + ` - Failed to execute ${func} with data:`, data)
  }
}

function removeDuplicates(orignal, listing, start) {
  return listing.filter(function(post) {
    return orignal.every(a => a.id != post.id) && post.created_utc >= start / 1000
  })
}

function formatMessage(txt) {
  return txt +
  '\n\n\n\n' + `*This bot is in BETA Phase. Everything runs on the testnet. Do not send real XLM!*` +
   '\n\n\n\n' +
    `[Deposit](https://www.reddit.com/user/stellar_bot/comments/7o2ex9/deposit/) | ` +
    `[Withdraw](https://np.reddit.com/message/compose/?to=${process.env.REDDIT_USER}&subject=Withdraw&message=Amount%20XLM%0Aaddress%20here) | ` +
    `[Balance](https://np.reddit.com/message/compose/?to=${process.env.REDDIT_USER}&subject=Balance&message=Tell%20me%20my%20XLM%20Balance!) | ` +
    `[Help](https://www.reddit.com/user/stellar_bot/comments/7o2gnd/help/) | ` +
    `[Donate](https://www.reddit.com/user/stellar_bot/comments/7o2ffl/donate/) | ` +
    `[About Stellar](https://www.stellar.org/)`
}

class Reddit extends Adapter {

  extractTipAmount (tipText) {
    const matches =  tipText.match(/\+\+\+([\d\.]*)[\s{1}]?XLM/i)
    if (matches) {
        return new Big(matches[1])
    }
    return undefined
  }

  extractWithdrawal (body) {
    const parts = body.slice(body.indexOf('<p>') + 3, body.indexOf('</p>')).split('\n')

    if (parts.length === 2) {
      const amount = parts[0].match(/([\d\.]*)/)[0]
      const address = StellarSdk.StrKey.isValidEd25519PublicKey(parts[1]) ? parts[1] : undefined

      if (amount && address) {
        return {
          amount: new Big(amount),
          address: address
        }
      }
      return undefined
    }
  }

  sendDepositConfirmation (sourceAccount, amount) {
    await callReddit('composeMessage', {
      to: sourceAccount.uniqueId,
      subject: 'XLM Deposit',
      text: formatMessage(`Thank you. ${amount} XLM have been sucessfully deposited to your account.`)
    })
  }

  constructor (config) {
    super(config)
    console.log('Start observing subreddits ...')
    this.pollComments()

    console.log('Start observing reddit private messages ...')
    this.pollMessages()
  }

  async pollComments (lastBatch) {
    lastBatch = lastBatch || []

    const start = Date.now()
    const comments = await callReddit('getNewComments', 'Stellar')

    if (comments === undefined) {
      return this.pollComments(lastBatch)
    }

    removeDuplicates(lastBatch, comments, start).forEach((comment) => {
      const potentialTip = {
        adapter: 'reddit',
        sourceId: comment.author.name,
        text: comment.body,
        resolveTargetId: async () => {
           const targetComment = await callReddit('getComment', comment.parent_id)

           if (!targetComment) {
             return undefined
           }
           return targetComment.author.name
        }
      }

      console.log(potentialTip)

      this.receivePotentialTip(potentialTip)
        // +++ A successful tip has been made
        .then(async (success) => {
          console.log(`Tip from ${potentialTip.sourceId} to ${success.targetId}.`)
          await callReddit('reply', formatMessage(`Thank you. You tipped **${success.amount} XLM** to *${success.targetId}*.`), comment)
        })
        // ++ The tip has been rejected
        .catch(async (status) => {
          switch (status) {
            case this.TIPP_STATUS_DO_NOTHING:
              break;

            case this.TIPP_STATUS_INSUFFICIENT_BALANCE:
              await callReddit('reply', formatMessage(`Sorry. I can not tip for you. Your balance is insufficient.`), comment)
              break;

            case this.TIPP_STATUS_TRANSFER_FAILED:
              await callReddit('reply', formatMessage(`I messed up, sorry. A developer will look into this. Your balance hasn't been touched.`), comment)
              break;

            case this.TIPP_STATUS_REFERENCE_ERROR:
              await callReddit('reply', formatMessage(`Don't tip yourself please.`), comment)

            default:
              await callReddit('reply', formatMessage(`An unknown error occured. This shouldn't have happened. Please contact the bot.`), comment)
              break;
          }
      })
    })

    lastBatch = comments
    await utils.sleep(2000)
    this.pollComments(lastBatch)
  }

  async pollMessages () {
    const messages = await callReddit('getUnreadMessages') || []
    let processedMessages = []

    await messages
      .filter(m => ['Withdraw', 'Balance'].indexOf(m.subject) > -1 && !m.was_comment)
      .forEach(async (m) => {
           // Check the balance of the user
        if (m.subject === 'Balance') {
          const balance = await this.requestBalance('reddit', m.author.name)
          await callReddit('composeMessage', {
            to: m.author.name,
            subject: 'XLM Balance',
            text: formatMessage(`Thank you. Your current balance is ${balance} XLM.`)
          })
          console.log(`Balance request answered for ${m.author.name}.`)
          await callReddit('markMessagesAsRead', [m])
        }

        if (m.subject === 'Withdraw') {
          const extract = utils.extractWithdrawal(m.body_html)

          if (!extract) {
            console.log(`XML withdrawal failed - unparsable message from ${m.author.name}.`)
            await callReddit('composeMessage', {
              to: m.author.name,
              subject: 'XLM Withdrawal failed',
              text: formatMessage(`We could not withdraw. Please make sure that the first line of the body is withdrawal amount and the second line your public key.`)
            })
            await callReddit('markMessagesAsRead', [m])
          } else {
            try {
              console.log(`XML withdrawal initiated for ${m.author.name}.`)
              await callReddit('markMessagesAsRead', [m])
              await this.receiveWithdrawalRequest('reddit', m.author.name, extract, m.id)
              await callReddit('composeMessage', {
                to: m.author.name,
                subject: 'XLM Withdrawal',
                text: formatMessage(`Thank's for your request. ${extract.amount.toFixed(7)} XLM are on their way to ${extract.address}.`)
              })
            } catch (exc) {
              switch (exc) {
                case this.WITHDRAWAL_STATUS_INSUFFICIENT_BALANCE:
                  console.log(`XML withdrawal failed - insufficient balance for ${m.author.name}.`)
                  await callReddit('composeMessage', {
                    to: m.author.name,
                    subject: 'XLM Withdrawal failed',
                    text: formatMessage(`We could not withdraw. You requested more than your current balance. Please adjust and try again.`)
                  })
                  break
                case this.WITHDRAWAL_STATUS_DESTINATION_ACCOUNT_DOES_NOT_EXIST:
                  console.log(`XML withdrawal failed - no public address for ${m.author.name}.`)
                  await callReddit('composeMessage', {
                    to: m.author.name,
                    subject: 'XLM Withdrawal failed',
                    text: formatMessage(`We could not withdraw. The requested public address does not exist.`)
                  })
                  break
                default:
                  console.log(`XML withdrawal failed - unknown error for ${m.author.name}.`)
                  exeucte('composeMessage', {
                    to: m.author.name,
                    subject: 'XLM Withdrawal failed',
                    text: formatMessage(`An unknown error occured. This shouldn't have happened. Please contact the bot.`)
                  })
                  break;
              }
            }
            await callReddit('markMessagesAsRead', [m])
          }
        }
    })

    await utils.sleep(2000)
    this.pollMessages()
  }

}

module.exports = Reddit