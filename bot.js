require('dotenv').config();
const { ethers, toBigInt, parseUnits, parseEther, formatEther, MaxUint256, Contract, Wallet, ZeroAddress, getAddress, formatUnits } = require('ethers');
const axios = require('axios');
const winston = require('winston');
const mongoose = require('mongoose');
const MevShareClient = require("@flashbots/mev-share-client")
const { Mutex } = require('async-mutex');
const abiDecoder = require('abi-decoder');

// Constants
const MONITORED_PAIRS = [
  [
    {
      coin: 'ETH', // WETH
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    {
      coin: 'AAVE',
      address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
    }
  ],
  [
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    {
      coin: 'DAI',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    }
  ],
  // Additional pairs
  [
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    {
      coin: 'USDC',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    }
  ],
  [
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    {
      coin: 'USDT',
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7'
    }
  ],
  [
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    {
      coin: 'UNI',
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
    }
  ],
  [
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    {
      coin: 'SUSHI',
      address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2'
    }
  ],
  [
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    {
      coin: 'LINK',
      address: '0x514910771AF9Ca656af840dff83E8264EcF986CA'
    }
  ],
  [
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    {
      coin: 'WBTC',
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
    }
  ],
  [
    {
      coin: 'USDC',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    },
    {
      coin: 'USDT',
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7'
    }
  ],
  [
    {
      coin: 'DAI',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    },
    {
      coin: 'USDC',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    }
  ],
  [
    {
      coin: 'MATIC',
      address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0'
    },
    {
      coin: 'USDC',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    }
  ],
  [
    {
      coin: 'COMP',
      address: '0xc00e94Cb662C3520282E6f5717214004A7f26888'
    },
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    }
  ],
  [
    {
      coin: 'YFI',
      address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e'
    },
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    }
  ],
  [
    {
      coin: 'SNX',
      address: '0xC011A72400E58ecD99Ee497CF89E3775d4bd732F'
    },
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    }
  ],
  [
    {
      coin: 'MKR',
      address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2'
    },
    {
      coin: 'ETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    }
  ]
];


const SLIPPAGE_TOLERANCE = {
  DAI: 0.0001,
  AAVE: 0.001,
  ETH: 0.001,
  USDC: 0.0005,
  USDT: 0.0005,
  UNI: 0.001,
  SUSHI: 0.001,
  LINK: 0.001,
  WBTC: 0.001,
  MATIC: 0.001,
  COMP: 0.001,
  YFI: 0.001,
  SNX: 0.001,
  MKR: 0.001
};

const ARBITRAGE_THRESHOLDS = {
  DAI: 0.001,
  AAVE: 0.001,
  ETH: 0.001,
  USDC: 0.001,
  USDT: 0.001,
  UNI: 0.001,
  SUSHI: 0.001,
  LINK: 0.001,
  WBTC: 0.001,
  MATIC: 0.001,
  COMP: 0.001,
  YFI: 0.001,
  SNX: 0.001,
  MKR: 0.001
};

const ERC20_ABI = [
  "function name() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const LARGE_TRADE_THRESHOLDS = { ETH: 2, AAVE: 0.3 };
// Router ABI for Uniswap/Sushiswap
const DEX_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountOutMin",
        "type": "uint256"
      },
      {
        "internalType": "address[]",
        "name": "path",
        "type": "address[]"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "swapExactETHForTokens",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "address[]",
        "name": "path",
        "type": "address[]"
      }
    ],
    "name": "getAmountsOut",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountOutMin",
        "type": "uint256"
      },
      {
        "internalType": "address[]",
        "name": "path",
        "type": "address[]"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "swapExactTokensForETH",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
abiDecoder.addABI(DEX_ABI);
const FACTORY_ABI = ['function getPair(address tokenA, address tokenB) external view returns (address pair)'];
const PAIR_ABI = ['function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'];
const BOT_STRATEGIES = ['ARBITRAGE', 'FRONT_RUNNING', 'BACK_RUNNING', 'SANDWICH'];

// DEX Configuration
const DEXs = {
  UNISWAP: {
    name: 'Uniswap',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    tradingFeePercentage: 0.3
  },
  SUSHISWAP: {
    name: 'Sushiswap',
    factoryAddress: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    routerAddress: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    tradingFeePercentage: 0.3
  }
};

// MongoDB Schemas
const tradeSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  strategy: String,
  coin: String,
  buy: String,
  sell: String,
  profit: String,
  gas: String,
  success: Boolean
});

const Trade = mongoose.model('Trade', tradeSchema);

// Utility Classes & functions
class AlertManager {
  static async sendAlert(payload) {
    if (!process.env.WEBHOOK_URL) return;
    try {
      await axios.post(process.env.WEBHOOK_URL, payload);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }
}

class CircuitBreaker {
  constructor(provider, gasPriceLimit = parseUnits('100', 'gwei'), maxFailures = 3, resetTimeMs = 300000) {
    this.failures = 0;
    this.lastFailure = 0;
    this.isOpen = false;
    this.maxFailures = maxFailures;
    this.resetTimeMs = resetTimeMs;
    this.provider = provider;
    this.gasPriceLimit = gasPriceLimit;
  }

