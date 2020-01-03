const assert = require('assert')
const { prettify } = require('../shared')

class Stack {
  constructor() {
    this.st = []
  }

  withSt(st) {
    this.st = st
  }

  push(t) {
    this.st.push(t)
  }

  pop() {
    assert(this.st.length > 0)
    return this.st.pop()
  }

  popN(n) {
    assert(n > 0)
    assert(this.st.length >= n)
    return this.st.splice(-n).reverse()
  }

  swapN(n) {
    const target = this.st.length - 1 - n 
    const tmp = this.st[target]
    assert(target >= 0)
    this.st[target] = this.st[this.st.length - 1]
    this.st[this.st.length - 1] = tmp
  }

  dupN(n) {
    const target = this.st.length - n 
    assert(target >= 0)
    this.st.push(this.st[target])
  }

  clone() {
    const stack = new Stack()
    stack.withSt([...this.st])
    return stack
  }

  prettify(space = 0) {
    prettify(this.st, space)
  }

}

module.exports = Stack