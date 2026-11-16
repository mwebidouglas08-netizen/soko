import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.maziwa_scan_signal = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Maziwa scan (min confidence %1)'),
            args0: [
                {
                    type: 'input_value',
                    name: 'MIN_CONFIDENCE',
                    check: 'Number',
                },
            ],
            message1: localize('window %1 max markets %2'),
            args1: [
                {
                    type: 'input_value',
                    name: 'WINDOW',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'MAX_SYMBOLS',
                    check: 'Number',
                },
            ],
            output: 'Array',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize(
                'Scans open volatility markets and returns [symbol, direction(4=Over,5=Under), prediction, confidence]. Returns empty list when no selective signal is found.'
            ),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Maziwa scan best signal'),
            description: localize('Finds the strongest selective Over/Under opportunity across volatility markets.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.maziwa_scan_signal = block => {
    const g = window.Blockly.JavaScript.javascriptGenerator;
    const minConfidence = g.valueToCode(block, 'MIN_CONFIDENCE', g.ORDER_ATOMIC) || '72';
    const windowSize = g.valueToCode(block, 'WINDOW', g.ORDER_ATOMIC) || '20';
    const maxSymbols = g.valueToCode(block, 'MAX_SYMBOLS', g.ORDER_ATOMIC) || '12';
    const code =
        '(function(){' +
        'var _r=Bot.scanBestVolatilitySignal({minConfidence:' + minConfidence + ',windowSize:' + windowSize + ',maxSymbols:' + maxSymbols + ',overBarrier:2,underBarrier:8});' +
        'if(_r&&_r.contractType){' +
        'return [String((_r&&_r.symbol)||\'\'),((_r&&_r.contractType)===\'DIGITOVER\'?4:5),Number((_r&&_r.prediction)||0),Number((_r&&_r.confidence)||0)];' +
        '}' +
        'return [];})()';
    return [code, g.ORDER_FUNCTION_CALL];
};

window.Blockly.Blocks.maziwa_set_symbol = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Maziwa set market %1'),
            args0: [
                {
                    type: 'input_value',
                    name: 'SYMBOL',
                    check: 'String',
                },
            ],
            previousStatement: null,
            nextStatement: null,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Switches the active trading symbol (used for multi-market rotation).'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Maziwa set market'),
            description: localize('Sets the active market symbol for scanning/rotation.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.maziwa_set_symbol = block => {
    const g = window.Blockly.JavaScript.javascriptGenerator;
    const symbol = g.valueToCode(block, 'SYMBOL', g.ORDER_ATOMIC) || "''";
    return 'if(' + symbol + '){Bot.setSymbol(' + symbol + ');}\n';
};
