import React, { useEffect, useMemo, useRef, useState } from 'react';
import Styles from 'modules/market/trading-form.styles.less';
import classNames from 'classnames';
import { useAppStatusStore } from '../stores/app-status';
import {
  AmmExchange,
  AmmOutcome,
  Cash,
  EstimateTradeResult,
  TradingDirection,
} from '../types';
import {
  formatCash,
  formatCashPrice,
  formatDai,
  formatPercent,
  formatSimpleShares,
  getCashFormat,
} from '../../utils/format-number';
import { ApprovalButton, BuySellButton, APPROVED } from '../common/buttons';
import {
  ApprovalAction,
  SHARES,
  OUTCOME_YES_NAME,
  YES_OUTCOME_ID,
  INSUFFICIENT_LIQUIDITY,
  ENTER_AMOUNT,
  SETTINGS_SLIPPAGE,
  ERROR_AMOUNT,
  TX_STATUS,
  BUY,
  SELL,
  YES_NO,
  ETH,
} from '../constants';
import { generateTooltip } from '../common/labels';
import {
  doTrade,
  estimateEnterTrade,
  estimateExitTrade,
} from '../../utils/contract-calls';
import { BigNumber as BN } from 'bignumber.js';
import { updateTxStatus } from '../modal/modal-add-liquidity';
import { CloseIcon, LinkIcon } from '../common/icons';
import {
  checkAllowance,
  isERC1155ContractApproved,
} from '../hooks/use-approval-callback';
import { AmountInput } from '../common/inputs';

export const DefaultMarketOutcomes = [
  {
    id: 0,
    name: 'Invalid',
    price: '$0.00',
    isInvalid: true,
  },
  {
    id: 1,
    name: 'No',
    price: '$0.25',
  },
  {
    id: 2,
    name: 'yes',
    price: '$0.75',
  },
];

const PLACEHOLDER = '0';
const AVG_PRICE_TIP =
  'The difference between the market price and estimated price due to trade size.';

export const isInvalidNumber = (number) => {
  return (
    number !== '' &&
    (isNaN(number) || Number(number) < 0 || Number(number) === 0)
  );
};

const Outcome = ({
  outcome,
  marketType,
  selected,
  onClick,
  showAllHighlighted,
  nonSelectable,
  editable,
  setEditableValue,
  ammCash,
  showAsButton,
  invalidSelected,
  error,
}) => {
  const [customVal, setCustomVal] = useState('');
  const input = useRef(null);
  const { isLogged } = useAppStatusStore();
  const { prepend, symbol } = getCashFormat(ammCash?.name);
  useEffect(() => {
    if (outcome.price !== '0' && outcome.price && outcome.price !== '') {
      setCustomVal(outcome.price);
    }
  }, [outcome.price]);
  const formattedPrice = formatDai(outcome.price);
  return (
    <div
      onClick={() => (outcome.isInvalid ? null : onClick())}
      className={classNames(Styles.Outcome, {
        [Styles.YesNo]: !outcome.isInvalid && marketType === YES_NO,
        [Styles.Selected]: selected,
        [Styles.Yes]: outcome.name === OUTCOME_YES_NAME,
        [Styles.ShowAllHighlighted]: showAllHighlighted,
        [Styles.nonSelectable]: nonSelectable,
        [Styles.Edited]: customVal !== '',
        [Styles.showAsButton]: showAsButton,
        [Styles.Invalid]: outcome.isInvalid,
        [Styles.InvalidSelected]: invalidSelected,
        [Styles.loggedOut]: !isLogged,
        [Styles.disabled]: !isLogged && outcome.isInvalid,
        [Styles.Error]: error,
      })}
    >
      <span>{outcome.name}</span>
      {editable ? (
        <div onClick={() => input.current && input.current.focus()}>
          <span>{`${prepend && symbol}`}</span>
          <input
            value={customVal}
            onChange={(v) => {
              setCustomVal(`${v.target.value}`);
              setEditableValue(v.target.value);
            }}
            type="number"
            placeholder={editable ? '0.0' : PLACEHOLDER}
            ref={input}
            // @ts-ignore
            onWheel={(e) => e?.target?.blur()}
          />
        </div>
      ) : (
        <>
          {!outcome.isInvalid && (
            <span>
              {
                formatCashPrice(formattedPrice.fullPrecision, ammCash?.name)
                  .full
              }
            </span>
          )}
          {outcome.isInvalid && LinkIcon}
        </>
      )}
    </div>
  );
};

