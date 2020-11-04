import React from "react";
// @ts-ignore
import Styles from "modules/market-charts/components/candlestick/outcome-candlestick.styles.less";
import { BigNumber } from 'bignumber.js';

interface CandlestickOchlProps {
  hoveredPeriod?: {
    open?: BigNumber | null;
    close?: BigNumber | null;
    high?: BigNumber | null;
    low?: BigNumber | null;
  };
  pricePrecision: number;
}

export const CandlestickOchl: React.FC<CandlestickOchlProps> = ({ hoveredPeriod, pricePrecision }) => (
  <div className={Styles.Stats}>
    <span>
      {!!hoveredPeriod.open && (
        <>
          <span>O:</span>
          <span>{hoveredPeriod.open.toFixed(pricePrecision).toString()}</span>
        </>
      )}
    </span>
    <span>
      {!!hoveredPeriod.close && (
        <>
          <span>C:</span>
          <span>{hoveredPeriod.close.toFixed(pricePrecision).toString()}</span>
        </>
      )}
    </span>
    <span>
      {!!hoveredPeriod.high && (
        <>
          <span>H:</span>
          <span>{hoveredPeriod.high.toFixed(pricePrecision).toString()}</span>
        </>
      )}
    </span>
    <span>
      {!!hoveredPeriod.low && (
        <>
          <span>L:</span>
          <span>{hoveredPeriod.low.toFixed(pricePrecision).toString()}</span>
        </>
      )}
    </span>
  </div>
);

CandlestickOchl.defaultProps = {
  hoveredPeriod: {},
};
