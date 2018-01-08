# Stellar Tipping bot

The stellar tip bot is there to thank people for help, be friendly, buy someone a coffee and spread the word about the amazing stellar network.

## Setup

Check out the repo and install dependencies:

```
npm install
```

Fire up a postgres container and create two databases:

```
docker run -itd --name db -p 5455:5432 postgres:latest
docker exec -ti db sh -c 'su postgres -c "createdb stellar"'
docker exec -ti db sh -c 'su postgres -c "createdb stellar_testing"'
```

Create an `.env` file:

```
MODE=development

PG_USER=postgres
PG_HOST=localhost
PG_PORT=5455
PG_NAME=stellar
PG_PASSWORD=

STELLAR_HORIZON=https://horizon-testnet.stellar.org
STELLAR_SECRET_KEY=YOUR_SECRET_KEY_HERE

REDDIT_CLIENT_ID=YOUR_REDDIT_APP_CLIENT_ID
REDDIT_CLIENT_SECRET=YOUR_REDDIT_APP_SECRET
REDDIT_USER=YOUR_STELLAR_BOT
REDDIT_PASS=YOUR_STELLAR_BOT_PASSWORD
```

Create an `.env.test`:

```
MODE=testing

PG_USER=postgres
PG_HOST=localhost
PG_PORT=5455
PG_NAME=stellar_testing
PG_PASSWORD=
```

## Get it going

Run the tests:

```
npm run test
```

Run the app:

```
npm run app
```

## Contribute

We are always looking for contributors. A nice way to contribute is [creating more adapters](https://github.com/shredding/stellar-bot/wiki/How-To:-Create-an-adapter) on top of the bot.

## Donate

If you want to support the development of the bot, please send XLM to:

`GC2BDQ6BCDCIYLPHFGZKO4DJ3L3LQ4KTG3IZYF4M4UDBC3V2CZBZH3TU`

Thank you very much!

Enjoy.

