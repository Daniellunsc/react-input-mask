/* global describe, it */

import React from 'react';
import ReactDOM from 'react-dom';
import TestUtils from 'react-dom/test-utils';
import { expect } from 'chai';
import Input from '../../src';
import defer from '../../src/utils/defer';

document.body.innerHTML = '<div id="container"></div>';
const container = document.getElementById('container');

const createInput = (component, cb) => {
  return () => {
    var input;

    ReactDOM.unmountComponentAtNode(container);

    component = React.cloneElement(component, {
      ref: (ref) => input = ref
    });

    return new Promise((resolve, reject) => {
      ReactDOM.render(component, container, () => {
        // IE can fail if executed synchronously
        setImmediate(() => {
          var inputNode = ReactDOM.findDOMNode(input);
          Promise.resolve(cb(input, inputNode))
            .then(() => {
              ReactDOM.unmountComponentAtNode(container);
              resolve();
            })
            .catch((err) => {
              ReactDOM.unmountComponentAtNode(container);
              reject(err);
            });
        });
      });
    });
  };
};

const setInputProps = (input, props) => {
  ReactDOM.render(React.createElement(Input, { ...input.props, ...props }), container);
};

const insertStringIntoInput = (input, str) => {
  var inputNode = ReactDOM.findDOMNode(input);
  var selection = input.getSelection();
  var { value } = inputNode;

  inputNode.value = value.slice(0, selection.start) + str + value.slice(selection.end);

  input.setCursorPos(selection.start + str.length);

  TestUtils.Simulate.change(inputNode);
};

const simulateInputKeyPress = insertStringIntoInput;
const simulateInputPaste = (input, str) => {
  var inputNode = ReactDOM.findDOMNode(input);

  TestUtils.Simulate.paste(inputNode);

  insertStringIntoInput(input, str);
};

