import { MarketTypeName } from '@augurproject/sdk-lite';
import { createBigNumber } from 'utils/create-big-number';
import {
  CryptoIcon,
  EntertainmentIcon,
  FinanceIcon,
  MedicalIcon,
  PoliticsIcon,
  SportsIcon,
} from './common/category-icons';

// # Market Types
export const YES_NO = MarketTypeName.YesNo;
export const CATEGORICAL = MarketTypeName.Categorical;
export const SCALAR = MarketTypeName.Scalar;

// MAIN VIEWS
export const MARKET = 'market';
export const MARKETS = 'markets';
export const PORTFOLIO = 'portfolio';

export const YES_NO_OUTCOMES_NAMES = ['Invalid', 'No', 'Yes'];
// QUERY_PARAMS
export const MARKET_ID_PARAM_NAME = 'id';
export const AFFILIATE_NAME = 'r';
export const THEME_NAME = 't';

export const OUTCOME_YES_NAME = 'Yes';
export const OUTCOME_NO_NAME = 'No';
export const OUTCOME_INVALID_NAME = 'Invalid';

// Directions
export const BUY = 'buy';
export const SELL = 'sell';

export const ADD_LIQUIDITY = 'add liquidity';

export const ETHER = createBigNumber(10).pow(18);
export const GWEI_CONVERSION = 1000000000;
export const TEN = createBigNumber(10, 10);
export const ZERO = createBigNumber(0);
export const SEC_IN_YEAR = createBigNumber(86400).times(createBigNumber(365));

// # Asset Types
export const ETH = 'ETH';
export const REP = 'REP';
export const DAI = 'DAI';
export const USDT = 'USDT';
export const USDC = 'USDC';
export const SHARES = 'SHARES';

// Portfolio table views
export const POSITIONS = 'positions';
export const LIQUIDITY = 'liquidity';

// top categories
export const MEDICAL = 'medical';
export const POLITICS = 'politics';
export const FINANCE = 'finance';
export const CRYPTO = 'crypto';
export const ENTERTAINMENT = 'entertainment';
export const ECONOMICS = 'economics';
export const SPORTS = 'sports';
export const OTHER = 'other';
export const ALL_MARKETS = 'all markets';

// sub categories
export const COVID = 'covid-19';
export const ELECTORAL_COLLEGE = 'electoral college';
export const FEDERAL_FUNDS = 'federal funds';
export const REPUSD = 'REP USD';
export const PRESIDENTIAL_ELECTION = 'electoral college';

export const POPULAR_CATEGORIES_ICONS = {
  [MEDICAL]: MedicalIcon,
  [POLITICS]: PoliticsIcon,
  [CRYPTO]: CryptoIcon,
  [FINANCE]: FinanceIcon,
  [SPORTS]: SportsIcon,
  [ENTERTAINMENT]: EntertainmentIcon,
};

// side bar types
export const NAVIGATION = 'NAVIGATION';
export const FILTERS = 'FILTERS';

export const SIDEBAR_TYPES = {
  [NAVIGATION]: NAVIGATION,
  [FILTERS]: FILTERS,
};

//  transaction types
export const ALL = 'all';
export const SWAP = 'swap';
export const ADD = 'add';
export const REMOVE = 'remove';

export const INVALID_OUTCOME_ID = 0;
export const NO_OUTCOME_ID = 1;
export const YES_OUTCOME_ID = 2;

export const OPEN = 'Open';
export const IN_SETTLEMENT = 'In settlement';
export const FINALIZED = 'Finalized';

export const INSUFFICIENT_LIQUIDITY = 'Insufficent Liquidity';
export const INSUFFICIENT_BALANCE = 'Insufficent Balance';
export const OVER_SLIPPAGE = 'Over Slippage Tolerance';
export const ENTER_AMOUNT = 'Enter Amount';
export const ERROR_AMOUNT = 'Amount is not valid';
export const CONNECT_ACCOUNT = 'Connect Account';

