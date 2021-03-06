import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router';
import Styles from './top-nav.styles.less';
import ButtonStyles from './buttons.styles.less';
import { Link } from 'react-router-dom';
import {
  MARKET,
  MARKETS,
  PORTFOLIO,
  SIDEBAR_TYPES,
  TX_STATUS,
} from '../constants';
import makePath from '../routes/helpers/make-path';
import Logo from './logo';
import parsePath from '../routes/helpers/parse-path';
import classNames from 'classnames';
import { GearIcon, ThreeLinesIcon } from './icons';
import { useAppStatusStore } from '../stores/app-status';
import { useLocalStorage } from '../stores/local-storage';
import ConnectAccount from '../ConnectAccount/index';
import { SecondaryButton, TinyButton } from './buttons';
import { Toasts } from '../toasts/toasts';
import { ToggleSwitch } from 'modules/common/toggle-switch';
import { generateTooltip } from 'modules/common/labels';
import { updateTxStatus } from '../modal/modal-add-liquidity';

export const SettingsButton = () => {
  const {
    settings: { slippage, showInvalidMarkets, showLiquidMarkets },
    actions: { updateSettings },
  } = useAppStatusStore();

  const [open, setOpened] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const settingsRef = useRef(null);
  const isSelectedArray = useMemo(() => {
    let output = [false, false, false, false];
    switch (slippage) {
      case '0.5': {
        output[0] = true;
        break;
      }
      case '1': {
        output[1] = true;
        break;
      }
      case '2': {
        output[2] = true;
        break;
      }
      default: {
        output[3] = true;
        break;
      }
    }
    return output;
  }, [slippage]);

  useEffect(() => {
    const handleWindowOnClick = (event) => {
      if (
        open &&
        !!event.target &&
        settingsRef.current !== null &&
        !settingsRef?.current?.contains(event.target)
      ) {
        setOpened(false);
      }
    };

    window.addEventListener('click', handleWindowOnClick);

    return () => {
      window.removeEventListener('click', handleWindowOnClick);
    };
  });

  useEffect(() => {
    if (customVal === '' && !['0.5', '1', '2'].includes(slippage)) {
      setCustomVal(slippage);
    }
  }, [slippage, customVal]);

  return (
    <div className={Styles.SettingsMenuWrapper}>
      <SecondaryButton action={() => setOpened(!open)} icon={GearIcon} />
      {open && (
        <ul className={Styles.SettingsMenu} ref={settingsRef}>
          <li>
            <h2>Settings</h2>
          </li>
          <li>
            <label>
              Slippage Tolerance
              {generateTooltip(
                'The maximum percentage the price can change and still have your transaction succeed.',
                'slippageToleranceInfo'
              )}
            </label>
            <ul>
              <li>
                <TinyButton
                  text="0.5%"
                  action={() => {
                    updateSettings({ slippage: '0.5' });
                    setCustomVal('');
                  }}
                  selected={isSelectedArray[0]}
                  className={ButtonStyles.TinyTransparentButton}
                />
              </li>
              <li>
                <TinyButton
                  text="1%"
                  action={() => {
                    updateSettings({ slippage: '1' });
                    setCustomVal('');
                  }}
                  selected={isSelectedArray[1]}
                  className={ButtonStyles.TinyTransparentButton}
                />
              </li>
              <li>
                <TinyButton
                  text="2%"
                  action={() => {
                    updateSettings({ slippage: '2' });
                    setCustomVal('');
                  }}
                  selected={isSelectedArray[2]}
                  className={ButtonStyles.TinyTransparentButton}
                />
              </li>
              <li>
                <div
                  className={classNames({
                    [Styles.Selected]: isSelectedArray[3],
                  })}
                >
                  <input
                    type="number"
                    step="0.1"
                    value={customVal}
                    onChange={(v) => {
                      setCustomVal(v.target.value);
                    }}
                    onBlur={() => {
                      if (customVal !== slippage) {
                        if (
                          customVal === '' ||
                          isNaN(Number(customVal)) ||
                          Number(customVal) > 1000 ||
                          Number(customVal) <= 0
                        ) {
                          setCustomVal(slippage);
                        } else {
                          updateSettings({ slippage: customVal });
                        }
                      }
                    }}
                    placeholder="custom"
                    max="1000"
                    min="0.1"
                  />
                  <span>%</span>
                </div>
              </li>
            </ul>
          </li>
          <li>
            <label>
              Show Invalid Markets
              {generateTooltip(
                'Filters out markets which are likely to resolve to "Invalid" based upon the current trading price of the "Invalid" outcome.',
                'showInvalidMarketsInfo'
              )}
            </label>
            <ToggleSwitch
              toggle={showInvalidMarkets}
              setToggle={() =>
                updateSettings({ showInvalidMarkets: !showInvalidMarkets })
              }
            />
          </li>
          <li>
            <label>Show liquid markets only</label>
            <ToggleSwitch
              toggle={showLiquidMarkets}
              setToggle={() =>
                updateSettings({ showLiquidMarkets: !showLiquidMarkets })
              }
            />
          </li>
        </ul>
      )}
    </div>
  );
};