  async executeWithBreaker(operation) {
    if (this.isOpen) {
      const timeSinceLastFailure = Date.now() - this.lastFailure;
      if (timeSinceLastFailure > this.resetTimeMs) {
        this.reset();
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const feeData = await this.provider.getFeeData();
      if (feeData.maxFeePerGas && feeData.maxFeePerGas > this.gasPriceLimit) {
        throw new Error('Gas price too high, skipping operation');
      }
      const result = await operation();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.maxFailures) {
        this.isOpen = true;
      }
      throw error;
    }
  }

  reset() {
    this.failures = 0;
    this.lastFailure = 0;
    this.isOpen = false;
  }
}

class StateManager {
  constructor() {
    this.state = {
      isRunning: false,
      currentStrategy: null,
      lastProfitableBlock: 0,
      totalProfit: BigInt(0),
      failedTransactions: 0,
      successfulTransactions: 0
    };
  }

  updateState(updates) {
    this.state = { ...this.state, ...updates };
  }

  getState() {
    return { ...this.state };
  }
}

class ProfitTracker {
  constructor() {
    this.trades = [];
    this.totalProfit = BigInt(0);
  }

  async recordTrade(trade, profitability) {
    const tradeRecord = {
      strategy: trade.strategy,
      coin: trade.coin,
      buy: trade.buy,
      sell: trade.sell,
      profit: profitability.metrics.netProfit.toString(),
      gas: profitability.metrics.gasCost.toString(),
      success: profitability.isProfit
    };
    this.trades.push(tradeRecord);
    this.totalProfit = this.totalProfit.add(profitability.metrics.netProfit);

    // Persist to MongoDB
    try {
      const newTrade = new Trade(tradeRecord);
      await newTrade.save();
    } catch (error) {
      console.error('Failed to save trade to database:', error);
    }
  }
}

function gasLimitConfig() {
  if (process.env.NODE_ENV === 'test') {
    return {
      gasLimit: BigInt(8000000),
      maxFeePerGas: parseUnits('1', 'gwei'),
      maxPriorityFeePerGas: parseUnits('1', 'gwei'),
    };
  }

  return {
    gasLimit: BigInt(parseInt(process.env.GAS_LIMIT || '200000')), // Adjust gas limit as needed
    maxFeePerGas: parseUnits(process.env.MAX_FEE_PER_GAS || '100', 'gwei'), // Adjust as needed
    maxPriorityFeePerGas: parseUnits(process.env.MAX_PRIORITY_FEE_PER_GAS || '2', 'gwei') // Adjust as needed
  }

}
function isMonitoredTx(tx) {
  // Decode the transaction data
  if (!tx) return undefined;
  const decodedData = abiDecoder.decodeMethod(tx.data);

  if (!decodedData) return undefined;

  // Extract the method name and parameters
  const methodName = decodedData.name;

  console.log('TX Method > ', decodedData.name);

  if (methodName.toLowerCase() !== 'swapexacttokensfortokens' && methodName.toLowerCase() !== 'swapexactethfortokens') return undefined// We only care about token swaps

  console.log(`Found  '${methodName}' method`);

  const params = decodedData.params;

  // Identify the tokens involved based on the method parameters
  let tokenAddresses = [];
  params.forEach(param => {
    if (param.name === 'path' || param.name === 'token') {
      tokenAddresses = tokenAddresses.concat(param.value);
    }
  });

  console.log('Token Addresses > ', tokenAddresses);

  tokenAddresses = [...new Set(tokenAddresses.map(addr => addr.toLowerCase()))];

  // Filter based on the monitored coin/token
  const pair = MONITORED_PAIRS.find(m => {
    const sortedM = m.map(c => c.coin.toLowerCase()).sort();
    const sortedT = tokenAddresses.sort();
    return sortedM[0] === sortedT[0] && sortedM[1] === sortedT[1]
  })

  return { pair, isBuy: !!pair && pair[0] === tokenAddresses[0] };

}



class MEVBot {
  constructor() {
    // Initialize MongoDB Connection
    mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then(() => {
      console.log('Connected to MongoDB');
    }).catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });

    if (process.env.NODE_ENV === 'test') {
      this.provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    } else {
      this.provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
      this.wallet = new ethers.Wallet(process.env.WALLET_PK, this.provider);
    }


    // this.flashbotsProvider = null;
    this.mevShareClient = null;

