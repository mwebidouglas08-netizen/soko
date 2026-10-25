import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.lastNDigitsList = {
    init() {
        this.jsonInit(this.definition());
        this.setInputsInline(true);

        const n_input = this.getInput('N');
        if (n_input && !n_input.connection.targetBlock()) {
            const shadow_block = this.workspace.newBlock('math_number');
            shadow_block.setShadow(true);
            shadow_block.setFieldValue('5', 'NUM');
            shadow_block.outputConnection.connect(n_input.connection);
        }
    },
    definition() {
        return {
            message0: localize('Last %1 digits list'),
            args0: [{ type: 'input_value', name: 'N', check: 'Number' }],
            output: 'Array',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns a list of the last N digits of the recent tick values'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Last N Digits List'),
            description: localize('This block gives you a list of the last N digits of the recent tick values.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.lastNDigitsList = block => {
    const generator = window.Blockly.JavaScript.javascriptGenerator;
    const n_code = generator.valueToCode(block, 'N', generator.ORDER_ATOMIC) || '5';
    return [`Bot.getLastDigitList().slice(-(${n_code}))`, generator.ORDER_FUNCTION_CALL];
};
