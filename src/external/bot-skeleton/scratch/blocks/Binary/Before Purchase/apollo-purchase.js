import { localize } from '@deriv-com/translations';
import { excludeOptionFromContextMenu, modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.apollo_purchase = window.Blockly.Blocks.purchase;

window.Blockly.JavaScript.javascriptGenerator.forBlock.apollo_purchase =
    window.Blockly.JavaScript.javascriptGenerator.forBlock.purchase;

window.Blockly.Blocks.apollo_purchase2 = {
    init() {
        this.jsonInit(this.definition());
        this.setNextStatement(false);
        this.updatePredictionVisibility_();
    },
    definition() {
        return {
            message0: localize('Purchase {{ contract_type }}', { contract_type: '%1' }),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'PURCHASE_LIST',
                    options: [
                        [localize('Rise'), 'CALL'],
                        [localize('Fall'), 'PUT'],
                        [localize('Even'), 'DIGITEVEN'],
                        [localize('Odd'), 'DIGITODD'],
                        [localize('Over'), 'DIGITOVER'],
                        [localize('Under'), 'DIGITUNDER'],
                        [localize('Matches'), 'DIGITMATCH'],
                        [localize('Differs'), 'DIGITDIFF'],
                    ],
                },
            ],
            message1: localize('Prediction: %1'),
            args1: [{ type: 'input_value', name: 'PREDICTION' }],
            previousStatement: null,
            colour: window.Blockly.Colours.Special1.colour,
            colourSecondary: window.Blockly.Colours.Special1.colourSecondary,
            colourTertiary: window.Blockly.Colours.Special1.colourTertiary,
            tooltip: localize('This block purchases contract of a specified type.'),
            category: window.Blockly.Categories.Before_Purchase,
        };
    },
    meta() {
        return {
            display_name: localize('Purchase'),
            description: localize(
                'Use this block to purchase the specific contract you want. You may add multiple Purchase blocks together with conditional blocks to define your purchase conditions. This block can only be used within the Purchase conditions block.'
            ),
            key_words: localize('buy'),
        };
    },
    onchange(event) {
        if (!this.workspace || window.Blockly.derivWorkspace.isFlyoutVisible || this.workspace.isDragging()) {
            return;
        }
        this.updatePredictionVisibility_(event);
    },
    updatePredictionVisibility_(event) {
        const is_prediction_needed = ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(
            this.getFieldValue('PURCHASE_LIST')
        );
        const prediction_input = this.getInput('PREDICTION');
        if (prediction_input) {
            prediction_input.setVisible(is_prediction_needed);
        }
        const is_purchase_type_change =
            event &&
            event.type === window.Blockly.Events.BLOCK_CHANGE &&
            event.blockId === this.id &&
            event.name === 'PURCHASE_LIST';
        if (is_prediction_needed && is_purchase_type_change) {
            this.ensurePredictionShadow_();
        }
        if (this.rendered) {
            this.render();
        }
    },
    ensurePredictionShadow_() {
        const prediction_input = this.getInput('PREDICTION');
        if (!prediction_input || !prediction_input.connection || prediction_input.connection.targetBlock()) {
            return;
        }
        const shadow_block = this.workspace.newBlock('math_number_positive');
        shadow_block.setShadow(true);
        shadow_block.setFieldValue(1, 'NUM');
        shadow_block.outputConnection.connect(prediction_input.connection);
        shadow_block.initSvg();
        shadow_block.render();
    },
    customContextMenu(menu) {
        const menu_items = [localize('Enable Block'), localize('Disable Block')];
        excludeOptionFromContextMenu(menu, menu_items);
        modifyContextMenu(menu);
    },
    restricted_parents: ['before_purchase'],
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.apollo_purchase2 = block => {
    const purchase_type = block.getFieldValue('PURCHASE_LIST');

    if (!['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(purchase_type)) {
        return `Bot.purchase('${purchase_type}');\n`;
    }

    const prediction =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'PREDICTION',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '1';

    return `Bot.purchase('${purchase_type}', ${prediction});\n`;
};