    this.mutex = new Mutex();
    this.circuitBreaker = new CircuitBreaker(this.provider, parseUnits(process.env.MAX_FEE_PER_GAS || '100', 'gwei'));
    this.stateManager = new StateManager();
    this.profitTracker = new ProfitTracker();

    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ]
    });

    this.logger.add(new winston.transports.Console({
      format: winston.format.simple()
    }));

    // if (process.env.NODE_ENV !== 'production') {

    // }


  }

  async initialize() {
    // Initialize rate limiter with concurrency of 5 and interval of 1 second
    const { default: PQueue } = await import('p-queue');
    this.queue = new PQueue({ concurrency: 5, interval: 1000 });
    if (process.env.NODE_ENV === 'test') {
      await this.provider.send("evm_setIntervalMining", [3000]); // Mine every 3 seconds
      console.log("Mining interval set to 3 seconds");
      // Use one of Hardhat's default accounts
      const hardhatAccounts = await this.provider.listAccounts();
      this.wallet = this.provider.getSigner(hardhatAccounts[0].address);
    } else {
      this.wallet = new ethers.Wallet(process.env.WALLET_PK, this.provider);
    }

    try {
      this.mevShareClient = MevShareClient.default.useEthereumMainnet(this.wallet);
      this.logger.info('MEV Bot initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MEV Bot:', error);
      throw error;
    }
  }

  async getBalance(tokenAddress) {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const [balance, decimals] = await Promise.all([tokenContract.balanceOf(this.wallet.address), tokenContract.decimals()]);
      return parseFloat(formatUnits(balance, decimals));
    } catch (error) {
      return 0
    }
  }

  async tokenNamesFromAddress(tokenAddresses) {
    const tokenNames = {};

    await Promise.all(tokenAddresses.map(async (tokenAddress) => {
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
        const tokenName = await tokenContract.name();
        tokenNames[tokenAddress] = tokenName;
      } catch (error) {
        this.logger.error(`Failed to get name for token at address ${tokenAddress}:`, error);
      }
    }));
    return tokenNames;
  }

  async run() {
    await this.initialize();
    this.stateManager.updateState({ isRunning: true });
    this.logger.info('MEV Bot is running');

    while (this.stateManager.getState().isRunning) {
      await this.circuitBreaker.executeWithBreaker(async () => {
        try {
          const strategy = BOT_STRATEGIES[Math.floor(Math.random() * BOT_STRATEGIES.length)];
          this.stateManager.updateState({ currentStrategy: strategy });
          this.logger.info(`Executing strategy: ${strategy}`);

          switch (strategy) {
            case 'ARBITRAGE':
              const opportunities = await this.findArbitrageOpportunities();
              if (opportunities.length > 0) {
                await this.executeArbitrage(opportunities);
              } else this.logger.info('No Arbitrage Opportunity Found!')
              break;
            case 'FRONT_RUNNING':
              await this.executeFrontRunning();
              break;
            case 'BACK_RUNNING':
              await this.executeBackRunning();
              break;
            case 'SANDWICH':
              await this.executeSandwich();
              break;
            default:
              this.logger.warn('Unknown strategy:', strategy);
          }
        } catch (error) {
          this.logger.error('Error in strategy execution:', error);
        }
      });

      // Wait for 1 second before next iteration
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Function to check and approve tokens
  async checkAndApproveToken(tokenAddress, routerAddress, amount) {
    const tokenContract = new ethers.Contract(tokenAddress, DEX_ABI, this.wallet);
    const allowance = await tokenContract.allowance(this.wallet.address, routerAddress);
    if (allowance > amount) {
      this.logger.info(`Approving ${routerAddress} to spend ${formatEther(amount)} of token ${tokenAddress}`);
      const tx = await tokenContract.approve(routerAddress, MaxUint256, gasLimitConfig());
      await tx.wait();
      this.logger.info(`Approval transaction confirmed: ${tx.hash}`);
    } else {
      this.logger.info(`Insufficient allowance for token ${tokenAddress} on router ${routerAddress}`);
    }
  }


  async calculateOptimalGas(tx) {
    const feeData = await this.provider.getFeeData();

    const maxFeePerGas = feeData.maxFeePerGas
      ? feeData.maxFeePerGas * 120n / 100 // 20% increase
      : parseUnits('100', 'gwei'); // Fallback

    const maxPriorityFeePerGas = parseUnits('2', 'gwei');
    const gasLimit = await this.provider.estimateGas(tx);

    return {
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasLimit
    };
  }

  async calculateProfitability(opportunity) {
    if (!this.validateArbitrageOpportunity(opportunity)) return { isProfit: false };

    const { gasCost, slippage, exchangeFees, potentialProfit, amountIn } = await this.estimateTradeMetrics(opportunity);
    if (amountIn) return { isProfit: false }
    const minProfitThreshold = ARBITRAGE_THRESHOLDS[opportunity.coin] || 0.1; // Allow dynamic adjustment

    const netProfit = potentialProfit - gasCost - exchangeFees;
    const profitRatio = !gasCost ? 0 : (netProfit * parseUnits('1', '18') / gasCost) / 1e18;

    return {
      isProfit: netProfit > parseEther(minProfitThreshold.toString()) && profitRatio > 1.5,
      metrics: { netProfit, profitRatio, gasCost, slippage, exchangeFees, amountIn }
    };
  }

  async calculateProfitabilityForOtherStrategies(opportunity) {
    const { tradeValue, slippage, exchangeFees } = opportunity;
    const gasCost = await this.estimateGasCost(opportunity);

    const netProfit = tradeValue - gasCost - exchangeFees;
    const profitRatio = !gasCost ? 0 : (netProfit * parseUnits('1', '18') / gasCost) / 1e18;

    return {
      isProfit: netProfit > 0 && profitRatio > 1.5, // Adjust thresholds as needed
      metrics: { netProfit, profitRatio, gasCost, slippage, exchangeFees }
    };
  }

  async calculateSlippage(path, amount, dex) {
    const reserves = await this.getPathReserves(path, dex);
    const impact = amount / reserves[0];
    const slippageTolerance = impact > 0.1 ? 2 : impact > 0.05 ? 1 : 0.5;
    return {
      slippageTolerance,
      minOutput: this.calculateMinOutput(amount, slippageTolerance, reserves),
    };
  }

  async getPathReserves(path, dex) {
    const pairAddress = await this.getPairAddress(dex.factoryAddress, path[0], path[1]);
    if (pairAddress === ZeroAddress) {
      throw new Error(`No pair found for ${path[0]} and ${path[1]} on ${dex.name}`);
    }
    const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
    const reserves = await pairContract.getReserves();
    return reserves;
  }

  calculateMinOutput(amount, slippageTolerance, reserves) {
    const expectedOutput = (amount * reserves.reserve1) / reserves.reserve0;
    return expectedOutput * (1 - slippageTolerance / 100);
  }

  async getPairAddress(factoryAddress, tokenA, tokenB) {
    const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, this.provider);
    return await factoryContract.getPair(tokenA, tokenB);
  }

  async findArbitrageOpportunities() {
    const opportunities = [];
    for (const pair of MONITORED_PAIRS) {
      const coin = pair[1].coin;
      const threshold = ARBITRAGE_THRESHOLDS[coin] || 0.1;
      const dexPrices = {};

      // Fetch prices in parallel
      await Promise.all(Object.keys(DEXs).map(async (dexKey) => {
        const dex = DEXs[dexKey];
        const price = await this.getPriceFromDEX(dex, pair[0], pair[1]);
        dexPrices[dexKey] = price;
      }));

      const dexNames = Object.keys(dexPrices);
      for (let i = 0; i < dexNames.length; i++) {
        const dex1 = dexNames[i];
        const price1 = dexPrices[dex1];
        if (!price1) continue;
        for (let j = i + 1; j < dexNames.length; j++) {
          const dex2 = dexNames[j];
          const price2 = dexPrices[dex2];
          if (!price2) continue;
          if (price1 > price2 * (1 + threshold)) {
            opportunities.push({
              strategy: 'ARBITRAGE',
              coin,
              pair,
              buy: dex2,
              sell: dex1,
              profitPotential: parseEther(((price1 * 10 ** 18 - price2 * (1 + threshold) * 10 ** 18) / 10 ** 18).toString())
            });
          } else if (price2 > price1 * (1 + threshold)) {
            opportunities.push({
              strategy: 'ARBITRAGE',
              coin,
              pair,
              buy: dex1,
              sell: dex2,
              profitPotential: parseEther(((price2 * 10 ** 18 - price1 * (1 + threshold) * 10 ** 18) / 10 ** 18).toString())
            });
          }
        }
      }
    }
    return opportunities;
  }


  // Price Feed Integration: Validate arbitrage opportunities using external price feeds
  async validateArbitrageOpportunity(opportunity) {
    const { pair, sell: sellDex, buy: buyDex } = opportunity;

    // this.logger.info('Opportunity => ', opportunity)
    // return true;
    const ep = `https://api.coingecko.com/api/v3/simple/price?ids=${pair[1].coin.toLowerCase()}&vs_currencies=${pair[0].coin.toLowerCase()}`;
    const headers = {
      // 'Authorization': `Bearer ${process.env.COINGECKO_API_KEY}`
    };
    try {

      const response = await axios.get(ep, { headers });
      const data = response.data[pair[1].coin.toLowerCase()];
       if (!data) throw new Error('Invalid response data');
      const { [pair[0].coin.toLowerCase()]: externalPrice } = data;
      if (!externalPrice) throw new Error('Invalid price data');

      // Compare external price with DEX price to validate opportunity
      const dexPrice = await this.getPriceFromDEX(DEXs[buyDex], pair[1], pair[0]);
      return dexPrice * (1 + ARBITRAGE_THRESHOLDS[pair[1].coin.toLowerCase()]) < externalPrice;
    } catch (error) {
      this.logger.error(`Error validating arbitrage opportunity: ERROR MESSAGE =>"${error.message}" for endpoint :::> ${ep}`);
      return true;
    }
  }

  async getPriceFromDEX(dex, tokenIn, tokenOut) {
    const router = new ethers.Contract(dex.routerAddress, DEX_ABI, this.provider);
    this.logger.info(`${dex.name} :::> Getting Amounts for ${parseEther('1')}, => ${tokenIn.coin} : ${tokenOut.coin}`)
    try {
      const amounts = await router.getAmountsOut(parseEther('1'), [tokenIn.address, tokenOut.address]);
      this.logger.info(`${dex.name} :::> Amounts => ${amounts}, OUT:> ${formatEther(amounts[1])}`);
      return parseFloat(formatEther(amounts[1]));
    } catch (error) {
      this.logger.error(`${dex.name} :::> Error fetching prices for pair: ${tokenIn.coin}<=>${tokenOut.coin} : Reason: =====> ${error.message}`);
      return 0;
    }
  }

  async executeArbitrage(opportunities) {
    const release = await this.mutex.acquire();
    try {
      const promises = opportunities.map(async (opportunity) => {
        const profitability = await this.calculateProfitability(opportunity);
        if (profitability.isProfit) {
          await AlertManager.sendAlert({
            message: `Profitable arbitrage opportunity found: Buy ${opportunity.coin} on ${opportunity.buy}, Sell on ${opportunity.sell}`
          });
          try {
            await this.queue.add(() => this.executeArbitrageTrade(opportunity, profitability));
            this.stateManager.updateState({ successfulTransactions: this.stateManager.getState().successfulTransactions + 1 });
            await this.profitTracker.recordTrade(opportunity, profitability);
          } catch (error) {
            this.logger.error('Error during arbitrage execution:', error);
            this.stateManager.updateState({ failedTransactions: this.stateManager.getState().failedTransactions + 1 });
          }
        }
      });

      await Promise.all(promises);
    } finally {
      release();
    }
  }


  async estimateTradeMetrics(opportunity) {
    const { buy, sell, pair } = opportunity;
    const buyDex = DEXs[buy];
    const sellDex = DEXs[sell];

    //  Get gas price
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.maxPriorityFeePerGas || parseUnits('2', 'gwei');

    // Calculate amountIn based on available balance and potential profit
    const balance = await this.getBalance(pair[0].address);
    if (!balance) return { amountIn: 0 }

    this.logger.info(`ETH BALANCE: ${balance}`)
    const maxPercentage = parseFloat(process.env.MAX_BUY_PERCENTAGE || '50'); // Maximum percentage of balance to use
    const basePercentage = parseFloat(process.env.BASE_BUY_PERCENTAGE || '10');
    const highProfitThreshold = parseEther(`${process.env.HIGH_PROFIT_THRESHOLD || 0.5}`);
    const profitMultiplier = parseFloat(process.env.PROFIT_MULTIPLIER || '1.5'); // Multiplier for high profit scenarios

    let percentageToUse = basePercentage;

    if (opportunity.profitPotential > highProfitThreshold) {
      percentageToUse = Math.min(basePercentage * profitMultiplier, maxPercentage);
    }

    const amountIn = balance * percentageToUse / 100;


    this.logger.info(`BUY SIM: SWAPPING ${amountIn} ${pair[0].coin} FOR ${pair[1].coin}`)
    // Simulatign buy transaction to estimate gas cost
    const buyRouter = new ethers.Contract(buyDex.routerAddress, DEX_ABI, this.wallet);
    const buyTx = await buyRouter.swapExactETHForTokens(
      0, // Set amountOutMin to 0 for estimation
      [pair[0].address, pair[1].address],
      this.wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes deadline
      {
        value: amountIn,
        ...gasLimitConfig()
      }
    );
    const buyGasEstimate = await this.provider.estimateGas(buyTx);
    const buyGasCost = buyGasEstimate * gasPrice;

    // Simulating sell transaction to estimate gas cost
    const sellRouter = new ethers.Contract(sellDex.routerAddress, DEX_ABI, this.wallet);
    const sellTx = await sellRouter.functions.swapExactTokensForETH(
      amountIn,
      0, // Set amountOutMin to 0 for estimation
      [pair[1].address, pair[0].address],
      this.wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes deadline
    );
    const sellGasEstimate = await this.provider.estimateGas(sellTx);
    const sellGasCost = sellGasEstimate * gasPrice;

    const gasCost = buyGasCost.add(sellGasCost);
    const slippage = SLIPPAGE_TOLERANCE[opportunity.coin] || 1;
    const exchangeFees = parseUnits((DEXs[opportunity.buy].tradingFeePercentage / 100).toString(), 'ether');
    const flashbotsBribe = parseUnits('0.005', 'ether'); // Flashbots bribe estimation

    const potentialProfit = opportunity.profitPotential;
    return { gasCost, slippage, exchangeFees, potentialProfit: potentialProfit - flashbotsBribe, amountIn };
  }

  async executeArbitrageTrade(opportunity, profitability) {
    const { buy, sell, coin, profitPotential, pair } = opportunity;
    this.logger.info(`Executing arbitrage: Buy ${coin} on ${buy}, Sell on ${sell}. Potential Profit: ${formatEther(profitPotential)} ETH`);
    const { amountIn } = profitability.metrics;
    const buyDex = DEXs[buy];
    const sellDex = DEXs[sell];

    const buyRouter = new ethers.Contract(buyDex.routerAddress, DEX_ABI, this.wallet);
    const sellRouter = new ethers.Contract(sellDex.routerAddress, DEX_ABI, this.wallet);

    const amountsOut = await buyRouter.getAmountsOut(amountIn, [pair[0].address, pair[1].address]);
    const amountOutMin = amountsOut[0] * BigInt(100 - SLIPPAGE_TOLERANCE[coin]) / 100;

    // Approve token if necessary
    await this.checkAndApproveToken(pair[0].address, buyDex.routerAddress, amountsOut[1]);

    // Prepare buy transaction
    const buyTx = await buyRouter.swapExactETHForTokens(
      amountOutMin,
      [pair[0].address, pair[1].address],
      this.wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes deadline
      {
        value: amountIn,
        ...gasLimitConfig()
      }
    );

    const sellAmount = amountsOut[0]; // Assuming full amount is sold
    const sellAmountMin = sellAmount * BigInt(100 - SLIPPAGE_TOLERANCE[coin]) / 100;

    // Approve token if necessary
    await this.checkAndApproveToken(pair[1].address, sellDex.routerAddress, sellAmount);

    // Prepare sell transaction
    const sellTx = await sellRouter.functions.swapExactTokensForETH(
      sellAmount,
      sellAmountMin,
      [pair[1].address, pair[0].address],
      this.wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes deadline
      gasLimitConfig()
    );

    // Create the bundle
    const bundle = [buyTx, sellTx];


    await this.simulateAndExecuteBundle(bundle);
  }


  async executeFrontRunning() {
    this.logger.info('Executing front-running...');
    const release = await this.mutex.acquire();
    try {
      const pendingBlock = await this.provider.send('eth_getBlockByNumber', ['pending', false]);

      if (!pendingBlock || !pendingBlock.transactions.length) {
        this.logger.info('No pending transactions found for front-running');
        return;
      }

      this.logger.info(`Found ${pendingBlock.transactions.length} pending transactions`)

      const promises = pendingBlock.transactions.map(async (txHash) => {
        const tx = await this.provider.getTransaction(txHash);

        if (!tx || !tx.to) return;

        const frontRunOpportunity = await this.isFrontRunningOpportunity(tx);
        if (frontRunOpportunity) {
          this.logger.info('Found front-running opportunity!');

          const { dex, pair, amountIn } = frontRunOpportunity;

          // Create the front-running transaction
          const { frontTxData } = await this.createFrontTx({ originalTx: tx, dex, pair, tradeValue: parseFloat(formatEther(tx.value)), amountIn });

          // Send the front-running transaction using Flashbots
          await this.simulateAndExecuteBundle([frontTxData, tx]);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      this.logger.error('Error during front-running execution:', error);
    } finally {
      release();
    }
  }

  async executeBackRunning() {
    this.logger.info('Executing back-running...');
    const release = await this.mutex.acquire();
    try {
      const pendingBlock = await this.provider.send('eth_getBlockByNumber', ['pending', false]);

      if (!pendingBlock || !pendingBlock.transactions.length) {
        this.logger.info('No pending transactions found for back-running');
        return;
      }

      this.logger.info(`Found ${pendingBlock.transactions.length} pending transactions`)

      const promises = pendingBlock.transactions.map(async (txHash) => {
        const tx = await this.provider.getTransaction(txHash);

        if (!tx || !tx.to) return;

        const backRunOpportunity = await this.isBackRunningOpportunity(tx);
        if (backRunOpportunity) {
          this.logger.info('Found back-running opportunity!');

          const { dex, pair, amountsOut } = backRunOpportunity;

          // Create the back-running transaction
          const backTx = await this.createBackTx({ originalTx: tx, dex, pair, tradeValue: parseFloat(formatEther(tx.value)) }, amountsOut);

          // Send the back-running transaction using Flashbots
          await this.simulateAndExecuteBundle([tx, backTx]);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      this.logger.error('Error during back-running execution:', error);
    } finally {
      release();
    }
  }
  async executeSandwich() {
    this.logger.info('Executing sandwich attack...');
    const release = await this.mutex.acquire();
    try {
      const targetTx = await this.findSandwichTarget();
      if (!targetTx) {
        this.logger.info('No suitable sandwich target found');
        return;
      }


      const { frontTxData, amountsOut } = await this.createFrontTx(targetTx);
      const backTx = await this.createBackTx(targetTx, amountsOut);

      const bundle = [frontTxData, targetTx.originalTx, backTx]

      await this.simulateAndExecuteBundle(bundle);
    } catch (error) {
      this.logger.error('Sandwich execution failed:', error);
    } finally {
      release();
    }
  }

  async findSandwichTarget() {
    try {
      const pendingBlock = await this.provider.send('eth_getBlockByNumber', ['pending', false]);
      if (!pendingBlock || !pendingBlock.transactions) return null;

      const targetTxs = [];

      // Process transactions in parallel with rate limiting
      await Promise.all(pendingBlock.transactions.map(async (txHash) => {
        const tx = await this.provider.getTransaction(txHash);
        const monitored = isMonitoredTx(tx);
        if (!monitored) return null;
        const { pair, isBuy } = monitored;
        if (!pair || !isBuy) return null;
        const quote = pair[1].coin;
        const tradeValue = parseFloat(formatEther(tx.value));
        // Calculate amountIn based on available balance
        const balance = await this.getBalance(pair[0].address);

        if (!balance) {
          this.logger.info(`Insufficient Funds > ${balance} ${pair[0].coin}`);
          return null;
        }
        const basePercentage = parseInt(process.env.BASE_BUY_PERCENTAGE || '10');

        let amountIn = tradeValue * basePercentage / 100;
        if (amountIn > balance) {
          this.logger.info(`Insufficient Funds > ${balance} ${pair[0].coin} TO Spend: ${amountIn}`);
          return null;
        }


        if (!tx || !tx.to) return;

        for (const dexKey in DEXs) {
          const dex = DEXs[dexKey];
          if (tx.to.toLowerCase() !== dex.routerAddress.toLowerCase() || !pair) {
            this.logger.info(`Transaction isn't on monitored DEXs > ${tx.to}`);
            continue; // 
          }


          if (tradeValue > (LARGE_TRADE_THRESHOLDS[pair[0].coin] || 1)) {
            this.logger.info(`Identified large trade for sandwiching on ${dex.name} for ${quote}: ${tradeValue} ${pair[0].coin}`);
            targetTxs.push({ tx, dex, pair, tradeValue, originalTx: tx, amountIn });
          } else {
            this.logger.info(`Transaction did'nt meet Sandwich target requirements > ${{
              tradeValue: {
                current: tradeValue,
                mustBe_GT: LARGE_TRADE_THRESHOLDS[base] || 1
              },
            }}`);
          }

          break;
        }
      }));

      // Return the first large transaction as the sandwich target
      return targetTxs.length > 0 ? targetTxs[0] : null;
    } catch (error) {
      this.logger.error('Error finding sandwich target:', error);
      return null;
    }
  }

  async createFrontTx(targetTx) {
    const { dex, pair, amountIn, originalTx } = targetTx;

    const buyDex = dex;

    const router = new ethers.Contract(buyDex.routerAddress, DEX_ABI, this.wallet);
    const amountsOut = await router.getAmountsOut(amountIn, [pair[0].address, pair[1].address]);
    const amountOutMin = amountsOut[1] * BigInt(100 - (SLIPPAGE_TOLERANCE[pair[0].coin] || 0)) / 100;

    // Approve token if necessary
    await this.checkAndApproveToken(pair[0].address, buyDex.routerAddress, amountIn);
    // get the gas price of the target Tx
    const targetTxGasPrice = originalTx.gasPrice || parseUnits('1', 'gwei');
    const frontTxData = await router.swapExactETHForTokens(
      amountOutMin,
      [pair[0].address, pair[1].address],
      this.wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes deadline
      {
        value: amountIn,
        ...gasLimitConfig(),
        gasPrice: targetTxGasPrice * 105n / 100n, // 5% higher gas
      }
    );

    return { frontTxData, amountsOut };
  }

  async createBackTx(targetTx, amountsOut) {
    const { dex, pair } = targetTx;

    const sellDex = dex;

    const router = new ethers.Contract(sellDex.routerAddress, DEX_ABI, this.wallet);

    const sellAmount = amountsOut;
    const sellAmountMin = sellAmount * BigInt(100 - SLIPPAGE_TOLERANCE[pair[1].coin]) / 100;

    // Approve token if necessary
    await this.checkAndApproveToken(pair[1].address, sellDex.routerAddress, sellAmount);

    const backTxData = await router.functions.swapExactTokensForETH(
      sellAmount,
      sellAmountMin,
      [pair[1].address, pair[0].address],
      this.wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes deadline
      gasLimitConfig()
    );

    return backTxData;
  }

  async simulateAndExecuteBundle(bundle) {
    const signer = this.wallet;
    try {
      // Collect the signed transactions
      const signedTransactions = await Promise.all(
        bundle.map(async (tx) => {
          // Populate and sign the transaction
          const populatedTx = await signer.populateTransaction(tx);
          const signedTx = await signer.signTransaction(populatedTx);
          return signedTx;
        })
      );

      // Simulate the transactions in order
      const simulationResults = [];
      for (const signedTx of signedTransactions) {
        const simulationResult = await this.mevShareClient.simulateTransaction(signedTx);
        simulationResults.push(simulationResult);
      }

      // Check for simulation errors
      for (const simulation of simulationResults) {
        if (simulation.error) {
          this.logger.error(`Simulation Error: ${simulation.error.message}`);
          return;
        }
      }

      this.logger.info('Simulation successful, sending bundle...');

      // Send the transactions in order
      for (const signedTx of signedTransactions) {
        const sendResult = await this.mevShareClient.sendTransaction(signedTx);
        if (sendResult.error) {
          this.logger.error(`Error sending transaction: ${sendResult.error.message}`);
          return;
        }
      }

      this.logger.info('Transactions sent to MEV-Share network.');

      // Note: mev-share-client does not provide a direct way to wait for inclusion.
      // You may need to implement additional logic to monitor transaction inclusion.

    } catch (error) {
      this.logger.error('Error during bundle simulation/execution:', error);
    }
  }

  // Identify front-running opportunities based on swap size, slippage, and gas price
  async isFrontRunningOpportunity(tx) {
    const monitored = isMonitoredTx(tx);
    if (!monitored) {
      this.logger.info(`Not monitoring TX `);
      return null;
    }
    const { pair } = monitored;
    if (!pair) {
      this.logger.info(`Not monitoring COIN PAIR:::> ${tx.data}`);
      return null;
    }

    const base = pair[0].coin;
    const tradeValue = parseFloat(formatEther(tx.value));
    // Calculate amountIn based on available balance
    const balance = await this.getBalance(pair[0].address);

    if (!balance) {
      this.logger.info(`Insufficient Funds > ${balance} ${base}`);
      return null;
    }
    const basePercentage = parseInt(process.env.BASE_BUY_PERCENTAGE || '10');

    let amountIn = tradeValue * basePercentage / 100;
    if (amountIn > balance) amountIn = balance;

    for (const dexKey in DEXs) {
      const dex = DEXs[dexKey];
      if (tx.to.toLowerCase() !== dex.routerAddress.toLowerCase()) {
        this.logger.info(`Transaction isn't on monitored DEXs > ${tx.to}`);
        continue; // 
      }




      // Front-running criteria:
      // 1. Large trade value above threshold
      // 2. Slippage tolerance higher than expected, indicating opportunity
      // 3. Gas price not too high to compete
      const slippage = this.extractSlippage(tx.data, amountIn);
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.maxPriorityFeePerGas || parseUnits('2', 'gwei');

      if (
        tradeValue > (LARGE_TRADE_THRESHOLDS[base] || 1) &&
        slippage > 1 &&
        gasPrice < parseUnits('200', 'gwei')
      ) {
        this.logger.info(`Identified front-running opportunity on ${dex.name} for ${pair[1].coin}: ${tradeValue} ${base}`);
        return { dex, pair, amountIn };
      } else {
        this.logger.info(`Transaction didnt meet Front-Running requirements > ${{
          tradeValue: {
            current: tradeValue,
            mustBe_GT: LARGE_TRADE_THRESHOLDS[base] || 1
          },
          slippage: {
            current: slippage,
            mustBe_GT: 1
          },
          gasPrice: {
            current: gasPrice,
            mustBe_LT: parseUnits('200', 'gwei')
          }
        }}`);
      }
      break;
    }

    return null;
  }

  // Extract slippage from transaction data (for Uniswap-like protocols)
  extractSlippage(txData, amountIn = 1) {
    try {
      const iface = new ethers.Interface(DEX_ABI);
      const decodedData = iface.parseTransaction({ data: txData });

      if (decodedData.name === 'swapExactTokensForETH') {
        const amountOutMin = parseFloat(formatEther(decodedData.args.amountOutMin));
        const slippageTolerance = ((amountIn - amountOutMin) / amountIn) * 100;
        return slippageTolerance;
      }

      return 0; // Default to 0% if slippage can't be extracted
    } catch (error) {
      this.logger.error('Error extracting slippage:', error);
      return 0; // Default to 0% if slippage can't be extracted
    }
  }

  // Identify back-running opportunities by checking liquidity pool impact and price impact recovery
  async isBackRunningOpportunity(tx) {
    const monitored = isMonitoredTx(tx);
    if (!monitored) {
      this.logger.info(`Not monitoring TX `, tx.data);
      return null;
    }
    const { pair, isBuy } = monitored;
    if (!pair || isBuy) {
      this.logger.info(`Not monitoring COIN PAIR `, pair);
      return;
    }
    const quote = pair[1].coin;
    const tradeValue = parseFloat(formatEther(tx.value));

    // Calculate amountOun based on available balance
    const balance = await this.getBalance(pair[1].address);

    if (!balance) {
      this.logger.info(`Insufficient Funds`,);
      return null;
    }
    const basePercentage = parseInt(process.env.BASE_BUY_PERCENTAGE || '10');

    let amountsOut = tradeValue * basePercentage / 100;
    if (amountsOut > balance) amountsOut = balance;


    for (const dexKey in DEXs) {
      const dex = DEXs[dexKey];
      if (tx.to.toLowerCase() !== dex.routerAddress.toLowerCase()) {
        this.logger.info(`Transaction isn't on monitored DEXs > ${tx.to}`);
        continue; // 
      }



      // Back-running criteria:
      // 1. Large trade size impacting liquidity
      // 2. Slippage tolerance that suggests price impact
      // 3. Expectation that the price will recover after the impact
      const reserves = await this.getLiquidityPoolReserves(dex, pair);
      const priceImpact = this.calculatePriceImpact(tradeValue, reserves);

      if (tradeValue > (LARGE_TRADE_THRESHOLDS[quote] || 1) && priceImpact > 5) {
        this.logger.info(`Identified back-running opportunity on ${dex.name} for ${quote}: ${tradeValue} ${quote}`);
        return { dex, pair, amountsOut };
      } else {
        this.logger.info(`Transaction did'nt meet Back-Running requirements > ${{
          tradeValue: {
            current: tradeValue,
            mustBe_GT: LARGE_TRADE_THRESHOLDS[quote] || 1
          },
          priceImpact: {
            current: priceImpact,
            mustBe_GT: 5
          },
        }}`);
      }
      break;
    }

    return null;
  }

  // Fetch reserves from the liquidity pool to measure impact
  async getLiquidityPoolReserves(dex, pair) {
    const pairAddress = await this.getPairAddress(dex.factoryAddress, pair[0].address, pair[1].address);
    if (pairAddress === ZeroAddress) {
      throw new Error(`No pair found for ${pair[0].coin} and ${pair[1].coin} on ${dex.name}`);
    }
    const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
    const reserves = await pairContract.getReserves();
    return { reserve0: reserves.reserve0, reserve1: reserves.reserve1 };
  }

  // Calculate price impact based on reserves and trade size
  calculatePriceImpact(tradeValue, reserves) {
    const ethReserve = parseFloat(formatEther(reserves.reserve0));
    const tokenReserve = parseFloat(formatEther(reserves.reserve1));

    const priceImpact = (tradeValue / ethReserve) * 100;
    return priceImpact;
  }


}

module.exports = MEVBot;
