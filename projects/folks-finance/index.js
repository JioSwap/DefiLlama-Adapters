const { toUSDTBalances } = require("../helper/balances");
const { getAppGlobalState } = require("../helper/algorand");

const {  pools,} = require("./constants");
const { getPrices } = require("./prices");

let pricesCache, borrowedCache

async function getCachedPrices() {
  if (!pricesCache) pricesCache = getPrices()
  return pricesCache
}

async function getTotalPoolDepositsUsd(prices) {
  const promises = pools.map(async (pool) => {
    const state = await getAppGlobalState(pool.appId);
    const totalDeposits = state.total_deposits
    const numericDeposits = isNaN(Number(totalDeposits))
      ? 0
      : Number(totalDeposits);
    const depositAmountUsd = numericDeposits * prices[pool.assetId];

    return depositAmountUsd;
  });

  const depositsAmountUsd = await Promise.all(promises);
  const totalDepositsUsd = depositsAmountUsd.reduce((a, b) => a + b, 0);

  return totalDepositsUsd;
}

/* Get total deposits */
async function tvl() {
  const prices = await getCachedPrices();

  const [
    depositsAmountUsd,
    borrowsAmountUsd,
  ] = await Promise.all([
    getTotalPoolDepositsUsd(prices),
    borrowed(),
  ]);

  return toUSDTBalances(
    depositsAmountUsd - borrowsAmountUsd
  );
}

/* Get total borrows */
async function borrowed() {
  if (!borrowedCache) borrowedCache = _borrowed()
  return borrowedCache

  async function _borrowed() {
    const prices = await getCachedPrices();

    const promises = pools.map(async (pool) => {
      const state = await getAppGlobalState(pool.appId);
      const borrowAmount = state.total_borrows
      const numericBorrowAmount = isNaN(Number(borrowAmount))
        ? 0
        : Number(borrowAmount);
      const borrowAmountUsd = numericBorrowAmount * prices[pool.assetId];

      return borrowAmountUsd; 
    });

    const borrowsAmountUsd = await Promise.all(promises);
    const totalBorrowsUsd = borrowsAmountUsd.reduce((a, b) => a + b, 0);
    return totalBorrowsUsd;
  }
}

async function borrowedBalances() {
  return toUSDTBalances(await borrowed());
}

module.exports = {
  timetravel: false,
  misrepresentedTokens: true,
  algorand: {
    tvl,
    borrowed: borrowedBalances,
  },
};
