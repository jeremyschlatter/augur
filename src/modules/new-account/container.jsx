import React from 'react'
import { Route, withRouter } from 'react-router-dom'

import AccountHeader from 'modules/new-account/components/account-header/container'
import AccountWithdraw from 'modules/new-account/components/account-withdraw/container'

import makePath from 'modules/routes/helpers/make-path'

import { ACCOUNT_DEPOSIT, ACCOUNT_WITHDRAW, ACCOUNT_EXPORT } from 'modules/routes/constants/views'

import Styles from 'modules/new-account/account.styles.less' // eslint-disable-line

const AccountView = p => (
  <section className={Styles.AccountView}>
    <AccountHeader />
    <Route path={makePath(ACCOUNT_DEPOSIT)} component={() => (<div />)} />
    <Route path={makePath(ACCOUNT_WITHDRAW)} component={AccountWithdraw} />
    <Route path={makePath(ACCOUNT_EXPORT)} component={() => (<div />)} />
  </section>
)

export default withRouter(AccountView)