export const TopNav = () => {
  const location = useLocation();
  const path = parsePath(location.pathname)[0];
  const {
    blocknumber,
    paraConfig: { networkId },
    loginAccount,
    transactions,
    isLogged,
    isMobile,
    actions: { setSidebar, updateLoginAccount, logout, updateTransaction },
  } = useAppStatusStore();
  const [lastUser, setLastUser] = useLocalStorage('lastUser', null);
  useEffect(() => {
    if (blocknumber && transactions) {
      transactions
        .filter((tx) => tx?.status === TX_STATUS.PENDING)
        .forEach((tx) => {
          const isTransactionMined = async (transactionHash, provider) => {
            const txReceipt = await provider.getTransactionReceipt(
              transactionHash
            );
            if (txReceipt && txReceipt.blockNumber) {
              return txReceipt;
            }
          };
          isTransactionMined(tx.hash, loginAccount.library).then((response) => {
            if (response?.confirmations > 0) {
              updateTxStatus(response, updateTransaction);
            }
          });
        });
    }
  }, [transactions, blocknumber]);

  useEffect(() => {
    const isMetaMask = loginAccount?.library?.provider?.isMetaMask;
    if (isMetaMask && loginAccount?.account) {
      setLastUser(loginAccount.account);
    } else if (!loginAccount?.active) {
      setLastUser(null);
    }
  }, [loginAccount]);

  const autoLogin = lastUser || null;

  const handleAccountUpdate = async (activeWeb3) => {
    if (activeWeb3) {
      if (String(networkId) !== String(activeWeb3.chainId)) {
        updateLoginAccount({ chainId: activeWeb3.chainId });
      } else if (
        loginAccount?.account &&
        loginAccount.account !== activeWeb3.account
      ) {
        logout();
        updateLoginAccount(activeWeb3);

        // TEMPORARY WORKAROUND - MM provider broken on account change
        const isMetaMask = activeWeb3?.library?.provider?.isMetaMask;
        if (isMetaMask) {
          // When we detect a MM account chanage we call updateLoginAccount in order to update the lastUser localStorage
          // key with the users new selected account and refresh the page to reload the provider using autologin
          window.location.reload();
        }
      } else {
        updateLoginAccount(activeWeb3);
      }
    }
  };

  return (
    <nav
      className={classNames(Styles.TopNav, {
        [Styles.TwoTone]: path !== MARKETS,
        [Styles.OnMarketsView]: path === MARKET,
      })}
    >
      <section>
        <Logo />
        {!isMobile && (
          <ol>
            <li className={classNames({ [Styles.Active]: path === MARKETS })}>
              <Link placeholder="Markets" to={makePath(MARKETS)}>
                Markets
              </Link>
            </li>
            <li className={classNames({ [Styles.Active]: path === PORTFOLIO })}>
              <Link
                onClick={(e) => {
                  !isLogged && e.preventDefault();
                }}
                disabled={!isLogged}
                to={makePath(PORTFOLIO)}
                placeholder={
                  isLogged ? 'Portfolio' : 'Please Login to view Portfolio'
                }
              >
                Portfolio
              </Link>
            </li>
          </ol>
        )}
      </section>
      <section>
        <ConnectAccount
          {...{
            updateLoginAccount: handleAccountUpdate,
            autoLogin,
            transactions,
          }}
        />
        {isMobile ? (
          <button
            className={Styles.MobileMenuButton}
            title="Augur Menu"
            onClick={() => setSidebar(SIDEBAR_TYPES.NAVIGATION)}
          >
            {ThreeLinesIcon}
          </button>
        ) : (
          <SettingsButton />
        )}
        <Toasts />
      </section>
    </nav>
  );
};

export default TopNav;
