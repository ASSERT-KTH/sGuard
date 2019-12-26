const fs = require('fs')
const path = require('path')
const Contract = require('../src/contract')
const { logger } = require('../src/shared')

const binFolder = path.join(__dirname, 'bin/')
const binFiles = fs.readdirSync(binFolder).sort()
// 0
const allowedContract = 3
binFiles.forEach((binFile, idx) => {
  if (idx != allowedContract) return
  logger.info(`binFile ${binFile}`)
  const bin = fs.readFileSync(path.join(binFolder, binFile), 'utf8')
  logger.info(`binLengh: ${bin.length}`)
  const contract = new Contract(Buffer.from(bin, 'hex'))
  contract.execute()
})
