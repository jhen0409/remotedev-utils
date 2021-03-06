import getParams from 'get-params';
import jsan from 'jsan';
import shortid from 'shortid';

export function generateId(id) {
  return id || shortid.generate();
}

function flatTree(obj, namespace = '') {
  let functions = [];
  Object.keys(obj).forEach(key => {
    const prop = obj[key];
    if (typeof prop === 'function') {
      functions.push({
        name: namespace + (key || prop.name || 'anonymous'),
        func: prop,
        args: getParams(prop),
      });
    } else if (typeof prop === 'object') {
      functions = functions.concat(flatTree(prop, namespace + key + '.'));
    }
  });
  return functions;
}

export function getMethods(obj) {
  if (typeof obj !== 'object') return undefined;
  let functions;
  let m;
  if (obj.__proto__) m = obj.__proto__.__proto__;
  if (!m) m = obj;

  Object.getOwnPropertyNames(m).forEach(key => {
    const prop = m[key];
    if (typeof prop === 'function' && key !== 'constructor') {
      if (!functions) functions = [];
      functions.push({
        name: key || prop.name || 'anonymous',
        args: getParams(prop),
      });
    }
  });
  return functions;
}

export function getActionsArray(actionCreators) {
  if (Array.isArray(actionCreators)) return actionCreators;
  return flatTree(actionCreators);
}

/* eslint-disable no-new-func */
const interpretArg = (arg) => (new Function('return ' + arg))();

function evalArgs(inArgs, restArgs) {
  const args = inArgs.map(interpretArg);
  if (!restArgs) return args;
  const rest = interpretArg(restArgs);
  if (Array.isArray(rest)) return args.concat(...rest);
  throw new Error('rest must be an array');
}

export function evalAction(action, actionCreators) {
  if (typeof action === 'string') {
    return (new Function('return ' + action))();
  }

  const actionCreator = actionCreators[action.selected].func;
  const args = evalArgs(action.args, action.rest);
  return actionCreator(...args);
}

export function evalMethod(action, obj) {
  if (typeof action === 'string') {
    return (new Function('return ' + action)).call(obj);
  }

  const args = evalArgs(action.args, action.rest);
  return (new Function('args', `return this.${action.name}(args)`)).apply(obj, args);
}
/* eslint-enable */

function tryCatchStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch (err) {
    /* eslint-disable no-console */
    if (process.env.NODE_ENV !== 'production') console.log('Failed to stringify', err);
    /* eslint-enable no-console */
    return jsan.stringify(obj, null, null, { circular: '[CIRCULAR]' });
  }
}

export function stringify(obj, serialize) {
  if (typeof serialize === 'undefined') {
    return tryCatchStringify(obj);
  }
  if (serialize === true) {
    return jsan.stringify(obj, function (key, value) {
      if (value && typeof value.toJS === 'function') return value.toJS();
      return value;
    }, null, true);
  }
  return jsan.stringify(obj, serialize.replacer, null, serialize.options);
}
