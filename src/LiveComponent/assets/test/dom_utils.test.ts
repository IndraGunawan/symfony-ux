import {
    getValueFromInput,
    cloneHTMLElement,
    htmlToElement,
    getModelDirectiveFromInput,
    elementBelongsToThisController,
    getElementAsTagText
} from '../src/dom_utils';
import ValueStore from '../src/ValueStore';
import {LiveController} from "../src/live_controller";

const createStore = function(data: any = {}): ValueStore {
    return new ValueStore({
        dataValue: data,
        childComponentControllers: [],
        element: document.createElement('div'),
    });
}

describe('getValueFromInput', () => {
    it('Correctly adds data from checked checkbox', () => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = true;
        input.dataset.model = 'foo';
        input.value = 'the_checkbox_value';

        expect(getValueFromInput(input, createStore()))
            .toEqual('the_checkbox_value');

        expect(getValueFromInput(input, createStore({ foo: [] })))
            .toEqual(['the_checkbox_value']);

        expect(getValueFromInput(input, createStore({ foo: ['bar'] })))
            .toEqual(['bar', 'the_checkbox_value']);
    });

    it('Correctly removes data from unchecked checkbox', () => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = false;
        input.dataset.model = 'foo';
        input.value = 'the_checkbox_value';

        expect(getValueFromInput(input, createStore()))
            .toEqual(null);
        expect(getValueFromInput(input, createStore({ foo: ['the_checkbox_value'] })))
            .toEqual([]);
        // unchecked value already was not in store
        expect(getValueFromInput(input, createStore({ foo: ['bar'] })))
            .toEqual(['bar']);
        expect(getValueFromInput(input, createStore({ foo: ['bar', 'the_checkbox_value'] })))
            .toEqual(['bar']);
    })

    it('Correctly sets data from select multiple', () => {
        const select = document.createElement('select');
        select.multiple = true;
        select.name = 'foo'

        const fooOption = document.createElement('option');
        fooOption.value = 'foo';
        select.add(fooOption);
        const barOption = document.createElement('option');
        barOption.value = 'bar';
        select.add(barOption);

        // nothing selected
        expect(getValueFromInput(select, createStore()))
            .toEqual([]);

        fooOption.selected = true;
        expect(getValueFromInput(select, createStore()))
            .toEqual(['foo']);

        barOption.selected = true;
        expect(getValueFromInput(select, createStore()))
            .toEqual(['foo', 'bar']);
    })

    it('Grabs data-value attribute for other elements', () => {
        const div = document.createElement('div');
        div.dataset.value = 'the_value';

        expect(getValueFromInput(div, createStore()))
            .toEqual('the_value');
    });

    it('Grabs value attribute for other elements', () => {
        const div = document.createElement('div');
        div.setAttribute('value', 'the_value_from_attribute');

        expect(getValueFromInput(div, createStore()))
            .toEqual('the_value_from_attribute');
    });
});

describe('getModelDirectiveFromInput', () => {
    it('reads data-model correctly', () => {
        const element = htmlToElement('<input data-model="firstName">');

        const directive = getModelDirectiveFromInput(element);
        expect(directive).not.toBeNull();
        expect(directive?.action).toBe('firstName');
    });

    it('reads data-model normalized name', () => {
        const element = htmlToElement('<input data-model="user[firstName]">');

        const directive = getModelDirectiveFromInput(element);
        expect(directive).not.toBeNull();
        expect(directive?.action).toBe('user.firstName');
    });

    it('reads name attribute if form[data-model] is present', () => {
        const formElement = htmlToElement('<form data-model="*"></form>');
        const element = htmlToElement('<input name="user[firstName]">');
        formElement.appendChild(element);

        const directive = getModelDirectiveFromInput(element);
        expect(directive).not.toBeNull();
        expect(directive?.action).toBe('user.firstName');
    });

    it('does NOT reads name attribute if form[data-model] is NOT present', () => {
        const formElement = htmlToElement('<form></form>');
        const element = htmlToElement('<input name="user[firstName]">');
        formElement.appendChild(element);

        const directive = getModelDirectiveFromInput(element, false);
        expect(directive).toBeNull();
    });

    it('throws error if no data-model found', () => {
        const element = htmlToElement('<input>');

        expect(() => { getModelDirectiveFromInput(element) }).toThrow('Cannot determine the model name');
    });
});

describe('elementBelongsToThisController', () => {
    const createController = (html: string, childComponentControllers: Array<LiveController> = []) => {
        return new class implements LiveController {
            dataValue = {};
            childComponentControllers = childComponentControllers;
            element = htmlToElement(html);
        }
    };

    it('returns false if element lives outside of controller', () => {
        const targetElement = htmlToElement('<input name="user[firstName]">');
        const controller = createController('<div></div>');

        expect(elementBelongsToThisController(targetElement, controller)).toBeFalsy();
    });

    it('returns true if element lives inside of controller', () => {
        const targetElement = htmlToElement('<input name="user[firstName]">');
        const controller = createController('<div></div>');
        controller.element.appendChild(targetElement);

        expect(elementBelongsToThisController(targetElement, controller)).toBeTruthy();
    });

    it('returns false if element lives inside of child controller', () => {
        const targetElement = htmlToElement('<input name="user[firstName]">');
        const childController = createController('<div class="child"></div>');
        childController.element.appendChild(targetElement);

        const controller = createController('<div class="parent"></div>', [childController]);
        controller.element.appendChild(childController.element);

        expect(elementBelongsToThisController(targetElement, childController)).toBeTruthy();
        expect(elementBelongsToThisController(targetElement, controller)).toBeFalsy();
    });

    it('returns false if element *is* a child controller element', () => {
        const childController = createController('<div class="child"></div>');

        const controller = createController('<div class="parent"></div>', [childController]);
        controller.element.appendChild(childController.element);

        expect(elementBelongsToThisController(childController.element, controller)).toBeFalsy();
    });
});

describe('getElementAsTagText', () => {
    it('returns self-closing tag correctly', () => {
        const element = htmlToElement('<input name="user[firstName]">');

        expect(getElementAsTagText(element)).toEqual('<input name="user[firstName]">')
    });

    it('returns tag text without the innerHTML', () => {
        const element = htmlToElement('<div class="foo">Name: <input name="user[firstName]"></div>');

        expect(getElementAsTagText(element)).toEqual('<div class="foo">')
    });
});

describe('htmlToElement', () => {
    it('allows to clone HTMLElement', () => {
        const element = htmlToElement('<div class="foo">bar</div>');
        expect(element).toBeInstanceOf(HTMLElement);
        expect(element.outerHTML).toEqual('<div class="foo">bar</div>');
    });
});

describe('cloneHTMLElement', () => {
    it('allows to clone HTMLElement', () => {
        const element = htmlToElement('<div class="foo"></div>');
        const clone = cloneHTMLElement(element);

        expect(clone.outerHTML).toEqual('<div class="foo"></div>');
    });
});
