let data = {
  msg: 'hello',
  num: 1,
  list: [1, 2, 3]
}
let vm = new Proxy(data, {
  get(target, key) {
    console.log('get,key', key, target[key])
    return target[key]
  },
  set(target, key, newValue) {
    console.log('set key', key, newValue)
    if (target[key] !== newValue) {
      target[key] = newValue
    }
    document.querySelector('#app').textContent = target[key]
  }
})
window.vm = vm