interface OutcomesGridProps {
  outcomes: AmmOutcome[];
  selectedOutcome?: AmmOutcome;
  setSelectedOutcome: Function;
  marketType: string;
  orderType?: string;
  showAllHighlighted?: boolean;
  nonSelectable?: boolean;
  editable?: boolean;
  setEditableValue?: Function;
  ammCash: Cash;
  showAsButtons?: boolean;
  dontFilterInvalid?: boolean;
  error?: boolean;
}
export const OutcomesGrid = ({
  outcomes,
  selectedOutcome,
  setSelectedOutcome,
  marketType,
  showAllHighlighted,
  nonSelectable,
  editable,
  setEditableValue,
  ammCash,
  showAsButtons,
  dontFilterInvalid,
  error,
}: OutcomesGridProps) => {
  return (
    <div
      className={classNames(Styles.Outcomes, {
        [Styles.YesNo]: marketType === YES_NO,
        [Styles.nonSelectable]: nonSelectable,
        [Styles.showAsButtons]: showAsButtons,
      })}
    >
      {outcomes
        .filter((outcome) => (dontFilterInvalid ? true : !outcome.isInvalid))
        .reverse()
        .map((outcome, index) => (
          <Outcome
            key={outcome.id}
            selected={
              selectedOutcome &&
              (outcome.id === selectedOutcome.id ||
                (showAllHighlighted && !outcome.isInvalid))
            }
            nonSelectable={nonSelectable}
            showAllHighlighted={showAllHighlighted}
            outcome={outcome}
            onClick={() => setSelectedOutcome(outcome)}
            marketType={marketType}
            editable={editable}
            setEditableValue={(price) => setEditableValue(price, outcome.id)}
            ammCash={ammCash}
            showAsButton={showAsButtons}
            invalidSelected={selectedOutcome?.isInvalid}
            error={error}
          />
        ))}
    </div>
  );
};

interface InfoNumber {
  label: string;
  value: string;
  tooltipText?: string;
  tooltipKey?: string;
}

interface InfoNumbersProps {
  infoNumbers: InfoNumber[];
  unedited?: boolean;
}

export const InfoNumbers = ({ infoNumbers, unedited }: InfoNumbersProps) => {
  return (
    <div
      className={classNames(Styles.OrderInfo, {
        [Styles.Populated]: !unedited,
      })}
    >
      {infoNumbers.map((infoNumber) => (
        <div key={infoNumber.label}>
          <span>
            {infoNumber.label}
            {infoNumber.tooltipText &&
              generateTooltip(infoNumber.tooltipText, infoNumber.tooltipKey)}
          </span>
          <span>{infoNumber.value}</span>
        </div>
      ))}
    </div>
  );
};

const getEnterBreakdown = (breakdown: EstimateTradeResult, cash: Cash) => {
  return [
    {
      label: 'Average Price',
      value: !isNaN(Number(breakdown?.averagePrice))
        ? formatCashPrice(breakdown.averagePrice, cash?.name).full
        : '-',
      tooltipText: AVG_PRICE_TIP,
      tooltipKey: 'averagePrice',
    },
    {
      label: 'Estimated Shares',
      value: !isNaN(Number(breakdown?.outputValue))
        ? formatSimpleShares(breakdown.outputValue).full
        : '-',
    },
    {
      label: 'Max Profit',
      value: !isNaN(Number(breakdown?.maxProfit))
        ? formatCash(breakdown.maxProfit, cash?.name).full
        : '-',
    },
    {
      label: 'Estimated Fees (Shares)',
      value: !isNaN(Number(breakdown?.tradeFees))
        ? formatSimpleShares(breakdown.tradeFees).full
        : '-',
    },
  ];
};

const getExitBreakdown = (breakdown: EstimateTradeResult, cash: Cash) => {
  return [
    {
      label: 'Average Price',
      value: !isNaN(Number(breakdown?.averagePrice))
        ? formatCashPrice(breakdown.averagePrice, cash?.name).full
        : '-',
      tooltipText: AVG_PRICE_TIP,
      tooltipKey: 'averagePrice',
    },
    {
      label: `Amount You'll Recieve`,
      value: !isNaN(Number(breakdown?.outputValue))
        ? formatCash(breakdown.outputValue, cash?.name).full
        : '-',
    },
    {
      label: 'Remaining Shares',
      value: !isNaN(Number(breakdown?.remainingShares))
        ? formatSimpleShares(breakdown.remainingShares).full
        : '-',
    },
    {
      label: `Estimated Fees (${cash.name})`,
      value: !isNaN(Number(breakdown?.tradeFees))
        ? formatCash(breakdown.tradeFees, cash?.name).full
        : '-',
    },
  ];
};

const formatBreakdown = (
  isBuy: boolean,
  breakdown: EstimateTradeResult,
  cash: Cash
) =>
  isBuy
    ? getEnterBreakdown(breakdown, cash)
    : getExitBreakdown(breakdown, cash);

interface TradingFormProps {
  amm: AmmExchange;
  marketType?: string;
  initialSelectedOutcome: AmmOutcome;
}

