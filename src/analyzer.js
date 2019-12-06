const assert = require('assert')
const { reverse, last, first } = require('lodash')
const {
  prettify,
  logger,
  isConstWithValue,
  isConst,
  isSymbol,
} = require('./shared')

const format = ([type, name, ...params]) => {
  if (type == 'const') return name.toString(16) 
  if (!params.length) return name
  return `${name}(${params.map(p => format(p)).join(',')})`
}

const equal = (s1, s2) => format(s1) == format(s2)

const find = (symbol, cond) => {
  const [type, name, ...params] = symbol
  if (cond(symbol)) return [symbol]
  return params.reduce(
    (agg, symbol) => [...agg, ...find(symbol, cond)],
    [],
  )
}

const traverse = (symbol, path = [], indexes = [0], paths = []) => {
  const [type, name, ...params] = symbol
  path.push(symbol)
  if (type == 'const') {
    paths.push({ path, indexes })
  } else {
    params.forEach((param, index) => {
      traverse(param, [...path], [...indexes, index], paths)
    })
  }
  return paths
}

const buildDependencyTree = (node, traces) => {
  const { me, childs } = node
  assert(!childs.length)
  switch (me[1]) {
    case 'MLOAD': {
      const [loadOffset, dataLen, traceSize] = me.slice(2)
      assert(isConst(traceSize))
      assert(isConst(dataLen))
      assert(!isConst(loadOffset))
      const arrayPaths = traverse(me) 
      console.log(`MATCHES: ${arrayPaths.length}`)
      arrayPaths.forEach(arrayPath => {
        console.log('----')
        prettify(arrayPath.path)
        console.log(arrayPath.indexes)
      })
      // const arrayMatches = exactMatch(me, 'MLOAD:0/ADD:1/MLOAD')
      // if (arrayMatches.length) {
        // const loadSignature = last(arrayMatches)
        // const [type, name, ...loadParams] = loadSignature
        // assert(isConstWithValue(loadParams[0], 0x40))
        // assert(isConstWithValue(loadParams[1], 0x20))
        // assert(isConst(loadParams[2]))
        // const validTraces = reverse(traces.slice(0, traceSize[1].toNumber()))
        // validTraces.forEach((trace, idx) => {
          // const arrayMatches = exactMatch(trace, 'MSTORE:0/ADD:1/MLOAD')
          // if (arrayMatches.length) {
            // const storeSignature = last(arrayMatches)
            // if (equal(loadSignature, storeSignature)) {
              // const [type, name, storeOffset, value] = trace
              // const newNode = { me: value, childs: [] }
              // buildDependencyTree(newNode, traces)
              // childs.push(newNode)
            // }
          // }
        // })
      // }
      break
    }
    case 'SLOAD': {
      const [loadOffset, traceSize] = me.slice(2)
      assert(isConst(traceSize))
      if (isConst(loadOffset)) {
        /*
         * For static address, storage location is statically assigned
         * We can not deconstruct variable location
         * Example:
         * uint[10] balances;
         * uint[10] photos;
         * {
         *   balances[0] = block.number;
         *   photos[0] = block.timestamp;
         *   msg.sender.send(balances[9] + photos[9]);
         * }
         * We can not distinguish between photos and balances. However a variable is primitive type
         * or indexAccess of load and store is the same then we can detect
         * */
        const validTraces = reverse(traces.slice(0, traceSize[1].toNumber()))
        for (let i = 0; i < validTraces.length; i ++) {
          const trace = validTraces[i]
          const [type, name, ...params] = trace
          if (name == 'SSTORE') {
            const [storeOffset, value, traceSize] = params
            if (isConst(storeOffset)) {
              if (storeOffset[1].toNumber() == loadOffset[1].toNumber()) {
                const newNode = { me: value, childs: [] }
                buildDependencyTree(newNode, traces)
                childs.push(newNode)
              }
            }
          }
        }
      } else {
      }
      break
    }
    default: {
      const symbols = find(me, ([type, name]) => ['SLOAD', 'MLOAD'].includes(name))
      symbols.forEach(symbol => {
        const newNode = { me: symbol, childs: [] }
        buildDependencyTree(newNode, traces)
        childs.push(newNode)
      })
    }
  }
}

const prettifyTree = (root, level = 0) => {
  const { me, childs } = root
  prettify([me], level * 2)
  childs.forEach(child => {
    prettifyTree(child, level + 1)
  })
}

const analyze = (symbol, traces) => {
  prettify(traces)
  console.log('>>>>')
  prettify([symbol])
  console.log('<<<<')
  const [type, name, ...params] = symbol 
  switch (type) {
    case 'const': {
      logger.info(`No dependency since wei is ${JSON.stringify(symbol)}`)
      break
    }
    case 'symbol': {
      const foundSymbols = find(symbol, ([type, name]) => type == 'symbol' && name == 'NUMBER')
      if (foundSymbols.length > 0) {
        logger.info(`Number dependency since wei is ${JSON.stringify(symbol)}`)
      } else {
        const root = { me: symbol, childs: [] }
        buildDependencyTree(root, traces)
        console.log('////TREE')
        prettifyTree(root)
      }
      break
    }
  }
}

module.exports = {
  analyze,
} 