export const SETTINGS_SLIPPAGE = "0.5"
// graph market status
export const MARKET_STATUS = {
  TRADING: 'TRADING',
  REPORTING: 'REPORTING',
  DISPUTING: 'DISPUTING',
  FINALIZED: 'FINALIZED',
  SETTLED: 'SETTLED',
};

export const categoryItems = [
  {
    label: ALL_MARKETS,
    value: ALL_MARKETS,
  },
  {
    label: CRYPTO,
    value: CRYPTO,
  },
  {
    label: ECONOMICS,
    value: ECONOMICS,
  },
  {
    label: ENTERTAINMENT,
    value: ENTERTAINMENT,
  },
  {
    label: MEDICAL,
    value: MEDICAL,
  },
  {
    label: SPORTS,
    value: SPORTS,
  },
  {
    label: OTHER,
    value: OTHER,
  },
];

export const TOTAL_VOLUME = 'Total Volume';
export const sortByItems = [
  {
    label: TOTAL_VOLUME,
    value: TOTAL_VOLUME,
  },
  {
    label: '24hr volume',
    value: '24hr volume',
  },
  {
    label: 'liquidity',
    value: 'liquidity',
  },
  {
    label: 'ending soon',
    value: 'ending soon',
  },
];

export const marketStatusItems = [
  {
    label: OPEN,
    value: OPEN,
  },
  {
    label: IN_SETTLEMENT,
    value: IN_SETTLEMENT,
  },
  {
    label: FINALIZED,
    value: FINALIZED,
  },
];

export const currencyItems = [
  {
    label: ALL,
    value: ALL,
  },
  {
    label: ETH,
    value: ETH,
  },
  {
    label: USDC,
    value: USDC,
  },
];

// approvals

export enum ApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED,
}

export enum ApprovalAction {
  ENTER_POSITION,
  EXIT_POSITION,
  ADD_LIQUIDITY,
  REMOVE_LIQUIDITY,
}

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

// Modals
export const MODAL_ADD_LIQUIDITY = 'MODAL_ADD_LIQUIDITY';

export const DEFAULT_MARKET_VIEW_SETTINGS = {
  categories: ALL_MARKETS,
  reportingState: OPEN,
  sortBy: TOTAL_VOLUME,
  currency: ALL,
};

export const CREATE = 'create';

export const LIQUIDITY_STRINGS = {
  [REMOVE]: {
    header: 'remove liquidity',
    showTradingFee: false,
    amountSubtitle: 'How much do you want to remove?',
    receiveTitle: 'What you will recieve',
    approvalButtonText: 'approve shares spend',
    actionButtonText: 'enter amount',
    confirmButtonText: 'confirm remove',
    currencyName: SHARES,
    liquidityDetailsFooter: {
      title: 'Market Liquidity Details',
    },
    confirmOverview: {
      title: 'What you are Removing',
    },
    confirmReceiveOverview: {
      title: 'What you will recieve',
    }
  },
  [ADD]: {
    header: 'add liquidity',
    showTradingFee: true,
    setOdds: true,
    setOddsTitle: 'Current Odds',
    receiveTitle: "You'll receive",
    actionButtonText: 'add',
    confirmButtonText: 'confirm add',
    confirmOverview: {
      title: 'What you are depositing',
    },
    confirmReceiveOverview: {
      title: 'What you will receive',
    },
    marketLiquidityDetails: {
      title: 'Market liquidity details',
    }
  },
  [CREATE]: {
    showCurrencyDropdown: true,
    header: 'add liquidity',
    showTradingFee: false,
    setTradingFee: true,
    setOdds: true,
    setOddsTitle: 'Set the price between (0.0 to 1.0)',
    editableOutcomes: true,
    receiveTitle: "You'll receive",
    actionButtonText: 'add',
    confirmButtonText: 'confirm market liquidity',
    confirmOverview: {
      title: 'What you are depositing',
    },
    confirmReceiveOverview: {
      title: 'What you will receive',
    },
    marketLiquidityDetails: {
      title: 'market liquidity details',
    }
  }
}
