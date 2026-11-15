import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../utils';

window.Blockly.Blocks.math_arithmetic = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: '%1 %2 %3',
            args0: [
                {
                    type: 'input_value',
                    name: 'A',
                    check: 'Number',
                },
                {
                    type: 'field_dropdown',
                    name: 'OP',
                    options: [
                        ['+', 'ADD'],
                        ['-', 'MINUS'],
                        ['*', 'MULTIPLY'],
                        ['/', 'DIVIDE'],
                        ['^', 'POWER'],
                        ['min', 'MIN'],
                        ['max', 'MAX'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'B',
                    check: 'Number',
                },
            ],
            output: 'Number',
            inputsInline: true,
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('This block performs arithmetic operations between two numbers.'),
            category: window.Blockly.Categories.Mathematical,
        };
    },
    meta() {
        return {
            display_name: localize('Arithmetical operations'),
            description: localize('This block performs arithmetic operations between two numbers.'),
        };
    },
    getRequiredValueInputs() {
        return {
            A: null,
            B: null,
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.math_arithmetic = block => {
    const generator = window.Blockly.JavaScript.javascriptGenerator;
    const operators = {
        ADD: ['+', generator.ORDER_ADDITION],
        MINUS: ['-', generator.ORDER_SUBTRACTION],
        MULTIPLY: ['*', generator.ORDER_MULTIPLICATION],
        DIVIDE: ['/', generator.ORDER_DIVISION],
        POWER: [null, generator.ORDER_COMMA],
        MIN: [null, generator.ORDER_FUNCTION_CALL],
        MAX: [null, generator.ORDER_FUNCTION_CALL],
    };

    const op = block.getFieldValue('OP');
    const tuple = operators[op] || operators.ADD;
    const operator = tuple[0];
    const order = tuple[1];

    const argument0 = generator.valueToCode(block, 'A', order) || '0';
    const argument1 = generator.valueToCode(block, 'B', order) || '0';

    if (op === 'POWER') {
        return [`Math.pow(${argument0}, ${argument1})`, generator.ORDER_FUNCTION_CALL];
    }

    if (op === 'MIN') {
        return [`Math.min(${argument0}, ${argument1})`, generator.ORDER_FUNCTION_CALL];
    }

    if (op === 'MAX') {
        return [`Math.max(${argument0}, ${argument1})`, generator.ORDER_FUNCTION_CALL];
    }

    if (!operator) {
        return [`Math.pow(${argument0}, ${argument1})`, generator.ORDER_FUNCTION_CALL];
    }

    return [`${argument0} ${operator} ${argument1}`, order];
};