interface CanTradeProps {
  disabled: boolean;
  actionText: string;
  subText?: string | null;
}

const TradingForm = ({
  initialSelectedOutcome,
  marketType = YES_NO,
  amm,
}: TradingFormProps) => {
  const {
    isLogged,
    loginAccount,
    transactions,
    paraConfig,
    showTradingForm,
    actions: { addTransaction, updateTransaction, setShowTradingForm },
    settings: { slippage },
    userInfo: { balances },
  } = useAppStatusStore();
  const [orderType, setOrderType] = useState(BUY);
  const [selectedOutcome, setSelectedOutcome] = useState(
    initialSelectedOutcome
  );
  const [breakdown, setBreakdown] = useState<EstimateTradeResult>(null);
  const [amount, setAmount] = useState<string>('');
  const ammCash = amm?.cash;
  const outcomes = amm?.ammOutcomes || [];
  const isBuy = orderType === BUY;
  const isETH = ammCash?.name === ETH;
  const { addresses } = paraConfig;
  const { AMMFactory, WethWrapperForAMMExchange } = addresses;
  const { shareToken } = ammCash;
  const [canEnterPosition, setCanEnterPosition] = useState(false);
  const [canExitPosition, setCanExitPosition] = useState(false);
  const isApprovedTrade = isBuy ? canEnterPosition : canExitPosition;

  useEffect(() => {
    if (initialSelectedOutcome.id !== selectedOutcomeId) {
      setSelectedOutcome(initialSelectedOutcome);
      setAmount('');
    }
  }, [initialSelectedOutcome]);

  useEffect(() => {
    const checkCanEnterPosition = async () => {
      const approvalCheck = await checkAllowance(
        ammCash?.address,
        AMMFactory,
        loginAccount,
        transactions,
        updateTransaction
      );
      setCanEnterPosition(approvalCheck === APPROVED);
    };
    if (isLogged && !canEnterPosition) {
      isETH ? setCanEnterPosition(true) : checkCanEnterPosition();
    }
  }, [
    isLogged,
    canEnterPosition,
    setCanEnterPosition,
    updateTransaction,
    transactions,
  ]);

  useEffect(() => {
    const checkCanExit = async () => {
      const approvalCheck = await isERC1155ContractApproved(
        shareToken,
        isETH ? WethWrapperForAMMExchange : AMMFactory,
        loginAccount,
        transactions,
        updateTransaction
      );
      setCanExitPosition(approvalCheck === APPROVED);
    };
    if (isLogged && !canExitPosition) {
      checkCanExit();
    }
  }, [
    isLogged,
    canExitPosition,
    setCanExitPosition,
    updateTransaction,
    transactions,
  ]);

  const approvalAction = !isApprovedTrade
    ? isBuy
      ? ApprovalAction.ENTER_POSITION
      : ApprovalAction.EXIT_POSITION
    : null;
  const selectedOutcomeId = selectedOutcome.id;
  const marketShares =
    balances?.marketShares && balances?.marketShares[amm?.id];
  const outcomeSharesRaw = JSON.stringify(marketShares?.outcomeSharesRaw);
  const amountError =
    amount !== '' &&
    (isNaN(Number(amount)) || Number(amount) === 0 || Number(amount) < 0);
  const buttonError = amountError ? ERROR_AMOUNT : '';

  useEffect(() => {
    function handleShowTradingForm() {
      if (window.innerWidth >= 1200 && showTradingForm) {
        setShowTradingForm(false);
        setAmount('');
      }
    }
    window.addEventListener('resize', handleShowTradingForm);
    setShowTradingForm(false);
    return () => {
      window.removeEventListener('resize', handleShowTradingForm);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const getEstimate = async () => {
      const outputYesShares = selectedOutcomeId === YES_OUTCOME_ID;
      let userBalances = [];
      if (outcomeSharesRaw) {
        userBalances = marketShares?.outcomeSharesRaw;
      }
      const breakdown = isBuy
        ? await estimateEnterTrade(amm, amount, outputYesShares)
        : await estimateExitTrade(amm, amount, outputYesShares, userBalances);
      isMounted && setBreakdown(breakdown);
    };

    if (amount && Number(amount) > 0) {
      getEstimate();
    } else if (breakdown !== null) {
      isMounted && setBreakdown(null);
    }

    return () => {
      isMounted = false;
    };
  }, [
    orderType,
    selectedOutcomeId,
    amount,
    outcomeSharesRaw,
    amm?.volumeTotal,
    amm?.liquidity,
  ]);

  const userBalance = String(
    useMemo(() => {
      return isBuy
        ? amm?.cash?.name
          ? balances[amm?.cash?.name]?.balance
          : '0'
        : marketShares?.outcomeShares
        ? marketShares?.outcomeShares[selectedOutcomeId]
        : '0';
    }, [orderType, amm?.cash?.name, amm?.id, selectedOutcomeId, balances])
  );

  const canMakeTrade: CanTradeProps = useMemo(() => {
    let actionText = buttonError || orderType;
    let subText = null;
    let disabled = false;
    if (Number(amount) === 0 || isNaN(Number(amount)) || amount === '') {
      actionText = ENTER_AMOUNT;
      disabled = true;
    } else if (new BN(amount).gt(new BN(userBalance))) {
      actionText = `Insufficient ${isBuy ? ammCash.name : 'Share'} Balance`;
      disabled = true;
    } else if (breakdown === null) {
      actionText = INSUFFICIENT_LIQUIDITY;
      disabled = true;
    } else if (
      new BN(slippage || SETTINGS_SLIPPAGE).lt(
        new BN(breakdown?.slippagePercent)
      )
    ) {
      subText = `(Adjust slippage tolerance in settings to ${Math.ceil(
        Number(breakdown.slippagePercent)
      )}%)`;
      disabled = true;
    }

    return {
      disabled,
      actionText,
      subText,
    };
  }, [
    orderType,
    amount,
    buttonError,
    userBalance,
    breakdown?.slippagePercent,
    slippage,
  ]);

  const makeTrade = () => {
    const minOutput = breakdown?.outputValue;
    const percentageOff = new BN(1).minus(new BN(slippage).div(100));
    const worstCaseOutput = String(new BN(minOutput).times(percentageOff));
    const direction = isBuy ? TradingDirection.ENTRY : TradingDirection.EXIT;
    const outputYesShares = selectedOutcomeId === YES_OUTCOME_ID;
    const userBalances = marketShares?.outcomeSharesRaw || [];
    setShowTradingForm(false);
    doTrade(
      direction,
      amm,
      worstCaseOutput,
      amount,
      outputYesShares,
      userBalances
    )
      .then((response) => {
        if (response) {
          const { hash } = response;
          setAmount('');
          addTransaction({
            hash,
            chainId: loginAccount.chainId,
            seen: false,
            status: TX_STATUS.PENDING,
            from: loginAccount.account,
            addedTime: new Date().getTime(),
            message: `${
              direction === TradingDirection.ENTRY ? 'Buy' : 'Sell'
            } Shares`,
            marketDescription: amm?.market?.description,
          });
          response
            .wait()
            .then((response) => updateTxStatus(response, updateTransaction));
        }
      })
      .catch((e) => {
        //TODO: handle errors here
      });
  };

  return (
    <div className={Styles.TradingForm}>
      <div>
        <span
          onClick={() => {
            setOrderType(BUY);
            setBreakdown(null);
          }}
          className={classNames({ [Styles.Selected]: isBuy })}
        >
          {BUY}
        </span>
        <span
          onClick={() => {
            setBreakdown(null);
            setOrderType(SELL);
          }}
          className={classNames({ [Styles.Selected]: !isBuy })}
        >
          {SELL}
        </span>
        <div>
          <span>fee</span>
          <span>{formatPercent(amm?.feeInPercent).full}</span>
        </div>
        <div
          onClick={() => {
            setShowTradingForm(false);
            setAmount('');
          }}
        >
          {CloseIcon}
        </div>
      </div>
      <div>
        <OutcomesGrid
          outcomes={outcomes}
          selectedOutcome={selectedOutcome}
          setSelectedOutcome={(outcome) => {
            setSelectedOutcome(outcome);
            setAmount('');
          }}
          marketType={marketType}
          orderType={orderType}
          ammCash={ammCash}
          dontFilterInvalid
        />
        <AmountInput
          chosenCash={isBuy ? ammCash?.name : SHARES}
          updateInitialAmount={setAmount}
          initialAmount={amount}
          error={amountError}
          maxValue={userBalance}
          ammCash={ammCash}
          rate={
            !isNaN(Number(breakdown?.ratePerCash))
              ? `1 ${amm?.cash?.name} = ${
                  formatSimpleShares(breakdown?.ratePerCash, {
                    denomination: (v) => `${v} Shares`,
                  }).full
                }`
              : null
          }
          isBuy={orderType === BUY}
        />
        <InfoNumbers infoNumbers={formatBreakdown(isBuy, breakdown, ammCash)} />
        {isLogged && !isApprovedTrade && (
          <ApprovalButton
            {...{ amm, cash: ammCash, actionType: approvalAction }}
          />
        )}
        <BuySellButton
          disabled={canMakeTrade.disabled || !isApprovedTrade}
          action={makeTrade}
          text={canMakeTrade.actionText}
          subText={canMakeTrade.subText}
          error={buttonError}
        />
      </div>
    </div>
  );
};

export default TradingForm;
