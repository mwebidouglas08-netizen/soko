import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.last_digits_condition = {
    init() {
        this.jsonInit(this.definition());
        this.setInputsInline(true);

        const n_input = this.getInput('N');
        if (n_input && !n_input.connection.targetBlock()) {
            const shadow_block = this.workspace.newBlock('math_number');
            shadow_block.setShadow(true);
            shadow_block.setFieldValue('3', 'NUM');
            shadow_block.outputConnection.connect(n_input.connection);
        }

        this.getField('CONDITION').setValidator(value => {
            this.updateShape_(value);
            return value;
        });
        this.updateShape_(this.getFieldValue('CONDITION'));
    },
    updateShape_(condition) {
        if (!['ALL_EVEN', 'ALL_ODD', 'ALL_SAME'].includes(condition)) {
            if (!this.getInput('COMPARE_VALUE')) {
                this.appendValueInput('COMPARE_VALUE').setCheck('Number').appendField(localize('digit'));

                const compare_input = this.getInput('COMPARE_VALUE');
                if (compare_input.connection && !compare_input.connection.targetBlock()) {
                    const shadow_block = this.workspace.newBlock('math_number');
                    shadow_block.setShadow(true);
                    shadow_block.setFieldValue('4', 'NUM');
                    shadow_block.outputConnection.connect(compare_input.connection);
                }
            }
        } else if (this.getInput('COMPARE_VALUE')) {
            this.removeInput('COMPARE_VALUE');
        }
    },
    definition() {
        return {
            message0: localize('Last %1 digits are %2'),
            args0: [
                { type: 'input_value', name: 'N', check: 'Number' },
                {
                    type: 'field_dropdown',
                    name: 'CONDITION',
                    options: [
                        [localize('all even'), 'ALL_EVEN'],
                        [localize('all odd'), 'ALL_ODD'],
                        [localize('all same'), 'ALL_SAME'],
                        [localize('less than'), 'LESS_THAN'],
                        [localize('greater than'), 'GREATER_THAN'],
                        [localize('less than or equal to'), 'LESS_OR_EQUAL'],
                        [localize('greater than or equal to'), 'GREATER_OR_EQUAL'],
                    ],
                },
            ],
            output: 'Boolean',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Checks conditions on last N digits of tick values'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    saveExtraState() {
        return { condition: this.getFieldValue('CONDITION') };
    },
    loadExtraState(state) {
        this.setFieldValue(state.condition, 'CONDITION');
        this.updateShape_(state.condition);
    },
    meta() {
        return {
            display_name: localize('Last Digits Condition'),
            description: localize('Checks if last N digits meet specified condition'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.last_digits_condition = block => {
    const generator = window.Blockly.JavaScript.javascriptGenerator;
    const n_code = generator.valueToCode(block, 'N', generator.ORDER_ATOMIC) || '5';
    const condition = block.getFieldValue('CONDITION');
    let compare_value = '4';

    if (block.getInput('COMPARE_VALUE')) {
        compare_value = generator.valueToCode(block, 'COMPARE_VALUE', generator.ORDER_ATOMIC) || '4';
    }

    const function_name = generator.provideFunction_('checkLastDigitsConditionWithNotify', [
        `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(n, condition, compare_value) {var result = Bot.checkLastDigitsCondition(n, condition, compare_value);var condition_text = "";var digits = Bot.getLastDigitList().slice(-n);switch (condition) {case "ALL_EVEN": condition_text = "all even"; break;case "ALL_ODD": condition_text = "all odd"; break;case "ALL_SAME": condition_text = "all same (" + (digits.length > 0 ? digits[0] : "?") + ")"; break;case "LESS_THAN": condition_text = "less than " + compare_value; break;case "GREATER_THAN": condition_text = "greater than " + compare_value; break;case "LESS_OR_EQUAL": condition_text = "less than or equal to " + compare_value; break;case "GREATER_OR_EQUAL": condition_text = "greater than or equal to " + compare_value; break;}var market = "N/A";try {if (typeof config_v1 !== "undefined" && config_v1.other_symbol && config_v1.other_symbol.isActive && config_v1.other_symbol.symbol) {market = config_v1.other_symbol.symbol;} else if (typeof Bot !== "undefined" && Bot.getSymbol) {market = Bot.getSymbol();}} catch (e) { market = "N/A"; }Bot.notify({message: "Last Digits Analysis\\n" +"Market: " + market + "\\n" +"Condition: " + condition_text + "\\n" +"Digits: [" + digits.join(", ") + "]\\n" +"Result: " + (result ? "\u2705 TRUE" : "\u274C FALSE"),className: "journal__text--" + (result ? "success" : "info"),sound: "silent"});return result;}`,
    ]);

    return [`${function_name}(${n_code}, '${condition}', ${compare_value})`, generator.ORDER_FUNCTION_CALL];
};
