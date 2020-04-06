const assert = require('assert')
const { prettify, logger, gb } = require('../shared')
const { random } = require('lodash')
const Subtract = require('./subtract')
const Addition = require('./addition')

class Scanner {
  constructor(cache, srcmap, ast) {
    this.srcmap = srcmap
    this.vuls = {
      subtract: new Subtract(cache, srcmap, ast),
      addition: new Addition(cache, srcmap, ast),
    }
  }

  scan() {
    let uncheckOperands = []
    for (const k in this.vuls) {
      uncheckOperands = [
        ...uncheckOperands,
        ...(this.vuls[k].scan() || [])
      ]
    }
    const bugFixes = this.generateBugFixes(uncheckOperands)
    this.fix(bugFixes)
  }

  fix({ bugFixes, source }) {
    for (const _ in bugFixes) {
      for (const key in bugFixes) {
        source = source.replace(key, bugFixes[key])
      }
    }
    console.log('--------')
    console.log(this.srcmap.source)
    console.log('++++++++')
    console.log(source)
  }

  generateBugFixes(pairs) {
    let source = this.srcmap.source
    const bugFixes = {}
    while (pairs.length) {
      for (const idx in pairs) {
        const outerRange = pairs[idx][1].range
        let containOtherRange = false 
        for (const pidx in pairs) {
          if (idx == pidx) continue
          const range = pairs[pidx][1].range
          if (outerRange[0] <= range[0] && range[1] <= outerRange[1]) {
            containOtherRange = true
            break
          }
        }
        if (!containOtherRange) {
          const [pc, { range, operands, type }] = pairs[idx]
          const func = type.toLowerCase()
          const ops = operands.map(({ range }) => source.slice(range[0], range[1])) 
          const check = `${func}(${ops.join(', ')})`
          const first = source.slice(0, range[0])
          const middle = source.slice(range[0], range[1])
          const last = source.slice(range[1])
          const key = Array(middle.length).fill(0).map(x => random(0, 9)).join('')
          source = [first, key, last].join('')
          bugFixes[key] = check
          pairs.splice(idx, 1)
        }
      }
    }
    return { bugFixes, source }
  }
} 

module.exports = { Scanner }
