/* eslint-disable no-promise-executor-return */
import debounce from 'lodash.debounce';
import { getLocalizedErrorMessage } from '@/constants/backend-error-messages';
import { localize } from '@deriv-com/translations';
import { getLast } from '../../../utils/binary-utils';
import { observer as globalObserver } from '../../../utils/observer';
import { api_base } from '../../api/api-base';
import { getDirection, getLastDigit } from '../utils/helpers';
import { expectPositiveInteger } from '../utils/sanitize';
import * as constants from './state/constants';

let tickListenerKey;

export default Engine =>
    class Ticks extends Engine {
        async watchTicks(symbol) {
            if (symbol && this.symbol !== symbol) {
                this.symbol = symbol;
                const { ticksService } = this.$scope;

                await ticksService.stopMonitor({
                    symbol,
                    key: tickListenerKey,
                });
                const callback = ticks => {
                    if (this.is_proposal_subscription_required) {
                        this.checkProposalReady();
                    }
                    const list = Array.isArray(ticks) ? ticks : [];
                    const lastTick = list.length ? list[list.length - 1] : null;
                    if (lastTick && Number.isFinite(lastTick.epoch)) {
                        this.store.dispatch({ type: constants.NEW_TICK, payload: lastTick.epoch });
                    }
                };

                const key = await ticksService.monitor({ symbol, callback });
                tickListenerKey = key;
            }
        }

        checkTicksPromiseExists() {
            return this.$scope.ticksService.ticks_history_promise;
        }

        getTicks(toString = false) {
            return new Promise(resolve => {
                this.$scope.ticksService
                    .request({ symbol: this.symbol })
                    .then(ticks => {
                        const source = Array.isArray(ticks) ? ticks : [];
                        const pip_size = this.getPipSize();
                        const ticks_list = source
                            .map(tick => {
                                const q = tick && tick.quote;
                                if (!Number.isFinite(q)) return null;
                                if (toString) {
                                    return Number(q).toFixed(pip_size);
                                }
                                return q;
                            })
                            .filter(v => v !== null);

                        resolve(ticks_list);
                    })
                    .catch(() => resolve([]));
            });
        }

        getLastTick(raw, toString = false) {
            return new Promise((resolve, reject) =>
                this.$scope.ticksService
                    .request({ symbol: this.symbol })
                    .then(ticks => {
                        try {
                            const list = Array.isArray(ticks) ? ticks : [];
                            const last = getLast(list);
                            if (!last || !Number.isFinite(last.quote)) {
                                resolve(raw ? last : undefined);
                                return;
                            }
                            let last_tick = raw ? last : last.quote;
                            if (!raw && toString) {
                                last_tick = Number(last_tick).toFixed(this.getPipSize());
                            }
                            resolve(last_tick);
                        } catch (error) {
                            reject(error);
                        }
                    })
                    .catch(e => {
                        if (e && e.code === 'MarketIsClosed') {
                            const localizedError = {
                                ...e,
                                message: getLocalizedErrorMessage(e.code, e.details),
                            };
                            globalObserver.emit('Error', localizedError);
                            resolve(e.code);
                        }
                        reject(e);
                    })
            );
        }

        getLastDigit() {
            return new Promise(resolve =>
                this.getLastTick(false, true)
                    .then(tick => {
                        if (tick === undefined || tick === null || tick === '') {
                            resolve(NaN);
                            return;
                        }
                        resolve(getLastDigit(tick));
                    })
                    .catch(() => resolve(NaN))
            );
        }

        getLastDigitList() {
            return new Promise(resolve =>
                this.getTicks(true)
                    .then(ticks => resolve(this.getLastDigitsFromList(ticks)))
                    .catch(() => resolve([]))
            );
        }
        getLastDigitsFromList(ticks) {
            const source = Array.isArray(ticks) ? ticks : [];
            const pip_size = this.getPipSize();
            return source
                .map(tick => {
                    if (tick === undefined || tick === null) return NaN;
                    const value = typeof tick === 'number' ? Number(tick).toFixed(pip_size) : String(tick);
                    return getLastDigit(value);
                })
                .filter(d => Number.isFinite(d));
        }

        getNthLastDigit(n = 1) {
            const index = Number.parseInt(n, 10);
            return new Promise(resolve =>
                this.getTicks(true)
                    .then(ticks => {
                        const list = Array.isArray(ticks) ? ticks : [];
                        if (!Number.isFinite(index) || index < 1 || list.length < index) {
                            resolve(undefined);
                            return;
                        }
                        const tick = list[list.length - index];
                        resolve(getLastDigit(tick));
                    })
                    .catch(() => resolve(undefined))
            );
        }

        checkLastDigitsCondition(digit_count, condition, compare_value = 0) {
            const parsed_compare_value = Number.parseInt(compare_value, 10);
            const numeric_compare_value = Number.isNaN(parsed_compare_value) ? 0 : parsed_compare_value;
            const parsed_digit_count = Number.parseInt(digit_count, 10);
            const count = Number.isFinite(parsed_digit_count) ? Math.max(0, parsed_digit_count) : 0;

            return new Promise(resolve =>
                this.getLastDigitList()
                    .then(digit_list => {
                        const list = Array.isArray(digit_list) ? digit_list : [];
                        const digits = count > 0 ? list.slice(-count) : [];

                        if (!digits.length) {
                            resolve(false);
                            return;
                        }

                        switch (condition) {
                            case 'ALL_EVEN':
                                resolve(digits.every(digit => digit % 2 === 0));
                                break;
                            case 'ALL_ODD':
                                resolve(digits.every(digit => digit % 2 !== 0));
                                break;
                            case 'ALL_SAME':
                                resolve(digits.every(digit => digit === digits[0]));
                                break;
                            case 'LESS_THAN':
                                resolve(digits.every(digit => digit < numeric_compare_value));
                                break;
                            case 'GREATER_THAN':
                                resolve(digits.every(digit => digit > numeric_compare_value));
                                break;
                            case 'LESS_OR_EQUAL':
                                resolve(digits.every(digit => digit <= numeric_compare_value));
                                break;
                            case 'GREATER_OR_EQUAL':
                                resolve(digits.every(digit => digit >= numeric_compare_value));
                                break;
                            default:
                                resolve(false);
                        }
                    })
                    .catch(error => {
                        console.error('Error checking last digits condition:', error);
                        resolve(false);
                    })
            );
        }

        checkDirection(dir) {
            return new Promise(resolve =>
                this.$scope.ticksService
                    .request({ symbol: this.symbol })
                    .then(ticks => resolve(getDirection(ticks) === dir))
                    .catch(() => resolve(false))
            );
        }

        getOhlc(args) {
            const { granularity = this.options.candleInterval || 60, field } = args || {};

            return new Promise(resolve =>
                this.$scope.ticksService
                    .request({ symbol: this.symbol, granularity })
                    .then(ohlc => {
                        const list = Array.isArray(ohlc) ? ohlc : [];
                        resolve(field ? list.map(o => (o ? o[field] : undefined)) : list);
                    })
                    .catch(() => resolve([]))
            );
        }

        getOhlcFromEnd(args) {
            const { index: i = 1 } = args || {};

            const index = expectPositiveInteger(Number(i), localize('Index must be a positive integer'));

            return new Promise(resolve =>
                this.getOhlc(args).then(ohlc => {
                    const list = Array.isArray(ohlc) ? ohlc : [];
                    resolve(list.length >= index ? list[list.length - index] : undefined);
                })
            );
        }

        getPipSize() {
            const pipSizes = this.$scope?.ticksService?.pipSizes || {};
            return pipSizes[this.symbol] ?? 2;
        }

        async requestAccumulatorStats() {
            const subscription_id = this.subscription_id_for_accumulators;
            const is_proposal_requested = this.is_proposal_requested_for_accumulators;
            const proposal_request = {
                ...window.Blockly.accumulators_request,
                amount: this?.tradeOptions?.amount,
                basis: this?.tradeOptions?.basis,
                contract_type: 'ACCU',
                currency: this?.tradeOptions?.currency,
                growth_rate: this?.tradeOptions?.growth_rate,
                proposal: 1,
                subscribe: 1,
                underlying_symbol: this?.tradeOptions?.symbol,
            };
            if (!subscription_id && !is_proposal_requested) {
                this.is_proposal_requested_for_accumulators = true;
                if (proposal_request) {
                    await api_base?.api?.send(proposal_request);
                }
            }
        }

        async handleOnMessageForAccumulators() {
            let ticks_stayed_in_list = [];
            return new Promise(resolve => {
                const subscription = api_base.api.onMessage().subscribe(({ data }) => {
                    if (data.msg_type === 'proposal') {
                        try {
                            this.subscription_id_for_accumulators = data.subscription.id;
                            const stat_list = (data.proposal.contract_details.ticks_stayed_in || []).flat().reverse();
                            ticks_stayed_in_list = [...stat_list, ...ticks_stayed_in_list];
                            if (ticks_stayed_in_list.length > 0) resolve(ticks_stayed_in_list);
                        } catch (error) {
                            globalObserver.emit('Unexpected message type or no proposal found:', error);
                        }
                    }
                });
                api_base.pushSubscription(subscription);
            });
        }

        async fetchStatsForAccumulators() {
            try {
                const debouncedAccumulatorsRequest = debounce(() => this.requestAccumulatorStats(), 300);
                debouncedAccumulatorsRequest();
                const ticks_stayed_in_list = await this.handleOnMessageForAccumulators();
                return ticks_stayed_in_list;
            } catch (error) {
                globalObserver.emit('Error in subscription promise:', error);
                throw error;
            } finally {
                await api_base?.api?.send({ forget_all: 'proposal' });
                this.is_proposal_requested_for_accumulators = false;
                this.subscription_id_for_accumulators = null;
            }
        }

        async getCurrentStat() {
            try {
                const ticks_stayed_in = await this.fetchStatsForAccumulators();
                return ticks_stayed_in?.[0];
            } catch (error) {
                globalObserver.emit('Error fetching current stat:', error);
            }
        }

        async getStatList() {
            try {
                const ticks_stayed_in = await this.fetchStatsForAccumulators();
                // we need to send only lastest 100 ticks
                return ticks_stayed_in?.slice(0, 100);
            } catch (error) {
                globalObserver.emit('Error fetching current stat:', error);
            }
        }

        async getDelayTickValue(tick_value) {
            return new Promise((resolve, reject) => {
                try {
                    const ticks = [];
                    const symbol = this.symbol;

                    const resolveAndExit = () => {
                        this.$scope.ticksService.stopMonitor({
                            symbol,
                            key: '',
                        });
                        resolve(ticks);
                        ticks.length = 0;
                    };

                    const watchTicks = tick_list => {
                        ticks.push(tick_list);
                        const current_tick = ticks.length;
                        if (current_tick === tick_value) {
                            resolveAndExit();
                        }
                    };

                    const delayExecution = tick_list => watchTicks(tick_list);

                    if (Number(tick_value) <= 0) resolveAndExit();
                    this.$scope.ticksService.monitor({ symbol, callback: delayExecution });
                } catch (error) {
                    reject(new Error(`Failed to start tick monitoring: ${error.message}`));
                }
            });
        }

        async scanBestVolatilitySignal(opts = {}) {
            const overBarrier = Number.isFinite(Number(opts.overBarrier)) ? Number(opts.overBarrier) : 2;
            const underBarrier = Number.isFinite(Number(opts.underBarrier)) ? Number(opts.underBarrier) : 8;
            const windowSize = Math.max(8, Math.min(60, Number(opts.windowSize) || 25));
            const minHistory = Math.max(10, Math.min(windowSize, Number(opts.minHistory) || 15));
            const minConfidence = Number.isFinite(Number(opts.minConfidence)) ? Number(opts.minConfidence) : 68;
            const maxSymbols = Math.max(1, Math.min(60, Number(opts.maxSymbols) || 30));

            let candidates = Array.isArray(opts.symbols) && opts.symbols.length ? opts.symbols : null;
            if (!candidates) {
                try {
                    const syms = typeof this.getVolatilitySymbols === 'function' ? await this.getVolatilitySymbols() : [];
                    candidates = Array.isArray(syms) ? syms : [];
                } catch (e) {
                    candidates = [];
                }
            }
            candidates = [...new Set((candidates || []).filter(Boolean))];
            if (!candidates.length) {
                return { symbol: this.symbol, contractType: null, prediction: null, confidence: 0, reason: 'no_symbols' };
            }

            const start = Number.isInteger(this._maziwaScanCursor) ? this._maziwaScanCursor : 0;
            const rotated = candidates.slice(start).concat(candidates.slice(0, start));
            const batch = rotated.slice(0, Math.min(maxSymbols, rotated.length));
            this._maziwaScanCursor = (start + Math.max(1, batch.length)) % candidates.length;

            const tickSvc = this.$scope?.ticksService;

            const evaluate = (digits, sym) => {
                const n = digits.length;
                if (n < minHistory) return null;
                const recent = digits.slice(-windowSize);
                const last1 = recent[recent.length - 1];
                const last2 = recent.slice(-2);
                const last3 = recent.slice(-3);
                const last4 = recent.slice(-4);
                const last5 = recent.slice(-5);
                const last8 = recent.slice(-8);

                const build = type => {
                    const isOver = type === 'DIGITOVER';
                    const barrier = isOver ? overBarrier : underBarrier;
                    const isLoss = d => (isOver ? d <= barrier : d >= barrier);
                    const lossDigits = isOver ? barrier + 1 : 10 - barrier;
                    const expectedWin = 1 - lossDigits / 10;

                    const winRate = recent.filter(d => !isLoss(d)).length / recent.length;
                    const edge = winRate - expectedWin;

                    let safeStreak = 0;
                    for (let k = recent.length - 1; k >= 0; k--) {
                        if (!isLoss(recent[k])) safeStreak++;
                        else break;
                    }

                    let score = 0;
                    if (last1 != null && !isLoss(last1)) score += 22;
                    else score -= 45;

                    if (last2.length === 2 && last2.every(d => !isLoss(d))) score += 16;
                    if (last2.some(isLoss)) score -= 14;

                    if (last3.length === 3 && last3.every(d => !isLoss(d))) score += 14;
                    if (last3.length === 3 && last3.filter(isLoss).length >= 2) score -= 22;

                    if (last4.length >= 3 && last4.filter(d => !isLoss(d)).length >= 3) score += 10;
                    if (last5.length >= 4 && last5.filter(d => !isLoss(d)).length >= 4) score += 10;

                    const recent6 = recent.slice(-6);
                    const recentLoss6 = recent6.filter(isLoss).length;
                    if (recentLoss6 === 0) score += 10;
                    else if (recentLoss6 >= 3) score -= 22;

                    score += Math.max(-25, Math.min(30, edge * 110));
                    if (edge < -0.02) score -= 12;

                    const winRate8 = last8.length ? last8.filter(d => !isLoss(d)).length / last8.length : 0;
                    score += Math.max(-12, Math.min(14, (winRate8 - expectedWin) * 80));

                    score += Math.min(20, safeStreak * 4);

                    const volatility = new Set(last5).size;
                    if (volatility >= 5 && safeStreak < 2) score -= 6;

                    const confidence = Math.max(0, Math.min(99, Math.round(52 + score)));
                    return {
                        symbol: sym,
                        contractType: type,
                        prediction: barrier,
                        confidence,
                        winRate,
                        edge,
                        safeStreak,
                        expectedWin,
                    };
                };

                const over = build('DIGITOVER');
                const under = build('DIGITUNDER');
                if (!over && !under) return null;
                return !under || over.confidence >= under.confidence ? over : under;
            };

            const fetchDigits = async sym => {
                let digits = [];
                if (sym === this.symbol) {
                    digits = await this.getLastDigitList();
                } else if (tickSvc && typeof tickSvc.request === 'function') {
                    const ticks = await tickSvc.request({ symbol: sym });
                    digits = this.getLastDigitsFromList(ticks || []);
                }
                return Array.isArray(digits) ? digits.filter(d => Number.isFinite(d)) : [];
            };

            const settled = await Promise.all(
                batch.map(async sym => {
                    try {
                        const digits = await fetchDigits(sym);
                        if (digits.length < minHistory) return null;
                        return evaluate(digits, sym);
                    } catch (e) {
                        return null;
                    }
                })
            );

            const signals = settled.filter(Boolean);
            signals.sort(
                (a, b) =>
                    b.confidence - a.confidence ||
                    b.safeStreak - a.safeStreak ||
                    b.edge - a.edge ||
                    b.winRate - a.winRate
            );

            const best = signals[0] || null;
            if (!best || best.confidence < minConfidence) {
                return {
                    symbol: best ? best.symbol : this.symbol,
                    contractType: null,
                    prediction: null,
                    confidence: best ? best.confidence : 0,
                    reason: best ? 'below_confidence' : 'no_signal',
                    candidates: batch.length,
                };
            }

            if (!Number.isFinite(best.safeStreak) || best.safeStreak < 1) {
                return {
                    symbol: best.symbol,
                    contractType: null,
                    prediction: null,
                    confidence: best.confidence,
                    reason: 'not_immediate',
                    candidates: batch.length,
                };
            }

            return {
                symbol: best.symbol,
                contractType: best.contractType,
                prediction: best.prediction,
                confidence: best.confidence,
                winRate: best.winRate,
                edge: best.edge,
                safeStreak: best.safeStreak,
                reason: 'selected',
                candidates: batch.length,
            };
        }
    };
