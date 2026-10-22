// ========================================
// MENU ITEMS PLACEHOLDER FOR WHITE-LABELING
// ========================================
//
// Custom menu items rendered in the header next to the logo. The reference app
// ships a single `Reports` entry (a.deriv-menu-item.app-header__menu) that opens
// the summary drawer — our run panel's Summary/Transactions/Journal surface.
//
// For mobile menu items, see:
// src/components/layout/header/mobile-menu/use-mobile-menu-config.tsx

import { observer } from 'mobx-react-lite';
import { localize } from '@deriv-com/translations';
import { useStore } from '@/hooks/useStore';
import './menu-items.scss';

export const MenuItems = observer(() => {
    const { run_panel } = useStore() ?? {};

    return (
        <a
            className='deriv-menu-item app-header__menu'
            href='#reports'
            aria-label={localize('Reports')}
            onClick={e => {
                e.preventDefault();
                run_panel?.toggleDrawer(true);
            }}
        >
            <svg
                className='app-header__menu-icon'
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 16 16'
                width='16'
                height='16'
                role='img'
                aria-hidden='true'
            >
                <path d='M13 8v7h1a1 1 0 0 0 1-1V8zM9 0l4 4v3h3v7a2 2 0 0 1-2 2H1a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1zm-.414 1H1v14h11V4.414zM6.5 11a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1zm3-2a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1zm0-2a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1zm0-2a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1z' />
            </svg>
            <span className='deriv-text app-header__menu-text'>{localize('Reports')}</span>
        </a>
    );
});

export const TradershubLink = observer(() => {
    // No default Traders Hub link - add your custom navigation here if needed
    return null;
});

// Create a namespace for MenuItems to include TradershubLink
type MenuItemsType = typeof MenuItems & {
    TradershubLink: typeof TradershubLink;
};

// Assign TradershubLink to MenuItems
(MenuItems as MenuItemsType).TradershubLink = TradershubLink;

export default MenuItems as MenuItemsType;
// [/AI]
