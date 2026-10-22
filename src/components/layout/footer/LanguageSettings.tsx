import Text from '@/components/shared_ui/text';
import { useTranslations } from '@deriv-com/translations';
import { Tooltip } from '@deriv-com/ui';

type TLanguageSettings = {
    openLanguageSettingModal: () => void;
};

const LanguageSettings = ({ openLanguageSettingModal }: TLanguageSettings) => {
    const { currentLang, localize } = useTranslations();

    return (
        <Tooltip
            as='button'
            className='app-footer__language'
            onClick={openLanguageSettingModal}
            tooltipContent={localize('Language')}
            aria-label={`${localize('Change language')} - ${localize('Current language')}: ${currentLang}`}
            aria-expanded='false'
            aria-haspopup='dialog'
        >
            <svg width='17' height='12' viewBox='0 0 60 40' aria-hidden='true'>
                <rect width='60' height='40' fill='#012169' />
                <path d='M0 0l60 40M60 0L0 40' stroke='#fff' strokeWidth='8' />
                <path d='M0 0l60 40M60 0L0 40' stroke='#C8102E' strokeWidth='4' />
                <path d='M30 0v40M0 20h60' stroke='#fff' strokeWidth='13' />
                <path d='M30 0v40M0 20h60' stroke='#C8102E' strokeWidth='8' />
            </svg>
            <Text size='xs' weight='bold'>
                {currentLang}
            </Text>
        </Tooltip>
    );
};

export default LanguageSettings;
