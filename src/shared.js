const assert = require('assert')
const winston = require('winston')
const { range } = require('lodash')

const { createLogger, format, transports } = winston
const { combine, timestamp, label, printf, prettyPrint } = format

const formatSymbol = ([type, name, ...params]) => {
  if (type == 'const') return name.toString(16) 
  if (!params.length) return name
  return `${name}(${params.map(p => formatSymbol(p)).join(',')})`
}

const findSymbol = (symbol, cond) => {
  const [type, name, ...params] = symbol
  if (cond(symbol)) return [symbol]
  return params.reduce(
    (agg, symbol) => [...agg, ...findSymbol(symbol, cond)],
    [],
  )
}


const prettify = (values, spaceLen = 0) => {
  const space = range(0, spaceLen).map(i => ' ').join('') || ''
  values.forEach((v, idx) => console.log(`0x${idx.toString(16)} || ${space}${formatSymbol(v)}`))
}

const prettifyPath = (path) => {
  path.forEach(({ pc, opcode }) => {
    console.log(`${Number(pc).toString(16)}\t${opcode.name}`)
  })
}
/*
 * Initialize logger 
 * */
const logger = createLogger({
  format: combine(
    format.colorize(),
    label({ label: 'symEvm' }),
    timestamp(),
    printf(({ level, message, timestamp, label }) => {
      return `${timestamp} [${label}] ${level}: ${message}`
    }),
  ),
  transports: [
    new (winston.transports.Console)({ level: 'debug' }),
  ]
})
/*
 * + Is const 
 * + value equal to ...
 * */
const isConst = symbol => symbol[0] == 'const'
const isSymbol = symbol => symbol[0] == 'symbol'
const isConsts = symbols => symbols.reduce((agg, symbol) => agg && isSymbol(symbol), true) 
const isConstWithValue = (symbol, value) => symbol[0] == 'const' && symbol[1].toNumber() == value


module.exports = {
  isConstWithValue,
  logger,
  prettify,
  formatSymbol,
  isSymbol,
  isConsts,
  isConst,
  isConstWithValue,
  findSymbol,
  prettifyPath,
}
