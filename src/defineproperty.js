
let data = {
  msg: 'msg'
}

let vm = {}

Object.defineProperty(vm, 'msg', {
  enumerable: true,
  configurable: true,
  get() {
    console.log('get')
    return data.msg
  },
  set(newValue) {
    console.log('set')
    if (newValue === data.msg)
      return
    data.msg = newValue
    document.querySelector('#app').textContent = data.msg
  }
})
vm.msg = 'hello'
window.vm = vm