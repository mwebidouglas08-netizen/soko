import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.nth_last_digit = {
    init() {
        this.jsonInit(this.definition());
        this.setInputsInline(true);

        const n_input = this.getInput('N');
        if (n_input && !n_input.connection.targetBlock()) {
            const shadow_block = this.workspace.newBlock('math_number');
            shadow_block.setShadow(true);
            shadow_block.setFieldValue('1', 'NUM');
            shadow_block.outputConnection.connect(n_input.connection);
        }
    },
    definition() {
        return {
            message0: localize('Nth last digit'),
            args0: [
                { type: 'input_value', name: 'N', check: 'Number' },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns the Nth last digit from the recent tick digit list'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Nth Last Digit'),
            description: localize('Returns the Nth last digit from the list of recent tick digits.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.nth_last_digit = block => {
    const generator = window.Blockly.JavaScript.javascriptGenerator;
    const n_code = generator.valueToCode(block, 'N', generator.ORDER_ATOMIC) || '1';

    const function_name = generator.provideFunction_('getNthLastDigit', [
        `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(n) {
  try {
    const digits = Bot.getLastDigitList ? Bot.getLastDigitList() : [];
    if (!digits || digits.length === 0) {
      Bot.notify(\"No digit list available\", \"error\");
      return 0;
    }
    const idx = Math.max(0, Math.min(parseInt(n, 10) - 1, digits.length - 1));
    return digits[digits.length - 1 - idx] ?? 0;
  } catch(e) {
    console.error(\"Nth last digit error:\", e);
    return 0;
  }
}`,
    ]);

    return [
        `${function_name}(${n_code})`,
        generator.ORDER_FUNCTION_CALL,
    ];
};

// Register lastNDigitsList as an alias for lastDigitList so XML strategies
// referencing either name work correctly.
window.Blockly.Blocks.lastNDigitsList = window.Blockly.Blocks.lastDigitList;
window.Blockly.JavaScript.javascriptGenerator.forBlock.lastNDigitsList =
    window.Blockly.JavaScript.javascriptGenerator.forBlock.lastDigitList;
