/**
 * @description: 
 * 1.负责将data选项中属性转换成响应式数据
 * 2.data中的某个属性也是对象时，一样换成响应式数据
 * 3.数据变化时 发送通知
 * @param {type} 
 * @return {type} 
 */
class Observer {
  constructor(data) {
    this.walk(data)
  }
  /**
   * @description: //遍历对象所有属性
   * @param {type} 
   * @return {type} 
   */
  walk(data) {
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(key => {
        this.defineReactive(data, key, data[key])
      })
    }
  }

  /**
   * @description: 调用Object.defineProperty将属性转换成getter setter
   * @param {type} 
   * @return {type} 
   */
  defineReactive(obj, key, val) {
    this.walk(val) //如果obj[key]值是对象
    let _this = this
    let dep = new Dep()
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      get() {
        Dep.target && dep.addSub(Dep.target) //收集依赖
        return val
      },
      set(newValue) {
        if (newValue !== val) {
          _this.walk(newValue)
          val = newValue
          dep.notify() //发送通知
        }
      }
    })
  }
}