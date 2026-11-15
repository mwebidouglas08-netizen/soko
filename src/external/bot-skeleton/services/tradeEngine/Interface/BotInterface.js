import { observer as globalObserver } from '../../../utils/observer';
import { createDetails } from '../utils/helpers';

const getBotInterface = tradeEngine => {
    const getDetail = i => createDetails(tradeEngine.data.contract)[i];

    return {
        init: (...args) => tradeEngine.init(...args),
        start: (...args) => tradeEngine.start(...args),
        stop: (...args) => tradeEngine.stop(...args),
        purchase: (contract_type, prediction) => tradeEngine.purchase(contract_type, prediction),
        getSymbol: () => tradeEngine.symbol,
        setSymbol: symbol => tradeEngine.setSymbol(symbol),
        getVolatilitySymbols: () => tradeEngine.getVolatilitySymbols(),
        scanBestVolatilitySignal: opts => tradeEngine.scanBestVolatilitySignal(opts),
        getAskPrice: contract_type => {
            const p = getProposal(contract_type, tradeEngine);
            return p && p.ask_price != null ? Number(p.ask_price) : NaN;
        },
        getPayout: contract_type => {
            const p = getProposal(contract_type, tradeEngine);
            return p && p.payout != null ? Number(p.payout) : NaN;
        },
        getPurchaseReference: () => tradeEngine.getPurchaseReference(),
        isSellAvailable: () => tradeEngine.isSellAtMarketAvailable(),
        sellAtMarket: () => tradeEngine.sellAtMarket(),
        getSellPrice: () => getSellPrice(tradeEngine),
        isResult: result => getDetail(10) === result,
        isTradeAgain: result => globalObserver.emit('bot.trade_again', result),
        readDetails: i => getDetail(i - 1),
    };
};

const getProposal = (contract_type, tradeEngine) => {
    return tradeEngine.data.proposals.find(
        proposal =>
            proposal.contract_type === contract_type &&
            proposal.purchase_reference === tradeEngine.getPurchaseReference()
    );
};

const getSellPrice = tradeEngine => {
    return tradeEngine.getSellPrice();
};

export default getBotInterface;
