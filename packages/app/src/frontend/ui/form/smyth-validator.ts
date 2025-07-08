// * "isAsyncFunction" allows custom validation using asynchronous functions. (Metro UI does not support asynchronous function.)

// Check if the function is async
const isAsyncFunction = (fn) => fn instanceof Function && fn.constructor.name === 'AsyncFunction';

// TODO: Extract the logic for setting valid/invalid classes into a separate function for better code modularity and maintainability.

const validateInputs = async (formElm: HTMLFormElement): Promise<boolean> => {
  const inputElms = formElm.querySelectorAll('[data-smyth-validate]') || [];
  let smythValidateRules = [];

  for (const input of inputElms) {
    const validateRules = input.getAttribute('data-smyth-validate').split(' ');
    for (const rule of validateRules) {
      if (/^func\=/.test(rule)) {
        const funcName = rule.split('=')[1];
        if (funcName) {
          const inputElement = input as HTMLInputElement;
          const formControl = inputElement.closest('.form-control');
          smythValidateRules.push({
            funcName: funcName,
            funcParams: [inputElement.value, inputElement],
            formControl,
          });
        }
      }
    }
  }

  let isValid = true;

  for (const funcObj of smythValidateRules) {
    const func = (<any>window)[funcObj.funcName];

    try {
      if (isAsyncFunction(func)) {
        isValid = await func(...funcObj.funcParams);
      } else {
        isValid = func(...funcObj.funcParams);
      }
    } catch (error) {
      return false;
    }

    if (!isValid) {
      funcObj.formControl?.classList?.remove('valid');
      funcObj.formControl?.classList?.add('invalid');
      break;
    }
  }

  return isValid;
};

export const smythValidator = {
  validateInputs,
};
