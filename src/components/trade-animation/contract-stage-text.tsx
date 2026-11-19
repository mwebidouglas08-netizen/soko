import React from 'react';
import { contract_stages } from '@/constants/contract-stage';
import { Localize } from '@deriv-com/translations';

type TContractStageText = {
    contract_stage: number | undefined;
};

export const text_contract_stages = Object.freeze({
    NOT_RUNNING: 'Ready to run',
    STARTING: 'Starting…',
    RUNNING: 'Running',
    PURCHASE_SENT: 'Placing order…',
    PURCHASE_RECEIVED: 'Order placed',
    IS_STOPPING: 'Stopping…',
    CONTRACT_CLOSED: 'Trade closed',
});

const ContractStageText: React.FC<TContractStageText> = ({ contract_stage }) => {
    const stage = contract_stage !== undefined ? contract_stage : contract_stages.NOT_RUNNING;

    switch (stage) {
        case contract_stages.STARTING:
            return <Localize i18n_default_text={text_contract_stages.STARTING} />;
        case contract_stages.RUNNING:
            return <Localize i18n_default_text={text_contract_stages.RUNNING} />;
        case contract_stages.PURCHASE_SENT:
            return <Localize i18n_default_text={text_contract_stages.PURCHASE_SENT} />;
        case contract_stages.PURCHASE_RECEIVED:
            return <Localize i18n_default_text={text_contract_stages.PURCHASE_RECEIVED} />;
        case contract_stages.IS_STOPPING:
            return <Localize i18n_default_text={text_contract_stages.IS_STOPPING} />;
        case contract_stages.CONTRACT_CLOSED:
            return <Localize i18n_default_text={text_contract_stages.CONTRACT_CLOSED} />;
        case contract_stages.NOT_RUNNING:
        default:
            return <Localize i18n_default_text={text_contract_stages.NOT_RUNNING} />;
    }
};

export default ContractStageText;
