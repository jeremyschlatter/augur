import React from 'react';

import { ExternalLinkText } from 'modules/common/buttons';
import { Close, BackArrow } from 'modules/common/icons';
import { MODAL_LOGIN, MODAL_SIGNUP } from 'modules/common/constants';
import { useAppStatusStore } from 'modules/app/store/app-status';

import Styles from 'modules/modal/modal.styles.less';

export const HardwareWallet = () => {
  const {
    modal,
    actions: { closeModal, setModal },
  } = useAppStatusStore();

  const loginModal = () => setModal({ type: MODAL_LOGIN });
  const signupModal = () => setModal({ type: MODAL_SIGNUP });

  return (
    <div className={Styles.HardwareWallet}>
      <div
        onClick={
          modal.isLogin ? () => loginModal() : () => signupModal()
        }
      >
        {BackArrow} {'Back'}
      </div>
      <div onClick={() => closeModal()}>{Close}</div>

      <section>
        <div>Using a hardware wallet</div>
        <div>
          If you want to use a Trezor or Ledger hardware wallet you can do this
          via Metamask.
          <p />
          Metamask allows you to connect a Trezor or Ledger wallet which can
          then be used with apps like Augur. Through the Metamask connection you
          will be able to check your balances, sign transactions and sign
          messages.
        </div>
      </section>

      <ExternalLinkText
        URL='https://metamask.zendesk.com/hc/en-us/articles/360020394612-How-to-connect-a-Trezor-or-Ledger-Hardware-Wallet"'
        label={'how to connect a wallet to metamask'}
      />
    </div>
  );
};
