const assert = require('assert')
const BN = require('bn.js')
const { uniqBy, forEach } = require('lodash')
const { Register } = require('../analyzer')
const { isConst, formatSymbol } = require('../shared')

class Dictionary {
  constructor(endPoints) {
    assert(endPoints)
    this.endPoints = endPoints
    this.props = {
      transfer: false,
      payable: true,
    }
    this.visited = []
    this.builds = {}
    this.findBuildById = {}
    this.prebuild()
  }

  toId(trackingPos, pc, cond) {
    assert(pc && cond && trackingPos >= 0)
    return `${trackingPos}:${pc}:${formatSymbol(cond)}`
  }

  addToBuild(key, { symbol, trackingPos, subEp, pc }) {
    if (!this.builds[key]) this.builds[key] = []
    const id = this.toId(trackingPos, pc, symbol)
    if (this.findBuildById[id]) {
      this.builds[key].push(this.findBuildById[id])
    } else {
      const register = new Register(symbol, trackingPos, subEp, this.endPoints)
      this.builds[key].push(register.dnode)
      this.findBuildById[id] = register.dnode
    }
  }


  prebuild() {
    this.endPoints.forEach(end => {
      const { ep } = end
      const flags = []
      ep.forEach(({ opcode: { name }, stack, pc }, idx) => {
        switch (name) {
          case 'CALL': {
            const subEp = end.sub(idx + 1)
            const isSend = this.isSend(stack.last())
            {
              const trackingPos = stack.size() - 3
              const symbol = stack.get(trackingPos)
              if (isConst(symbol) && symbol[1].isZero()) return
              this.addToBuild('CALL/VALUE', { symbol, trackingPos, subEp, pc })
              if (isSend) {
                this.addToBuild('SEND/VALUE', { symbol, trackingPos, subEp, pc })
              }
            }
            /// Send address
            {
              const trackingPos = stack.size() - 2
              const symbol = stack.get(trackingPos)
              this.addToBuild('CALL/ADDRESS', { symbol, trackingPos, subEp, pc })
              if (isSend) {
                this.addToBuild('SEND/ADDRESS', { symbol, trackingPos, subEp, pc })
              }
            }
            break
          }
          case 'DELEGATECALL': {
            const subEp = end.sub(idx + 1)
            /// Send address
            {
              const trackingPos = stack.size() - 2
              const symbol = stack.get(trackingPos)
              this.addToBuild('DELEGATECALL/ADDRESS', { symbol, trackingPos, subEp, pc })
            }
            break
          }
        }
        this.props.transfer = this.props.transfer || ['CALL', 'DELEGATECALL', 'CALLCODE'].includes(name)
        if (idx == 3) this.props.payable = this.props.payable && name == 'PUSH'
      })
    })
  }

  findBuilds(names) {
    assert(names && names.length > 0)
    return names.reduce((all, next) => {
      return [...all, ...(this.builds[next] || []) ]
    }, [])
  }

  isSend(gas) {
    assert(gas)
    switch (gas[0]) {
      case 'const': {
        return gas[1].eq(new BN(0x8fc)) || gas[1].isZero()
      }
      case 'symbol': {
        const [_, name, left, right] = gas
        if (name != 'MUL') return false
        if (right[0] != 'const') return false
        return right[1].eq(new BN(0x8fc))
      }
    }
  }

  treeSearch(stack, cond) {
    assert(stack && cond)
    const ret = []
    while (stack.length) {
      const dnode = stack.pop()
      const { node: { me, childs } } = dnode
      if (cond(me)) ret.push(dnode)
      childs.forEach(child => stack.push(child))
    }
    return uniqBy(ret, ({ node: { id }}) => id)
  }

}

module.exports = Dictionary 