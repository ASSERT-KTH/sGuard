const assert = require('assert')
const chalk = require('chalk')
const { range } = require('lodash')
const {
  prettify,
  logger,
  formatSymbol,
} = require('../shared')

class DNode {
  constructor(symbol, pc, id) {
    assert(symbol && pc >= 0 && id)
    this.node = { id, me: symbol, pc, childs: [], alias: 'N/A', variable: null, parent: null }
  }

  addChild(child) {
    assert(child)
    this.node.childs.push(child)
  }

  addParent(parent) {
    assert(parent)
    this.node.parent = parent
  }

  findSloads() {
    const cond = (dnode) => {
      const { node: { me, childs } } = dnode
      return me[1] == 'SLOAD'
    }
    return this.traverse(cond)
  }

  traverse(cond) {
    assert(cond)
    const dnodes = []
    const stack = [this]
    while (stack.length > 0) {
      const dnode = stack.pop()
      if (cond(dnode)) dnodes.push(dnode)
      dnode.node.childs.forEach(dnode => stack.push(dnode))
    }
    return dnodes
  }

  prettify(level = 0, srcmap) {
    if (level == 0) {
      logger.debug(chalk.magenta.bold('>> Full DTREE'))
    }
    const { me, childs, alias, pc } = this.node
    const space = range(0, level).map(i => ' ').join('') || ''
    logger.debug(`${space}${formatSymbol(me)} ${chalk.green.bold(alias)}`)
    if (srcmap) {
      const { txt, line } = srcmap.toSrc(pc)
      const firstLine = txt.split("\n")[0]
      if (firstLine) {
        logger.debug(`${space}${chalk.dim.italic(`${line}:${pc}:${firstLine}`)}`)
      }
    }
    childs.forEach(child => {
      child.prettify(level + 1, srcmap)
    })
  }
}

module.exports = DNode 
