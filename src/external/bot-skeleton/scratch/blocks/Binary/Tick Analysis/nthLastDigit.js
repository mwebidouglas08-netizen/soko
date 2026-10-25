import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.nthLastDigit = {
    init() {
        this.jsonInit(this.definition());
        this.setInputsInline(true);

        const n_input = this.getInput('N');
        if (n_input && !n_input.connection.targetBlock()) {
            const shadow_block = this.workspace.newBlock('math_number');
            shadow_block.setShadow(true);
            shadow_block.setFieldValue('2', 'NUM');
            shadow_block.outputConnection.connect(n_input.connection);
        }
    },
    definition() {
        return {
            message0: localize('Nth last digit %1'),
            args0: [{ type: 'input_value', name: 'N', check: 'Number' }],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns the Nth last digit of the recent tick values (1 = latest tick)'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Nth Last Digit'),
            description: localize('This block gives you the Nth last digit of the recent tick values.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.nthLastDigit = block => {
    const generator = window.Blockly.JavaScript.javascriptGenerator;
    const n_code = generator.valueToCode(block, 'N', generator.ORDER_ATOMIC) || '1';
    return [`Bot.getNthLastDigit(${n_code})`, generator.ORDER_FUNCTION_CALL];
};