describe('Input', () => {
  it('Init format', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="74953156454" />, (input, inputNode) => {
      expect(inputNode.value).to.equal('+7 (495) 315 64 54');
    }));

  it('Format unacceptable string', createInput(
    <Input mask="+7 (9a9) 999 99 99" defaultValue="749531b6454" />, (input, inputNode) => {
      expect(inputNode.value).to.equal('+7 (4b6) 454 __ __');
    }));

  it('Show placeholder on focus', createInput(
    <Input mask="+7 (*a9) 999 99 99" />, (input, inputNode) => {
      expect(inputNode.value).to.equal('');

      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      expect(inputNode.value).to.equal('+7 (___) ___ __ __');
    }));

  it('Clear input on blur', createInput(
    <Input mask="+7 (*a9) 999 99 99" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      expect(inputNode.value).to.equal('+7 (___) ___ __ __');

      inputNode.blur();
      TestUtils.Simulate.blur(inputNode);
      expect(inputNode.value).to.equal('');

      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      inputNode.value = '+7 (1__) ___ __ __';
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (1__) ___ __ __');

      inputNode.blur();
      TestUtils.Simulate.blur(inputNode);
      expect(inputNode.value).to.equal('+7 (1__) ___ __ __');
    }));

  it('Escaped characters', createInput(
    <Input mask="+4\9 99 9\99 99" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      

      inputNode.value = '+49 12 3';
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 12 39');
    }));

  it('alwaysShowMask', createInput(
    <Input mask="+7 (999) 999 99 99" alwaysShowMask />, (input, inputNode) => {
      expect(inputNode.value).to.equal('+7 (___) ___ __ __');

      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      expect(inputNode.value).to.equal('+7 (___) ___ __ __');

      inputNode.blur();
      TestUtils.Simulate.blur(inputNode);
      expect(inputNode.value).to.equal('+7 (___) ___ __ __');

      setInputProps(input, { alwaysShowMask: false });
      expect(inputNode.value).to.equal('');

      setInputProps(input, { alwaysShowMask: true });
      expect(inputNode.value).to.equal('+7 (___) ___ __ __');
    }));

  it('Focus cursor position', createInput(
    <Input mask="+7 (999) 999 99 99" value="+7" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      expect(input.getCursorPos()).to.equal(4);

      inputNode.blur();
      TestUtils.Simulate.blur(inputNode);

      setInputProps(input, { value: '+7 (___) ___ _1 __' });
      input.setCursorPos(2);
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      expect(input.getCursorPos()).to.equal(16);

      inputNode.blur();
      TestUtils.Simulate.blur(inputNode);

      setInputProps(input, { value: '+7 (___) ___ _1 _1' });
      input.setCursorPos(2);
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      expect(input.getCursorPos()).to.equal(2);
    }));

  it('onChange input', createInput(
    <Input mask="**** **** **** ****" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(0);
      inputNode.value = 'a' + inputNode.value;
      input.setCursorPos(1);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('a___ ____ ____ ____');
      expect(input.getCursorPos()).to.equal(1);

      input.setSelection(0, 19);
      inputNode.value = 'a';
      input.setCursorPos(1);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('a___ ____ ____ ____');
      expect(input.getCursorPos()).to.equal(1);

      inputNode.value = 'aaaaa___ ____ ____ ____';
      input.setSelection(1, 4);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('aaaa a___ ____ ____');
      expect(input.getCursorPos()).to.equal(6);

      inputNode.value = 'aaa a___ ____ ____';
      input.setCursorPos(3);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('aaa_ a___ ____ ____');

      inputNode.value = 'aaaaaa___ ____ ____';
      input.setCursorPos(6);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('aaaa aa__ ____ ____');

      inputNode.value = 'aaaaxa__ ____ ____';
      input.setCursorPos(5);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('aaaa xa__ ____ ____');
      expect(input.getCursorPos()).to.equal(6);
    }));

  it('onChange input without maskChar', createInput(
    <Input mask="**** **** **** ****" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      expect(inputNode.value).to.equal('');

      input.setCursorPos(0);
      inputNode.value = 'aaa';
      input.setCursorPos(3);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('aaa');
      expect(input.getCursorPos()).to.equal(3);

      inputNode.value = 'aaaaa';
      input.setCursorPos(5);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('aaaa a');
      expect(input.getCursorPos()).to.equal(6);

      inputNode.value = 'aaaa afgh ijkl mnop';
      input.setCursorPos(19);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('aaaa afgh ijkl mnop');
      expect(input.getCursorPos()).to.equal(19);

      inputNode.value = 'aaaa afgh ijkl mnopq';
      input.setCursorPos(20);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('aaaa afgh ijkl mnop');
      expect(input.getCursorPos()).to.equal(19);
    }));

  it('Characters input', createInput(
    <Input mask="+7 (*a9) 999 99 99" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(0);
      simulateInputKeyPress(input, '+');
      expect(inputNode.value).to.equal('+7 (___) ___ __ __');

      input.setCursorPos(0);
      simulateInputKeyPress(input, '7');
      expect(inputNode.value).to.equal('+7 (7__) ___ __ __');

      input.setCursorPos(0);
      simulateInputKeyPress(input, 'E');
      expect(inputNode.value).to.equal('+7 (E__) ___ __ __');

      simulateInputKeyPress(input, '6');
      expect(inputNode.value).to.equal('+7 (E__) ___ __ __');

      simulateInputKeyPress(input, 'x');
      expect(inputNode.value).to.equal('+7 (Ex_) ___ __ __');
    }));

  it('Characters input without maskChar', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="+7 (111) 123 45 6" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(4);
      simulateInputKeyPress(input, 'E');
      expect(inputNode.value).to.equal('+7 (111) 123 45 6');

      input.setSelection(4, 3);
      simulateInputKeyPress(input, '0');
      expect(inputNode.value).to.equal('+7 (012) 345 6');

      input.setCursorPos(14);
      simulateInputKeyPress(input, '7');
      simulateInputKeyPress(input, '8');
      simulateInputKeyPress(input, '9');
      simulateInputKeyPress(input, '4');
      expect(inputNode.value).to.equal('+7 (012) 345 67 89');

      inputNode.value = '+7 (';
      input.setCursorPos(4);
      TestUtils.Simulate.change(inputNode);
      input.setCursorPos(0);
      simulateInputKeyPress(input, '+');
      expect(inputNode.value).to.equal('+7 (');
    }));

  it('Characters input cursor position', createInput(
    <Input mask="(999)" defaultValue="11" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(3);
      simulateInputKeyPress(input, 'x');
      expect(input.getCursorPos()).to.equal(3);

      simulateInputKeyPress(input, '1');
      expect(input.getCursorPos()).to.equal(4);

      input.setSelection(0, 4);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      input.setCursorPos(2);
      simulateInputKeyPress(input, 'x');
      expect(input.getCursorPos()).to.equal(2);
    }));

  it('Backspace single character', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="74953156454" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(10);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (495) _15 64 54');

      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (49_) _15 64 54');
    }));

  it('Backspace single character without maskChar', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="74953156454" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(10);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (495) 156 45 4');

      inputNode.value = '+7 (';
      input.setCursorPos(4);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (');

      inputNode.value = '+7 ';
      input.setCursorPos(3);
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (');
    }));

  it('Backspace single character cursor position', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="74953156454" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(10);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(9);

      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(6);

      input.setCursorPos(4);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(4);
    }));

  it('Backspace single character cursor position without maskChar', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="749531564" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(16);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(14);
    }));

  it('Backspace range', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="74953156454" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setSelection(1, 9);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (___) _15 64 54');
    }));

  it('Backspace range cursor position', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="74953156454" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setSelection(1, 9);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(1);
    }));

  it('Backspace single character with escaped characters without maskChar', createInput(
    <Input mask="+4\9 99 9\99 99" defaultValue="+49 12 394" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(10);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 12 39');

      input.setCursorPos(9);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 12 ');

      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      inputNode.value = '+49 12 39';
      TestUtils.Simulate.change(inputNode);
      input.setCursorPos(6);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 13 ');
    }));

  it('Backspace single character with escaped characters without maskChar cursor position', createInput(
    <Input mask="+4\9 99 9\99 99" defaultValue="+49 12 394" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(10);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(9);

      input.setCursorPos(9);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(7);

      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      inputNode.value = '+49 12 39';
      TestUtils.Simulate.change(inputNode);
      input.setCursorPos(6);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(5);
    }));

  it('Backspace range with escaped characters without maskChar', createInput(
    <Input mask="+4\9 99 9\99 99" defaultValue="+49 12 394" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setSelection(4, 2);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 34 ');

      inputNode.value = '+49 12 394 5';
      TestUtils.Simulate.change(inputNode);
      input.setSelection(4, 2);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 34 59');
    }));

    it('Backspace range with escaped characters without maskChar cursor position', createInput(
      <Input mask="+4\9 99 9\99 99" defaultValue="+49 12 394" maskChar={null} />, (input, inputNode) => {
        inputNode.focus();
        TestUtils.Simulate.focus(inputNode);
  
        input.setSelection(4, 2);
        TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
        TestUtils.Simulate.change(inputNode);
        expect(input.getCursorPos()).to.equal(4);
  
        inputNode.value = '+49 12 394 5';
        TestUtils.Simulate.change(inputNode);
        input.setSelection(4, 2);
        TestUtils.Simulate.keyDown(inputNode, { key: 'Backspace' });
        TestUtils.Simulate.change(inputNode);
        expect(input.getCursorPos()).to.equal(4);
      }));

  it('Delete single character', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="74953156454" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(0);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (495) 315 64 54');

      input.setCursorPos(7);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (495) _15 64 54');

      input.setCursorPos(11);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (495) _1_ 64 54');
    }));

  it('Delete single character cursor position', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="74953156454" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(0);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(4);

      input.setCursorPos(7);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(9);

      input.setCursorPos(11);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(11);
    }));

  it('Delete range', createInput(
    <Input mask="+7 (999) 999 99 99" defaultValue="74953156454" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setSelection(1, 9);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+7 (___) _15 64 54');
    }));

  it('Delete single character with escaped characters without maskChar', createInput(
    <Input mask="+4\9 99 9\99 99" defaultValue="+49 12 394" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(9);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 12 39');

      input.setCursorPos(7);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 12 ');

      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      inputNode.value = '+49 12 39';
      TestUtils.Simulate.change(inputNode);
      input.setCursorPos(5);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 13 ');
    }));

  it('Delete single character with escaped characters without maskChar cursor position', createInput(
    <Input mask="+4\9 99 9\99 99" defaultValue="+49 12 394" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setCursorPos(9);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(9);

      input.setCursorPos(7);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(7);

      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);
      inputNode.value = '+49 12 39';
      TestUtils.Simulate.change(inputNode);
      input.setCursorPos(5);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(5);
    }));

  it('Delete range with escaped characters without maskChar', createInput(
    <Input mask="+4\9 99 9\99 99" defaultValue="+49 12 394" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setSelection(4, 2);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 34 ');

      inputNode.value = '+49 12 394 5';
      TestUtils.Simulate.change(inputNode);
      input.setSelection(4, 2);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(inputNode.value).to.equal('+49 34 59');
    }));

  it('Delete range with escaped characters without maskChar cursor position', createInput(
    <Input mask="+4\9 99 9\99 99" defaultValue="+49 12 394" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setSelection(4, 2);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(4);

      inputNode.value = '+49 12 394 5';
      TestUtils.Simulate.change(inputNode);
      input.setSelection(4, 2);
      TestUtils.Simulate.keyDown(inputNode, { key: 'Delete' });
      TestUtils.Simulate.change(inputNode);
      expect(input.getCursorPos()).to.equal(4);
    }));

  it('Mask change', createInput(
    <Input mask="9999-9999-9999-9999" defaultValue="34781226917" />, (input, inputNode) => {
      setInputProps(input, { mask: '9999-999999-99999' });
      expect(inputNode.value).to.equal('3478-122691-7____');

      setInputProps(input, { mask: '9-9-9-9' });
      expect(inputNode.value).to.equal('3-4-7-8');

      setInputProps(input, { mask: null });
      expect(inputNode.value).to.equal('3-4-7-8');

      inputNode.value = '0-1-2-3';

      setInputProps(input, { mask: '9999' });
      expect(inputNode.value).to.equal('0123');
    }));

  it('Mask change with value prop', createInput(
    <Input mask="9999-9999-9999-9999" value="38781226917" />, (input, inputNode) => {
      setInputProps(input, {
        onChange: () => {
          setInputProps(input, {
            mask: '9999-999999-99999',
            value: '3478-1226-917_-____'
          });
        }
      });

      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      expect(inputNode.value).to.equal('3878-1226-917_-____');

      input.setCursorPos(1);
      simulateInputKeyPress(input, '4');
      TestUtils.Simulate.change(inputNode);

      expect(inputNode.value).to.equal('3478-122691-7____');
    }));

  it('Paste string', createInput(
    <Input mask="9999-9999-9999-9999" defaultValue="____-____-____-6543" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setSelection(3, 15);
      simulateInputPaste(input, '34781226917');
      expect(inputNode.value).to.equal('___3-4781-2269-17_3');

      input.setCursorPos(3);
      simulateInputPaste(input, '3-__81-2_6917');
      expect(inputNode.value).to.equal('___3-__81-2_69-17_3');

      input.setSelection(0, 3);
      simulateInputPaste(input, ' 333');
      expect(inputNode.value).to.equal('3333-__81-2_69-17_3');
    }));

  it('Paste cursor position', createInput(
    <Input mask="9999-9999-9999-9999" defaultValue="____-____-____-6543" />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setSelection(3, 15);
      simulateInputPaste(input, '478122691');
      expect(input.getCursorPos()).to.equal(15);

      input.setCursorPos(3);
      simulateInputPaste(input, '3-__81-2_6917');
      expect(input.getCursorPos()).to.equal(17);
    }));

  it('Paste string without maskChar', createInput(
    <Input mask="9999-9999-9999-9999" defaultValue="9999-9999-9999-9999" maskChar={null} />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      input.setSelection(0, 19);
      simulateInputPaste(input, '34781226917');
      expect(inputNode.value).to.equal('3478-1226-917');

      input.setCursorPos(1);
      simulateInputPaste(input, '12345');
      expect(inputNode.value).to.equal('3123-4547-8122-6917');

      input.setCursorPos(1);
      simulateInputPaste(input, '4321');
      expect(inputNode.value).to.equal('3432-1547-8122-6917');

      setInputProps(input, {
        value: '',
        onChange: (event) => {
          setInputProps(input, {
            value: event.target.value
          });
        }
      });

      simulateInputPaste(input, '123');
      expect(inputNode.value).to.equal('123');
    }));

  it('Paste string with maskChar at place of permanent char', createInput(
    <Input mask="9999-9999-9999" maskChar=" " />, (input, inputNode) => {
      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      simulateInputPaste(input, '1111 1111 1111');
      expect(inputNode.value).to.equal('1111-1111-1111');
    }));

  it('Custom rules', createInput(
    <Input mask="11-11" defaultValue="1234" formatChars={{ '1': '[1-3]' }} />, (input, inputNode) => {
      expect(inputNode.value).to.equal('12-3_');
    }));

  it('Rerender alwaysShowMask with empty value', createInput(
    <Input mask="99-99" value="" alwaysShowMask />, (input, inputNode) => {
      setInputProps(input, { value: '' });

      expect(inputNode.value).to.equal('__-__');
    }));

  it('Null as formatChars', createInput(
    <Input mask="99-99" formatChars={null} alwaysShowMask />, (input, inputNode) => {
      expect(inputNode.value).to.equal('__-__');
    }));

  it('Show empty value if input switched from uncontrolled to controlled', createInput(
    <Input mask="+7 (*a9) 999 99 99" />, (input, inputNode) => {
      setInputProps(input, { value: '+7 (___) ___ __ __' });
      expect(inputNode.value).to.equal('+7 (___) ___ __ __');
    }));

  it('Does not affect value if mask is empty', createInput(
    <Input value="12345" />, (input, inputNode) => {
      expect(inputNode.value).to.equal('12345');

      setInputProps(input, {
        value: '54321'
      });
      expect(inputNode.value).to.equal('54321');
    }));

  it('Should show next permanent char when maskChar is null', createInput(
    <Input mask="99/99/9999" value="01" maskChar={null} />, (input, inputNode) => {
      expect(inputNode.value).to.equal('01/');
    }));

  it('Should show all next consecutive permanent char when maskChar is null', createInput(
    <Input mask="99---99" value="01" maskChar={null} />, (input, inputNode) => {
      expect(inputNode.value).to.equal('01---');
    }));

  it('Should show trailing permanent char when maskChar is null', createInput(
    <Input mask="99%" value="10" maskChar={null} />, (input, inputNode) => {
      expect(inputNode.value).to.equal('10%');
    }));

  it('Should pass input DOM node to inputRef function', () => {
    var inputRef;
    return createInput(
      <Input inputRef={ref => inputRef = ref} />, (input, inputNode) => {
        expect(inputRef).to.equal(inputNode);
      })();
  });

  it('Should modify value with beforeChange', createInput(
    <Input mask="99999-9999" maskChar={null} value="" />, (input, inputNode) => {
      setInputProps(input, {
        onChange: (event) => {
          setInputProps(input, {
            value: event.target.value
          });
        },
        beforeChange: (value, cursorPosition, userInput) => {
          if (value.endsWith('-') && userInput !== '-' && !input.props.value.endsWith('-')) {
            if (cursorPosition === value.length) {
              cursorPosition--;
            }
            value = value.slice(0, -1);
          }

          return {
            value,
            cursorPosition
          };
        }
      });

      inputNode.focus();
      TestUtils.Simulate.focus(inputNode);

      setInputProps(input, { value: '12345' });
      expect(inputNode.value).to.equal('12345');

      insertStringIntoInput(input, '-');
      expect(inputNode.value).to.equal('12345-');
    }));
});
