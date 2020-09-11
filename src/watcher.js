/**
 * @description:
 * 1.当数据变化出发依赖，dep通知所有的watcher实例更新视图
 * 2.自身实例化的时候往dep中添加自己
 */
class Watcher {
  constructor(vm, key, cb) {
    this.vm = vm
    this.key = key //data中属性名称
    this.cb = cb //回调负责更新视图

    //当前watcher对象记录到Dep类的静态熟悉target
    Dep.target = this
    //触发get方法，在get方法中会回调addSub
    this.oldValue = vm[key]
    Dep.target = null
  }
  /**
   * @description: 数据变化时 更新视图
   */
  update() {
    let newValue = this.vm[this.key]
    if (newValue === this.oldValue) {
      return
    }
    this.cb(newValue)
  }
}