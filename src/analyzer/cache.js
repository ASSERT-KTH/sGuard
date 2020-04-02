const assert = require('assert')
const hash = require('object-hash')
const { prettify, findSymbol, formatSymbol } = require('../shared')
const { LocalVariable, StateVariable } = require('../variable')
const LocalAssignment = require('./assignment')

class Cache {
  constructor(condition, endPoints) {
    this.condition = condition
    this.endPoints = endPoints
    this.build()
  }

  controlLinks(epIndexes, subEp) {
    assert(epIndexes.length >= 0 && subEp)
    const links = new Set()
    epIndexes.forEach(epIndex => {
      const marker = { found: false, fullControl: [] }
      for (let i = epIndex; i >= 0; i--) {
        const { opcode: { name }, pc } = subEp.get(i)
        if (!marker.found) {
          marker.fullControl = this.condition.fullControls[pc] || []
          marker.found = marker.fullControl.length > 0
        }
        if (marker.fullControl.includes(pc)) {
          if (name == 'JUMPI') {
            links.add(i)
          } else {
            marker.fullControl = marker.fullControl.filter(x => pc!= x)
            assert(this.condition.fullControls[pc])
            marker.fullControl = [
              ...new Set([
                ...marker.fullControl,
                ...this.condition.fullControls[pc]
              ])
            ]
          }
        }
      }
    })
    return [...links] 
  }

  analyzeExp(symbol, trackingPos, endPoint, epIdx) {
    const workStack = [symbol]
    let mloads = []
    let sloads = []
    let links = []
    while (workStack.length) {
      const symbol = workStack.pop()
      switch (symbol[1]) {
        case 'MLOAD': {
          const subEpSize = symbol[5][1].toNumber()
          const subEp = endPoint.sub(subEpSize)
          const variable = new LocalVariable(symbol[2], subEp)
          mloads.push(variable)
          /// MLOAD Loc 
          const trackingPos = subEp.stack.size() - 1
          const epIdx = subEpSize - 1
          const t = this.analyzeExp(symbol[2], trackingPos, endPoint, epIdx)
          mloads = [...mloads, ...t.mloads]
          sloads = [...sloads, ...t.sloads]
          links = [...links, ...t.links]
          break
        }
        case 'SLOAD': {
          const subEpSize = symbol[4][1].toNumber()
          const subEp = endPoint.sub(subEpSize)
          const variable = new StateVariable(symbol[2], subEp)
          sloads.push(variable)
          /// SLOAD Loc
          const trackingPos = subEp.stack.size() - 1
          const epIdx = subEpSize - 1
          const t = this.analyzeExp(symbol[2], trackingPos, endPoint, epIdx)
          mloads = [...mloads, ...t.mloads]
          sloads = [...sloads, ...t.sloads]
          links = [...links, ...t.links]
          break
        }
        default: {
          const symbols = findSymbol(symbol, ([type, name]) => ['SLOAD', 'MLOAD'].includes(name))
          symbols.forEach(symbol => workStack.push(symbol))
          break
        }
      }
    }
    const subEp = endPoint.sub(epIdx + 1)
    const assignment = new LocalAssignment(subEp, trackingPos)
    const epIndexes = [...assignment.epIndexes, epIdx]
    links = new Set([...links, ...this.controlLinks(epIndexes, subEp)])
    return { mloads, sloads , links: [...links] }
  }

  build() {
    this.mem = { branches: [], mstores: [], sstores: [], calls: [] }
    this.endPoints.forEach((endPoint) => {
      const branch = {}
      const mstore = {}
      const sstore = {}
      const call = {}
      const { ep, trace } = endPoint
      trace.ts.forEach(({ t, epIdx, kTrackingPos, vTrackingPos }) => {
        const entries = {
          'MSTORE': [LocalVariable, mstore],
          'SSTORE': [StateVariable, sstore],
        }
        const [_, name, loc, value] = t
        if (entries[name]) {
          const [ Variable, store ] = entries[name]
          const storedKey = this.analyzeExp(loc, kTrackingPos, endPoint, epIdx)
          const storedValue = this.analyzeExp(value, vTrackingPos, endPoint, epIdx)
          const sloads = [...storedKey.sloads, ...storedValue.sloads]
          const mloads = [...storedKey.mloads, ...storedValue.mloads]
          const links = [...new Set([...storedKey.links, ...storedValue.links])]
          const subEp = endPoint.sub(epIdx + 1)
          const variable = new Variable(loc, subEp)
          const expression = ['symbol', name, loc, value]
          store[epIdx] = { key: variable, sloads, mloads, links, expression }
        }
      })

      ep.forEach(({ t, opcode: { name }, pc, stack }, epIdx) => {
        switch (name) {
          case 'JUMPI': {
            const trackingPos = stack.size() - 2
            const symbol = stack.get(trackingPos)
            const { mloads, sloads, links } = this.analyzeExp(symbol, trackingPos, endPoint, epIdx)
            branch[epIdx] = { mloads, sloads, links, expression: symbol }
            break
          }
          case 'CALL': {
            const sloads = []
            const mloads = []
            const links = []
            const entries = [stack.size() - 1, stack.size() - 2, stack.size() - 3]
              .map(trackingPos => ({ trackingPos, symbol: stack.get(trackingPos)}))
            const operands = []
            entries.forEach(({ trackingPos, symbol }) => {
              const t = this.analyzeExp(symbol, trackingPos, endPoint, epIdx)
              t.sloads.forEach(sload => sloads.push(sload))
              t.mloads.forEach(mload => mloads.push(mload))
              t.links.forEach(link => links.push(link))
              operands.push(symbol)
            })
            const expression = ['symbol', 'CALL', ...operands]
            call[epIdx] = { sloads, mloads, links: [...new Set(links)], expression }
            break
          }
        }
      })

      this.mem.branches.push(branch)
      this.mem.mstores.push(mstore)
      this.mem.sstores.push(sstore)
      this.mem.calls.push(call)
    })
  }
}

module.exports = Cache 