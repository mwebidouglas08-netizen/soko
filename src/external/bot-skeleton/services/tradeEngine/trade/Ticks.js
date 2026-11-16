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
            const windowSize = Math.max(12, Math.min(80, Number(opts.windowSize) || 30));
            const minHistory = Math.max(15, Math.min(windowSize, Number(opts.minHistory) || 22));
            const baseMinConfidence = Number.isFinite(Number(opts.minConfidence)) ? Number(opts.minConfidence) : 82;
            const maxSymbols = Math.max(1, Math.min(60, Number(opts.maxSymbols) || 40));
            const lossStreak = Math.max(0, Number(opts.lossStreak) || 0);
            const totalProfit = Number.isFinite(Number(opts.totalProfit)) ? Number(opts.totalProfit) : 0;
            const recoverAmount = Math.max(0, Number(opts.recoverAmount) || 0);
            // Conscious risk controls: tighten entry quality during drawdown/recovery pressure and avoid forcing trades.
            let minConfidence = baseMinConfidence;
            if (recoverAmount > 0 || lossStreak > 0) minConfidence += Math.min(8, lossStreak * 2 + (recoverAmount > 0 ? 2 : 0));
            if (totalProfit < 0) minConfidence += Math.min(5, Math.ceil(Math.abs(totalProfit) / 5));
            minConfidence = Math.min(97, minConfidence);

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

            const startIdx = Number.isInteger(this._maziwaScanCursor) ? this._maziwaScanCursor : 0;
            const rotated = candidates.slice(startIdx).concat(candidates.slice(0, startIdx));
            const batch = rotated.slice(0, Math.min(maxSymbols, rotated.length));
            this._maziwaScanCursor = (startIdx + Math.max(1, batch.length)) % candidates.length;

            const tickSvc = this.$scope?.ticksService;
            const clamp01 = v => Math.max(0, Math.min(1, v));

            const evaluate = (digits, sym) => {
                if (!Array.isArray(digits) || digits.length < minHistory) return null;
                const recent = digits.slice(-windowSize).filter(d => Number.isFinite(d) && d >= 0 && d <= 9);
                if (recent.length < minHistory) return null;

                const n = recent.length;
                const last1 = recent[n - 1];
                const last2 = n >= 2 ? recent[n - 2] : null;
                const last3 = n >= 3 ? recent[n - 3] : null;

                const freq = Array(10).fill(0);
                const recentFreq = Array(10).fill(0);
                const wRecent = Math.min(12, n);
                for (let i = 0; i < n; i++) {
                    const w = 0.3 + 0.7 * ((i + 1) / n);
                    freq[recent[i]] += w;
                }
                for (let i = n - wRecent; i < n; i++) {
                    recentFreq[recent[i]] += 1;
                }
                const freqSum = freq.reduce((a, b) => a + b, 0) || 1;

                const trans = Array.from({ length: 10 }, () => Array(10).fill(0));
                const transRow = Array(10).fill(0);
                for (let i = 1; i < n; i++) {
                    const a = recent[i - 1];
                    const b = recent[i];
                    if (a >= 0 && a <= 9 && b >= 0 && b <= 9) {
                        trans[a][b] += 1;
                        transRow[a] += 1;
                    }
                }

                const probDigit = d => freq[d] / freqSum;
                const probNextGivenLast = d => {
                    if (last1 == null || transRow[last1] < 3) return probDigit(d);
                    const pCond = trans[last1][d] / transRow[last1];
                    return 0.65 * pCond + 0.35 * probDigit(d);
                };

                const candidatesDefs = [];
                for (let barrier = 0; barrier <= 8; barrier++) candidatesDefs.push({ type: 'DIGITOVER', barrier });
                for (let barrier = 1; barrier <= 9; barrier++) candidatesDefs.push({ type: 'DIGITUNDER', barrier });

                let best = null;
                for (const def of candidatesDefs) {
                    const isOver = def.type === 'DIGITOVER';
                    const barrier = def.barrier;
                    const isWin = d => (isOver ? d > barrier : d < barrier);
                    const isLoss = d => !isWin(d);
                    const winDigits = [];
                    for (let d = 0; d <= 9; d++) if (isWin(d)) winDigits.push(d);
                    if (winDigits.length === 0 || winDigits.length === 10) continue;

                    const theoretical = winDigits.length / 10;
                    if (!isWin(last1) || last2 == null || !isWin(last2)) continue;

                    let wins = 0;
                    let lossClusterRecent = 0;
                    const last6 = recent.slice(-6);
                    for (let i = 0; i < n; i++) if (isWin(recent[i])) wins++;
                    for (let i = 0; i < last6.length; i++) if (isLoss(last6[i])) lossClusterRecent++;
                    const winRate = wins / n;

                    let safeStreak = 0;
                    for (let i = n - 1; i >= 0; i--) {
                        if (isWin(recent[i])) safeStreak++;
                        else break;
                    }

                    let pNext = 0;
                    for (const d of winDigits) pNext += probNextGivenLast(d);
                    pNext = clamp01(pNext);

                    const shortWin = recentFreq.reduce((acc, c, d) => acc + (isWin(d) ? c : 0), 0) / wRecent;
                    const edge = winRate - theoretical;
                    const modelEdge = pNext - theoretical;

                    // trend/momentum (P&L-graph proxy): recent segment should not oppose candidate direction
                    const seg = Math.max(5, Math.floor(n / 2));
                    const older = recent.slice(0, seg);
                    const newer = recent.slice(seg);
                    const rate = arr => (arr.length ? arr.filter(isWin).length / arr.length : 0);
                    const olderRate = rate(older);
                    const newerRate = rate(newer);
                    const trendDelta = newerRate - olderRate;
                    const trendOk = newerRate + 0.02 >= olderRate && newerRate >= theoretical - 0.02;

                    // strict no-guess gates from live data
                    if (safeStreak < 2) continue;
                    if (lossClusterRecent >= 2) continue;
                    if (!trendOk) continue;
                    if (edge < 0.015) continue;
                    if (modelEdge < 0.05) continue;
                    if (pNext < theoretical + 0.05) continue;
                    if (winRate < theoretical + 0.015) continue;
                    if (shortWin < theoretical + 0.01) continue;
                    if (last3 != null && isLoss(last3) && safeStreak < 3) continue;

                    // payout/EV-conscious: theoretical = payout proxy; require positive expected value
                    const payoutFactor = 1 / Math.max(0.1, theoretical);
                    const ev = pNext * payoutFactor - 1;
                    if (ev < 0.06) continue;

                    if (theoretical <= 0.5 && (modelEdge < 0.06 || pNext < theoretical + 0.06 || ev < 0.09)) continue;
                    if (theoretical <= 0.4 && (modelEdge < 0.075 || safeStreak < 3 || ev < 0.13)) continue;
                    if (theoretical <= 0.3 && (modelEdge < 0.09 || safeStreak < 4 || ev < 0.18)) continue;
                    // during drawdown/recovery, avoid low-payout/high-variance entries
                    if ((recoverAmount > 0 || lossStreak > 0 || totalProfit < 0) && (theoretical <= 0.35 || ev < 0.12 || trendDelta < -0.01)) continue;

                    let score = 0;
                    score += Math.min(26, safeStreak * 5);
                    if (last3 != null && isWin(last3)) score += 8;
                    score += Math.max(0, Math.min(36, modelEdge * 135));
                    score += Math.max(0, Math.min(22, edge * 105));
                    score += Math.max(0, Math.min(16, (shortWin - theoretical) * 90));
                    score += Math.max(0, Math.min(20, ev * 42));
                    score += Math.max(-8, Math.min(10, trendDelta * 60));

                    const payoutBias = Math.max(0, (0.75 - theoretical)) * 18;
                    score += payoutBias * clamp01(0.45 + modelEdge * 4 + ev * 1.5);
                    // prefer safer/payout-conscious setups when under pressure
                    if (recoverAmount > 0 || lossStreak > 0 || totalProfit < 0) score -= Math.max(0, (0.4 - theoretical)) * 20;

                    const confidence = Math.max(0, Math.min(99, Math.round(46 + score)));
                    if (confidence < minConfidence) continue;

                    const candidate = {
                        symbol: sym,
                        contractType: def.type,
                        prediction: barrier,
                        confidence,
                        pNext,
                        winRate,
                        edge,
                        safeStreak,
                        theoretical,
                        ev,
                        trendDelta,
                    };

                    if (
                        !best ||
                        candidate.confidence > best.confidence ||
                        (candidate.confidence === best.confidence && candidate.ev > best.ev) ||
                        (candidate.confidence === best.confidence && candidate.ev === best.ev && candidate.pNext > best.pNext)
                    ) {
                        best = candidate;
                    }
                }
                return best;
            };

            const fetchDigits = async sym => {
                try {
                    let digits = [];
                    if (sym === this.symbol) {
                        digits = await this.getLastDigitList();
                    } else if (tickSvc && typeof tickSvc.request === 'function') {
                        const ticks = await tickSvc.request({ symbol: sym });
                        digits = this.getLastDigitsFromList(ticks || []);
                    }
                    return Array.isArray(digits) ? digits.filter(d => Number.isFinite(d)) : [];
                } catch (e) {
                    return [];
                }
            };

            const settled = await Promise.all(
                batch.map(async sym => {
                    try {
                        const digits = await fetchDigits(sym);
                        if (!digits || digits.length < minHistory) return null;
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
                    b.ev - a.ev ||
                    b.pNext - a.pNext ||
                    b.safeStreak - a.safeStreak ||
                    b.edge - a.edge
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

            try {
                if (typeof this.setSymbol === 'function') {
                    await this.setSymbol(best.symbol);
                } else if (best.symbol && best.symbol !== this.symbol) {
                    this.symbol = best.symbol;
                    if (this.options) this.options.symbol = best.symbol;
                    if (this.tradeOptions) this.tradeOptions.symbol = best.symbol;
                    await this.watchTicks(best.symbol);
                }
            } catch (e) {
                return {
                    symbol: best.symbol,
                    contractType: null,
                    prediction: null,
                    confidence: 0,
                    reason: 'symbol_switch_failed',
                    candidates: batch.length,
                };
            }

            return {
                symbol: best.symbol,
                contractType: best.contractType,
                prediction: best.prediction,
                confidence: best.confidence,
                pNext: best.pNext,
                winRate: best.winRate,
                edge: best.edge,
                safeStreak: best.safeStreak,
                ev: best.ev,
                reason: 'selected',
                candidates: batch.length,
            };
        }
    };
