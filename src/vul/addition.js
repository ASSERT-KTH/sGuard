const assert = require('assert')
const { toPairs } = require('lodash')
const { 
  formatWithoutTrace: formatSymbol,
  findSymbols,
  findOperands
} = require('../shared')
const Tree = require('./tree')

class Addition {
  constructor(cache, srcmap, ast) {
    this.cache = cache
    this.srcmap = srcmap
    this.ast = ast
  }

  generateCheckPoints(dnode) {
    assert(dnode)
    const checkPoints = {}
    const { endPoints } = this.cache
    const { node: { me, endPointIdx } } = dnode
    const nodes = findSymbols(me, ([_, name]) => name == 'ADD')
    nodes.forEach(node => {
      const [left, right, epSize] = node.slice(2)
      if (left[1] == 'ISZERO' || right[1] == 'ISZERO') return
      const expression = formatSymbol(node)
      const epIdx = epSize[1].toNumber() - 1
      const endPoint = endPoints[endPointIdx]
      const { pc, opcode } = endPoint.get(epIdx)
      assert(opcode.name == 'ADD')
      const operands = findOperands(pc, this.srcmap, this.ast)
      operands.type = 'ADD'
      checkPoints[expression] = { pc, operands }
    })
    return checkPoints
  }

  findUncheckOperands(tree, endPoints) {
    assert(tree && endPoints)
    const uncheckOperands = {}
    const dnodes = tree.root.traverse(({ node: { me } }) => formatSymbol(me).includes('ADD('))
    dnodes.forEach(dnode => {
      const checkPoints = this.generateCheckPoints(dnode)
      for (const t in checkPoints) {
        const { operands, pc } = checkPoints[t]
        uncheckOperands[pc] = operands
      }
    })
    return uncheckOperands
  }

  scan() {
    const { mem: { calls }, endPoints } = this.cache
    const tree = new Tree(this.cache)
    calls.forEach((call, endPointIdx) => {
      toPairs(call).forEach(([epIdx, value]) => {
        tree.build(endPointIdx, epIdx, value)
      })
    })
    const uncheckOperands = this.findUncheckOperands(tree, endPoints)
    return toPairs(uncheckOperands)
  }
} 

module.exports = Addition