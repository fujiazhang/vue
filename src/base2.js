import { h, init } from 'snabbdom'
import style from 'snabbdom/modules/style'
import eventlisteners from 'snabbdom/modules/eventlisteners'

let patch = init([style, eventlisteners])
let vnode = h('div', {
  style: {
    color: 'red'
  },
  on: {
    click: eventHandler
  }
}, [
  h('h1', '嗷嗷嗷嗷嗷嗷'),
  h('h2', '嗷嗷嗷嗷嗷嗷')
])

patch(document.querySelector('#app'), vnode)


function eventHandler() {
  console.log('点击啦')
}