import { h, init } from "snabbdom";

//1. hello word 
/**
 * @description: 
 * @param {type} [模块]
 * @return {type} patch函数，用于对比两个vnode的差异更新到real dom
 */
let patch = init([])
/**
 * @description: 
 * @param {type} 1.标签+选择器 2.如是字符串就是标签中的内容
 * @return {type} 
 */
let vnode = h('div#color.red', 'helloword')
let app = document.querySelector('#app')
/**
 * @description: patch
 * @param {type} patch第一个参数，可以是DOM元素，内部会自动转换为vnode,第二个参数 VNode
 * @return {type} VNode
 */
let oldVnode = patch(app, vnode)
//假设
setTimeout(() => {
  let vnode1 = h('div', 'chifanle')
  let vnode2 = patch(oldVnode, vnode1)
  setTimeout(() => {
    patch(vnode2, h('!'))
  }, 2000);
}, 2000)
//2. div