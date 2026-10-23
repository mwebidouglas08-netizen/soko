import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.even_odd_analysis = {
    init() {
        this.jsonInit(this.definition());
        this.setInputsInline(true);

        const n_input = this.getInput('N');
        if (n_input && !n_input.connection.targetBlock()) {
            const shadow_block = this.workspace.newBlock('math_number');
            shadow_block.setShadow(true);
            shadow_block.setFieldValue('1000', 'NUM');
            shadow_block.outputConnection.connect(n_input.connection);
        }
    },
    definition() {
        return {
            message0: localize('%1 of last %2 digits'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'ANALYSIS_TYPE',
                    options: [
                        [localize('Even %'), 'EVEN_PERCENTAGE'],
                        [localize('Odd %'), 'ODD_PERCENTAGE'],
                    ],
                },
                { type: 'input_value', name: 'N', check: 'Number' },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Analyzes percentage of even or odd digits in last N ticks'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Even/Odd %'),
            description: localize('Returns percentage of even or odd digits from last N ticks'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.even_odd_analysis = block => {
    const generator = window.Blockly.JavaScript.javascriptGenerator;
    const analysis_type = block.getFieldValue('ANALYSIS_TYPE');
    const n_code = generator.valueToCode(block, 'N', generator.ORDER_ATOMIC) || '1000';

    const function_name = generator.provideFunction_('analyzeEvenOdd', [
        `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(digits, type) {
  try {
    if (!digits || !digits.length) {
      Bot.notify("No digits available for analysis", "error");
      return 0;
    }

    var even_count = 0;
    for (var i = 0; i < digits.length; i++) {
      if (digits[i] % 2 === 0) even_count++;
    }

    var even_pct = Math.round((even_count/digits.length)*10000)/100;
    var odd_pct = Math.round(10000 - (even_pct*100))/100;

    Bot.notify({
      message: "Even \u{1F7E2}: " + even_pct + "%  ||  " +
               "Odd \u{1F534}: " + odd_pct + "%\\n\\n" +
               "Based on last " + digits.length + " ticks",
      className: "journal__text--information",
      sound: "silent"
    });

    return type === "EVEN_PERCENTAGE" ? even_pct : odd_pct;
  } catch(e) {
    console.error("Even/Odd analysis error:", e);
    return 0;
  }
}`,
    ]);

    return [
        `${function_name}(Bot.getLastDigitList().slice(-${n_code}), "${analysis_type}")`,
        generator.ORDER_FUNCTION_CALL,
    ];
};

window.Blockly.Blocks.over_under_analysis = {
    init() {
        this.jsonInit(this.definition());
        this.setInputsInline(true);

        const digit_input = this.getInput('DIGIT');
        if (digit_input && !digit_input.connection.targetBlock()) {
            const shadow_block = this.workspace.newBlock('math_number');
            shadow_block.setShadow(true);
            shadow_block.setFieldValue('4', 'NUM');
            shadow_block.outputConnection.connect(digit_input.connection);
        }

        const n_input = this.getInput('N');
        if (n_input && !n_input.connection.targetBlock()) {
            const shadow_block = this.workspace.newBlock('math_number');
            shadow_block.setShadow(true);
            shadow_block.setFieldValue('1000', 'NUM');
            shadow_block.outputConnection.connect(n_input.connection);
        }
    },
    definition() {
        return {
            message0: localize('%1 %2 % in last %3 ticks'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'CONDITION_TYPE',
                    options: [
                        [localize('Over'), 'OVER'],
                        [localize('Under'), 'UNDER'],
                    ],
                },
                { type: 'input_value', name: 'DIGIT', check: 'Number' },
                { type: 'input_value', name: 'N', check: 'Number' },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Analyzes percentage of digits above/below specified value in last N ticks'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Over/Under Analysis'),
            description: localize('Returns percentage of digits above/below specified threshold from last N ticks'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.over_under_analysis = block => {
    const generator = window.Blockly.JavaScript.javascriptGenerator;
    const condition_type = block.getFieldValue('CONDITION_TYPE');
    const digit_code = generator.valueToCode(block, 'DIGIT', generator.ORDER_ATOMIC) || '4';
    const n_code = generator.valueToCode(block, 'N', generator.ORDER_ATOMIC) || '1000';

    const function_name = generator.provideFunction_('analyzeOverUnder', [
        `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(digits, condition, compareDigit) {
  try {
    if (!digits || !digits.length) {
      Bot.notify("No digits available for analysis", "error");
      return 0;
    }

    var over_count = 0;
    var under_count = 0;
    compareDigit = parseInt(compareDigit, 10);

    for (var i = 0; i < digits.length; i++) {
      if (digits[i] > compareDigit) over_count++;
      else under_count++;
    }

    var total = digits.length;
    var over_pct = Math.round((over_count/total)*10000)/100;
    var under_pct = Math.round((under_count/total)*10000)/100;

    Bot.notify({
      message: "Over \u{1F7E2}: " + over_pct + "%\\n" +
               "Under \u{1F534}: " + under_pct + "%\\n\\n" +
               "Based on last " + total + " digits",
      className: "journal__text--information",
      sound: "silent"
    });

    return condition === "OVER" ? over_pct : under_pct;
  } catch(e) {
    console.error("Over/Under analysis error:", e);
    return 0;
  }
}`,
    ]);

    return [
        `${function_name}(Bot.getLastDigitList().slice(-${n_code}), "${condition_type}", ${digit_code})`,
        generator.ORDER_FUNCTION_CALL,
    ];
};

window.Blockly.Blocks.digit_frequency_analysis = {
    init() {
        this.jsonInit(this.definition());
        this.setInputsInline(true);

        const n_input = this.getInput('N');
        if (n_input && !n_input.connection.targetBlock()) {
            const shadow_block = this.workspace.newBlock('math_number');
            shadow_block.setShadow(true);
            shadow_block.setFieldValue('1000', 'NUM');
            shadow_block.outputConnection.connect(n_input.connection);
        }
    },
    definition() {
        return {
            message0: localize('%1 digit from last %2 digits'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'ANALYSIS_TYPE',
                    options: [
                        [localize('Most frequent'), 'MOST_FREQUENT'],
                        [localize('Second most frequent'), 'SECOND_MOST_FREQUENT'],
                        [localize('Least frequent'), 'LEAST_FREQUENT'],
                        [localize('Second least frequent'), 'SECOND_LEAST_FREQUENT'],
                    ],
                },
                { type: 'input_value', name: 'N', check: 'Number' },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns frequency analysis of last N digits with percentage notification'),
            category: window.Blockly.Categories.Tick_Analysis,
            inputsInline: true,
        };
    },
    meta() {
        return {
            display_name: localize('Digit Frequency Analysis'),
            description: localize('Finds frequency patterns in last N digits and shows full ranking'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.digit_frequency_analysis = block => {
    const generator = window.Blockly.JavaScript.javascriptGenerator;
    const analysis_type = block.getFieldValue('ANALYSIS_TYPE');
    const n_code = generator.valueToCode(block, 'N', generator.ORDER_ATOMIC) || '1000';

    const function_name = generator.provideFunction_('analyzeDigitFrequency', [
        `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(digits, type) {
  try {
    if (!digits || !digits.length) {
      Bot.notify("No digits available for frequency analysis", "error");
      return 0;
    }

    // Safe sound playback function
    function playSafe(sound) {
      try {
        var audio = document.getElementById(sound);
        if (audio && audio.play) audio.play();
      } catch(e) { console.log("Could not play sound:", e); }
    }

    var total = digits.length;
    var frequency = [0,0,0,0,0,0,0,0,0,0];
    for (var i = 0; i < digits.length; i++) {
      var d = digits[i];
      if (d >= 0 && d <= 9) frequency[d]++;
    }

    // Create and sort digit data
    var digitData = [];
    for (var d = 0; d < 10; d++) {
      if (frequency[d] > 0) {
        digitData.push({
          digit: d,
          percentage: Math.round((frequency[d]/total)*10000)/100
        });
      }
    }

    // Bubble sort by percentage
    for (var i = 0; i < digitData.length-1; i++) {
      for (var j = 0; j < digitData.length-i-1; j++) {
        if (digitData[j].percentage < digitData[j+1].percentage) {
          var temp = digitData[j];
          digitData[j] = digitData[j+1];
          digitData[j+1] = temp;
        }
      }
    }

    // Prepare notification
    var msg = "Most Appearing \u{1F7E2}>>> \\n";
    if (digitData.length > 0) msg += digitData[0].digit + " \u{1F449} " + digitData[0].percentage + "%  ||  \\n";
    if (digitData.length > 1) msg += "2nd Most Appearing \u{1F535}>>> " + digitData[1].digit + " \u{1F449} " + digitData[1].percentage + "%  ||  \\n";
    msg += "\\nLeast Appearing \u{1F534}>>>  \\n";
    if (digitData.length > 0) msg += digitData[digitData.length-1].digit + " \u{1F449} " + digitData[digitData.length-1].percentage + "%\\n";
    if (digitData.length > 1) msg += "2nd Least Appearing \u{1F7E0}>>> " + digitData[digitData.length-2].digit + " \u{1F449} " + digitData[digitData.length-2].percentage + "%\\n";
    msg += "\\nBased on last " + total + " ticks";

    Bot.notify({
      message: msg,
      className: "journal__text--information",
      sound: "silent" // Changed to silent to prevent sound errors
    });

    // Return requested digit
    if (digitData.length === 0) return 0;
    switch(type) {
      case "MOST_FREQUENT": return digitData[0].digit;
      case "SECOND_MOST_FREQUENT": return digitData.length > 1 ? digitData[1].digit : digitData[0].digit;
      case "LEAST_FREQUENT": return digitData[digitData.length-1].digit;
      case "SECOND_LEAST_FREQUENT": return digitData.length > 1 ? digitData[digitData.length-2].digit : digitData[0].digit;
      default: return 0;
    }
  } catch(e) {
    console.error("Digit analysis error:", e);
    return 0;
  }
}`,
    ]);

    return [
        `${function_name}(Bot.getLastDigitList().slice(-${n_code}), "${analysis_type}")`,
        generator.ORDER_FUNCTION_CALL,
    ];
};
