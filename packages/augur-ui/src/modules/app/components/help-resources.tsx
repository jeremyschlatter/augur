import React from 'react';
import classNames from 'classnames';

import { BettingQuestionIcon } from 'modules/common/icons';
import { ExternalLinkButton } from 'modules/common/buttons';

import Styles from 'modules/app/components/help-resources.styles.less';
import {
  TRADING_TUTORIAL,
  HELP_CENTER,
  HELP_CENTER_ADD_FUNDS,
  HELP_CENTER_HOW_TO_TRADE,
  HELP_CENTER_HOW_TO_DISPUTE,
  MODAL_HELP,
  DISCORD_LINK,
} from 'modules/common/constants';
import { MARKET } from 'modules/routes/constants/views';
import makeQuery from 'modules/routes/helpers/make-query';
import { MARKET_ID_PARAM_NAME } from 'modules/routes/constants/param-names';

import { useAppStatusStore } from 'modules/app/store/app-status';

const HELP_LINKS = [
  {
    label: 'view trading tutorial',
    showNonLink: true,
    customLink: {
      pathname: MARKET,
      search: makeQuery({
        [MARKET_ID_PARAM_NAME]: TRADING_TUTORIAL,
      }),
    },
  },
  {
    label: 'help center',
    link: HELP_CENTER,
  },
  {
    label: 'how to add funds',
    link: HELP_CENTER_ADD_FUNDS,
  },
  {
    label: 'how to trade',
    link: HELP_CENTER_HOW_TO_TRADE,
  },
  {
    label: 'how to dispute',
    link: HELP_CENTER_HOW_TO_DISPUTE,
  },
  {
    label: 'report a bug',
    link: 'https://github.com/AugurProject/augur/issues/new/choose',
  },
  {
    label: 'community support',
    link: DISCORD_LINK,
  },
];

export const HelpMenuList = () => {
  return (
    <ul className={classNames(Styles.HelpMenuList)}>
      <li>popular help resources</li>
      {HELP_LINKS.filter(({ label }) => label !== 'view trading tutorial').map(({ className, link, label, customLink, showNonLink, lightLink }, index) => (
        <li key={'helpLink_' + index} className={className}>
          <ExternalLinkButton
            light
            URL={link}
            label={label}
            customLink={customLink}
            showNonLink={showNonLink}
            lightLink={lightLink}
          />
        </li>
      ))}
    </ul>
  );
};

interface HelpMenuProps {
  closeHelpMenu: Function;
}

export const HelpMenu = ({ closeHelpMenu }: HelpMenuProps) => {
  return (
    <div className={classNames(Styles.HelpMenu)}>
      <span>popular help resources</span>
      {HELP_LINKS.map(
        ({ className, link, label, customLink, showNonLink }, index) => (
          <span key={'helpLink_' + index} className={className}>
            <ExternalLinkButton
              light
              URL={link}
              label={label}
              customLink={customLink}
              showNonLink={showNonLink}
              callback={closeHelpMenu}
            />
          </span>
        )
      )}
    </div>
  );
};

interface HelpIconProps {
  isHelpMenuOpen: boolean;
  updateHelpMenuState: Function;
}

export const HelpIcon = ({
  updateHelpMenuState,
  isHelpMenuOpen,
}: HelpIconProps) => {
  return (
    <div
      className={classNames(Styles.HelpIcon, {
        [Styles.Open]: isHelpMenuOpen,
      })}
      onClick={event => event.stopPropagation()}
    >
      <span onClick={() => updateHelpMenuState(!isHelpMenuOpen)}>
        {BettingQuestionIcon}
      </span>
    </div>
  );
};

export const HelpResources = () => {
  const { isHelpMenuOpen, isMobile, actions: { setIsHelpMenuOpen, setModal } } = useAppStatusStore();
  return (
    <div
      className={classNames(Styles.HelpResources, {
        [Styles.Open]: isHelpMenuOpen,
      })}
      onClick={event => event.stopPropagation()}
    >
      <HelpIcon
        updateHelpMenuState={isMobile ? () => setModal({ type: MODAL_HELP }) : setIsHelpMenuOpen}
        isHelpMenuOpen={isHelpMenuOpen}
      />
      {isHelpMenuOpen && (
        <HelpMenu closeHelpMenu={() => setIsHelpMenuOpen(false)} />
      )}
    </div>
  );
};
