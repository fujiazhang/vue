/**
 * @description:
 * 1.负责编译模版，解析指令/差值表达式
 * 2.负责页面的首次渲染
 * 3.当数据变化后重新渲染视图
 * 未引入虚拟dom直接操作的实dom
 */
class Compiler {
  constructor(vm) {
    this.el = vm.$el
    this.vm = vm
    this.compile(this.el)
  }
  /**
   * @description: 编译模版，处理文本和元素节点
   */
  compile(el) {
    let childNodes = el.childNodes
    Array.from(childNodes).forEach(node => {
      if (this.isTextNode(node)) {
        this.compileText(node)
      } else if (this.isElement(node)) {
        this.compileElement(node)
      }
      //判断下是否还有字节点
      if (node.childNodes && node.childNodes.length) {
        this.compile(node)
      }
    })
  }
  /**
   * @description: 变异元素节点 处理指令
   */
  compileElement(node) {
    // console.log(node.attributes)
    Array.from(node.attributes).forEach(attr => {
      let attrName = attr.name
      if (this.isDirective(attrName)) {
        attrName = attrName.substr(2)
        let key = attr.value
        this.update(node, key, attrName)
      }
    })
  }

  update(node, key, attrName) {
    let updateFn = this[(attrName + 'Update')]
    updateFn && updateFn.call(this, node, this.vm[key], key)
  }
  /**
   * @description: 处理v-text
   */
  textUpdate(node, value, key) {
    node.textContent = value
    //创建watcher对象 数据改变更新试图
    new Watcher(this.vm, key, (newValue) => {
      node.textContent = newValue
    })
  }

  /**
   * @description: 处理v-model
   */
  modelUpdate(node, value, key) {
    node.value = value
    //创建watcher对象 数据改变更新试图
    new Watcher(this.vm, key, (newValue) => {
      node.value = newValue
    })
    // 双向绑定
    node.addEventListener('input', () => {
      this.vm[key] = node.value
    })
  }

  /**
   * @description: 编译文本节点，处理差值表达式
   */
  compileText(node) {
    let reg = /\{\{(.+?)\}\}/
    let value = node.textContent
    if (reg.test(value)) {
      let key = RegExp.$1.trim()
      node.textContent = value.replace(reg, this.vm[key])

      //创建watcher对象 数据改变更新试图
      new Watcher(this.vm, key, (newValue) => {
        node.textContent = newValue
      })
    }
  }
  /**
   * @description: 判断元素属性是否指令
   */
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }
  /**
   * @description: 判断节点是否是文本节点
   */
  isTextNode(node) {
    return node.nodeType === 3 //node接点属性3为本文 1为元素
  }
  /**
   * @description: 判断节点是否是元素节点
   */
  isElement(node) {
    return node.nodeType === 1 //node接点属性3为本文 1为元素
  }
}