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
            const clamp01 = v => Math.max(0, Math.min(1, v));
            const safeNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

            const windowSize = Math.max(30, Math.min(120, Math.floor(safeNum(opts.windowSize, 50))));
            const minHistory = Math.max(25, Math.min(windowSize, Math.floor(safeNum(opts.minHistory, 35))));
            const baseMinConfidence = Math.min(99, Math.max(80, safeNum(opts.minConfidence, 90)));
            const maxSymbols = Math.max(1, Math.min(80, Math.floor(safeNum(opts.maxSymbols, 60))));
            const lossStreak = Math.max(0, Math.floor(safeNum(opts.lossStreak, 0)));
            const totalProfit = safeNum(opts.totalProfit, 0);
            const recoverAmount = Math.max(0, safeNum(opts.recoverAmount, 0));
            const inRecovery = recoverAmount > 0 || lossStreak > 0 || totalProfit < 0;

            let minConfidence = baseMinConfidence;
            if (inRecovery) minConfidence += Math.min(5, 2 + Math.min(lossStreak, 3));
            if (recoverAmount > 0) minConfidence += Math.min(2, Math.ceil(recoverAmount / 10));
            if (totalProfit < 0) minConfidence += Math.min(2, Math.ceil(Math.abs(totalProfit) / 50));
            minConfidence = Math.min(99, minConfidence);

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

            const evaluate = (digits, sym) => {
                if (!Array.isArray(digits) || digits.length < minHistory) return null;
                const recent = digits.slice(-windowSize).filter(d => Number.isInteger(d) && d >= 0 && d <= 9);
                if (recent.length < minHistory) return null;

                const n = recent.length;
                const last1 = recent[n - 1];
                const last2 = n >= 2 ? recent[n - 2] : null;
                const last3 = n >= 3 ? recent[n - 3] : null;
                const last4 = n >= 4 ? recent[n - 4] : null;
                const shortWindow = Math.min(15, n);
                const midWindow = Math.min(30, n);
                const shortSlice = recent.slice(-shortWindow);
                const midSlice = recent.slice(-midWindow);

                const freq = Array(10).fill(0);
                const shortFreq = Array(10).fill(0);
                const midFreq = Array(10).fill(0);
                for (let i = 0; i < n; i++) {
                    const recency = (i + 1) / n;
                    const w = 0.12 + 0.88 * Math.pow(recency, 1.45);
                    freq[recent[i]] += w;
                }
                for (let i = 0; i < shortSlice.length; i++) shortFreq[shortSlice[i]] += 1;
                for (let i = 0; i < midSlice.length; i++) midFreq[midSlice[i]] += 1;
                const freqSum = freq.reduce((a, b) => a + b, 0) || 1;
                const shortSum = shortSlice.length || 1;
                const midSum = midSlice.length || 1;

                let entropy = 0;
                for (let d = 0; d < 10; d++) {
                    const p = freq[d] / freqSum;
                    if (p > 0) entropy -= p * Math.log(p);
                }
                const entropyNorm = entropy / Math.log(10);
                if (entropyNorm > 0.985 && !inRecovery) return null;

                const trans = Array.from({ length: 10 }, () => Array(10).fill(0.4));
                const transRow = Array(10).fill(4);
                for (let i = 1; i < n; i++) {
                    const a = recent[i - 1];
                    const b = recent[i];
                    trans[a][b] += 1;
                    transRow[a] += 1;
                }

                const probDigit = d => freq[d] / freqSum;
                const probNextGivenLast = d => {
                    if (last1 == null) return probDigit(d);
                    const row = transRow[last1] || 1;
                    const pCond = trans[last1][d] / row;
                    const mix = row >= 10 ? 0.72 : row >= 6 ? 0.6 : 0.48;
                    return mix * pCond + (1 - mix) * probDigit(d);
                };

                let alternations = 0;
                for (let i = 1; i < n; i++) if (recent[i] !== recent[i - 1]) alternations++;
                const alternationRate = alternations / Math.max(1, n - 1);

                const defs = [];
                for (let barrier = 0; barrier <= 8; barrier++) defs.push({ type: 'DIGITOVER', barrier });
                for (let barrier = 1; barrier <= 9; barrier++) defs.push({ type: 'DIGITUNDER', barrier });

                let best = null;
                for (const def of defs) {
                    const isOver = def.type === 'DIGITOVER';
                    const barrier = def.barrier;
                    const isWin = d => (isOver ? d > barrier : d < barrier);
                    const winDigits = [];
                    for (let d = 0; d <= 9; d++) if (isWin(d)) winDigits.push(d);
                    if (!winDigits.length || winDigits.length === 10) continue;

                    const theoretical = winDigits.length / 10;
                    if (theoretical < 0.2 || theoretical > 0.85) continue;
                    if (!inRecovery && theoretical > 0.8) continue;
                    if (!isWin(last1) || !isWin(last2)) continue;
                    if (last3 != null && !isWin(last3) && !inRecovery) continue;

                    let wins = 0;
                    let shortWins = 0;
                    let midWins = 0;
                    let lossClusterRecent = 0;
                    const last6 = recent.slice(-6);
                    for (let i = 0; i < n; i++) if (isWin(recent[i])) wins++;
                    for (let i = 0; i < shortSlice.length; i++) if (isWin(shortSlice[i])) shortWins++;
                    for (let i = 0; i < midSlice.length; i++) if (isWin(midSlice[i])) midWins++;
                    for (let i = 0; i < last6.length; i++) if (!isWin(last6[i])) lossClusterRecent++;

                    const winRate = wins / n;
                    const shortRate = shortWins / shortSum;
                    const midRate = midWins / midSum;

                    let safeStreak = 0;
                    for (let i = n - 1; i >= 0; i--) {
                        if (isWin(recent[i])) safeStreak++;
                        else break;
                    }

                    let pNext = 0;
                    let pShort = 0;
                    for (const d of winDigits) {
                        pNext += probNextGivenLast(d);
                        pShort += shortFreq[d] / shortSum;
                    }
                    pNext = clamp01(pNext);
                    pShort = clamp01(pShort);
                    const pConsensus = clamp01(pNext * 0.65 + pShort * 0.2 + midRate * 0.15);

                    const edge = winRate - theoretical;
                    const modelEdge = pConsensus - theoretical;
                    const shortEdge = shortRate - theoretical;
                    const midEdge = midRate - theoretical;

                    const seg = Math.max(8, Math.floor(n / 2));
                    const older = recent.slice(0, seg);
                    const newer = recent.slice(seg);
                    const rate = arr => (arr.length ? arr.filter(isWin).length / arr.length : 0);
                    const olderRate = rate(older);
                    const newerRate = rate(newer);
                    const trendDelta = newerRate - olderRate;
                    const trendOk = newerRate + 0.015 >= olderRate && newerRate >= theoretical;

                    if (lossClusterRecent >= 2) continue;
                    if (!trendOk) continue;
                    if (trendDelta < -0.015) continue;
                    if (shortEdge < 0.04) continue;
                    if (midEdge < 0.03) continue;
                    if (edge < 0.035) continue;
                    if (modelEdge < 0.055) continue;
                    if (pConsensus < theoretical + 0.065) continue;
                    if (winRate < theoretical + 0.04) continue;
                    if (shortRate < theoretical + 0.03) continue;
                    if (safeStreak < 2) continue;
                    if (last4 != null && !isWin(last4) && safeStreak < 3 && !inRecovery) continue;
                    if (alternationRate > 0.93 && theoretical < 0.65) continue;

                    const payoutFactor = 1 / Math.max(0.2, theoretical);
                    const ev = pConsensus * payoutFactor - 1;
                    const breakEven = 1 / payoutFactor;
                    if (ev < 0.1) continue;
                    if (pConsensus < breakEven + 0.06) continue;

                    if (theoretical <= 0.6 && (ev < 0.12 || modelEdge < 0.065)) continue;
                    if (theoretical <= 0.5 && (ev < 0.14 || safeStreak < 3 || modelEdge < 0.075)) continue;
                    if (theoretical <= 0.4 && (ev < 0.17 || safeStreak < 3 || modelEdge < 0.085)) continue;
                    if (theoretical <= 0.3 && (ev < 0.2 || safeStreak < 4 || modelEdge < 0.095)) continue;

                    if (inRecovery) {
                        if (safeStreak < 3) continue;
                        if (ev < 0.14) continue;
                        if (modelEdge < 0.075) continue;
                        if (pConsensus < theoretical + 0.085) continue;
                        if (lossStreak >= 2 && (ev < 0.16 || safeStreak < 3)) continue;
                        if (lossStreak >= 3 && (ev < 0.18 || safeStreak < 4)) continue;
                    }

                    const windowAgreement = clamp01(1 - Math.abs(shortRate - midRate) * 2.2);
                    let score = 0;
                    score += Math.min(26, safeStreak * 5.5);
                    if (last3 != null && isWin(last3)) score += 6;
                    score += Math.max(0, Math.min(34, modelEdge * 115));
                    score += Math.max(0, Math.min(20, edge * 90));
                    score += Math.max(0, Math.min(16, shortEdge * 90));
                    score += Math.max(0, Math.min(24, ev * 42));
                    score += Math.max(-4, Math.min(10, trendDelta * 45));
                    score += windowAgreement * 10;
                    score += (1 - entropyNorm) * 8;
                    if (lossClusterRecent === 0) score += 4;

                    const payoutBias = Math.max(0, (0.78 - theoretical)) * 10;
                    score += payoutBias * clamp01(0.35 + modelEdge * 3 + ev * 1.3);

                    const confidence = Math.max(0, Math.min(99, Math.round(43 + score)));
                    if (confidence < minConfidence) continue;

                    const candidate = {
                        symbol: sym,
                        contractType: def.type,
                        prediction: barrier,
                        confidence,
                        pNext: pConsensus,
                        winRate,
                        edge,
                        safeStreak,
                        theoretical,
                        ev,
                        trendDelta,
                        shortRate,
                        midRate,
                        entropyNorm,
                    };

                    if (
                        !best ||
                        candidate.confidence > best.confidence ||
                        (candidate.confidence === best.confidence && candidate.ev > best.ev) ||
                        (candidate.confidence === best.confidence && candidate.ev === best.ev && candidate.pNext > best.pNext) ||
                        (candidate.confidence === best.confidence && candidate.ev === best.ev && candidate.pNext === best.pNext && candidate.safeStreak > best.safeStreak)
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
                    return Array.isArray(digits) ? digits.filter(d => Number.isInteger(d) && d >= 0 && d <= 9) : [];
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
                    scanned: batch.length,
                    inRecovery,
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
                    scanned: batch.length,
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
                theoretical: best.theoretical,
                ev: best.ev,
                trendDelta: best.trendDelta,
                inRecovery,
                reason: 'selected',
                candidates: batch.length,
                scanned: batch.length,
            };
        }
    };
