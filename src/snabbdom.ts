/* global module, document, Node */
import { Module } from './modules/module';
import { Hooks } from './hooks';
import vnode, { VNode, VNodeData, Key } from './vnode';
import * as is from './is';
import htmlDomApi, { DOMAPI } from './htmldomapi';

function isUndef(s: any): boolean { return s === undefined; }
function isDef(s: any): boolean { return s !== undefined; }

type VNodeQueue = Array<VNode>;

const emptyNode = vnode('', {}, [], undefined, undefined);

function sameVnode(vnode1: VNode, vnode2: VNode): boolean {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

function isVnode(vnode: any): vnode is VNode {
  return vnode.sel !== undefined;
}

type KeyToIndexMap = { [key: string]: number };

type ArraysOf<T> = {
  [K in keyof T]: (T[K])[];
}

type ModuleHooks = ArraysOf<Module>;

function createKeyToOldIdx(children: Array<VNode>, beginIdx: number, endIdx: number): KeyToIndexMap {
  let i: number, map: KeyToIndexMap = {}, key: Key | undefined, ch;
  for (i = beginIdx; i <= endIdx; ++i) {
    ch = children[i];
    if (ch != null) {
      key = ch.key;
      if (key !== undefined) map[key] = i;
    }
  }
  return map;
}

const hooks: (keyof Module)[] = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

export { h } from './h';
export { thunk } from './thunk';

export function init(modules: Array<Partial<Module>>, domApi?: DOMAPI) {
  let i: number, j: number, cbs = ({} as ModuleHooks);

  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      const hook = modules[j][hooks[i]];
      if (hook !== undefined) {
        (cbs[hooks[i]] as Array<any>).push(hook);
      }
    }
  }

  function emptyNodeAt(elm: Element) {
    const id = elm.id ? '#' + elm.id : '';
    const c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
    return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
  }

  function createRmCb(childElm: Node, listeners: number) {
    return function rmCb() {
      if (--listeners === 0) {
        const parent = api.parentNode(childElm);
        api.removeChild(parent, childElm);
      }
    };
  }

  function createElm(vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
    let i: any, data = vnode.data;
    if (data !== undefined) {
      //执行用户设置的init钩子
      if (isDef(i = data.hook) && isDef(i = i.init)) {
        i(vnode);
        data = vnode.data;
      }
    }
    //vnode转换成真实DOM（未插入页面）
    let children = vnode.children, sel = vnode.sel;
    if (sel === '!') {
      if (isUndef(vnode.text)) {
        vnode.text = '';
      }
      vnode.elm = api.createComment(vnode.text as string);//创建注释节点
    } else if (sel !== undefined) {
      // Parse selector
      const hashIdx = sel.indexOf('#');
      const dotIdx = sel.indexOf('.', hashIdx);
      const hash = hashIdx > 0 ? hashIdx : sel.length;
      const dot = dotIdx > 0 ? dotIdx : sel.length;
      const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      const elm = vnode.elm = isDef(data) && isDef(i = (data as VNodeData).ns) ? api.createElementNS(i, tag)
        : api.createElement(tag);// data是否定义 data.ns存在命名空间（创建带有命名空间的标签 （svg））
      if (hash < dot) elm.setAttribute('id', sel.slice(hash + 1, dot)); //设置id属性
      if (dotIdx > 0) elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '));//设置class属性
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode); //执行create钩子函数
      if (is.array(children)) { //存在子节点 
        for (i = 0; i < children.length; ++i) { //遍历子节点数组
          const ch = children[i];
          if (ch != null) { //不为空的话，递归调用返回vnode，并追加到elm中
            api.appendChild(elm, createElm(ch as VNode, insertedVnodeQueue));
          }
        }
      } else if (is.primitive(vnode.text)) {
        api.appendChild(elm, api.createTextNode(vnode.text));
      }
      i = (vnode.data as VNodeData).hook; // Reuse variable
      if (isDef(i)) {
        if (i.create) i.create(emptyNode, vnode);
        if (i.insert) insertedVnodeQueue.push(vnode);
      }
    } else {
      vnode.elm = api.createTextNode(vnode.text as string); //sel为空 创建文本节点
    }
    return vnode.elm;//返回新创建的 DOM
  }

  function addVnodes(parentElm: Node,
    before: Node | null,
    vnodes: Array<VNode>,
    startIdx: number,
    endIdx: number,
    insertedVnodeQueue: VNodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx];
      if (ch != null) {
        api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
      }
    }
  }

  function invokeDestroyHook(vnode: VNode) {
    let i: any, j: number, data = vnode.data;
    if (data !== undefined) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode);
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
      if (vnode.children !== undefined) {
        for (j = 0; j < vnode.children.length; ++j) {
          i = vnode.children[j];
          if (i != null && typeof i !== "string") {
            invokeDestroyHook(i);
          }
        }
      }
    }
  }

  function removeVnodes(parentElm: Node,
    vnodes: Array<VNode>,
    startIdx: number,
    endIdx: number): void {
    for (; startIdx <= endIdx; ++startIdx) {
      let i: any, listeners: number, rm: () => void, ch = vnodes[startIdx];
      if (ch != null) {
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch);
          listeners = cbs.remove.length + 1;
          rm = createRmCb(ch.elm as Node, listeners);
          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
            i(ch, rm);
          } else {
            rm();
          }
        } else { // Text node
          api.removeChild(parentElm, ch.elm as Node);
        }
      }
    }
  }

  function updateChildren(parentElm: Node, oldCh: Array<VNode>, newCh: Array<VNode>, insertedVnodeQueue: VNodeQueue) {
    let oldStartIdx = 0,
      newStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    let newEndIdx = newCh.length - 1;
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];
    let oldKeyToIdx: any;
    let idxInOld: number;
    let elmToMove: VNode;
    let before: any;

    // 遍历 oldCh newCh，对节点进行比较和更新
    // 每轮比较最多处理一个节点，算法复杂度 O(n)
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      // 如果进行比较的 4 个节点中存在空节点，为空的节点下标向中间推进，继续下个循环
      if (oldStartVnode == null) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
      } else if (oldEndVnode == null) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (newStartVnode == null) {
        newStartVnode = newCh[++newStartIdx];
      } else if (newEndVnode == null) {
        newEndVnode = newCh[--newEndIdx];
        // 新旧开始节点相同，直接调用 patchVnode 进行更新，下标向中间推进
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
        // 新旧结束节点相同，逻辑同上
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
        // 旧开始节点等于新的节点节点，说明节点向右移动了，调用 patchVnode 进行更新
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        // 旧开始节点等于新的结束节点，说明节点向右移动了
        // 具体移动到哪，因为新节点处于末尾，所以添加到旧结束节点（会随着 updateChildren 左移）的后面
        // 注意这里需要移动 dom，因为节点右移了，而为什么是插入 oldEndVnode 的后面呢？
        // 可以分为两个情况来理解：
        // 1. 当循环刚开始，下标都还没有移动，那移动到 oldEndVnode 的后面就相当于是最后面，是合理的
        // 2. 循环已经执行过一部分了，因为每次比较结束后，下标都会向中间靠拢，而且每次都会处理一个节点,
        // 这时下标左右两边已经处理完成，可以把下标开始到结束区域当成是并未开始循环的一个整体，
        // 所以插入到 oldEndVnode 后面是合理的（在当前循环来说，也相当于是最后面，同 1）
        api.insertBefore(parentElm, oldStartVnode.elm as Node, api.nextSibling(oldEndVnode.elm as Node));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
        // 旧的结束节点等于新的开始节点，说明节点是向左移动了，逻辑同上
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm as Node, oldStartVnode.elm as Node);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
        // 如果以上 4 种情况都不匹配，可能存在下面 2 种情况
        // 1. 这个节点是新创建的
        // 2. 这个节点在原来的位置是处于中间的（oldStartIdx 和 endStartIdx之间）
      } else {
        // 如果 oldKeyToIdx 不存在，创建 key 到 index 的映射
        // 而且也存在各种细微的优化，只会创建一次，并且已经完成的部分不需要映射
        if (oldKeyToIdx === undefined) {
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        }
        // 拿到在 oldCh 下对应的下标
        idxInOld = oldKeyToIdx[newStartVnode.key as string];
        // 如果下标不存在，说明这个节点是新创建的
        if (isUndef(idxInOld)) {
          // New element
          // 插入到 oldStartVnode 的前面（对于当前循环来说，相当于最前面）
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm as Node);
          newStartVnode = newCh[++newStartIdx];
        } else {
          // 如果是已经存在的节点 找到需要移动位置的节点
          elmToMove = oldCh[idxInOld];
          // 虽然 key 相同了，但是 seletor 不相同，需要调用 createElm 来创建新的 dom 节点
          if (elmToMove.sel !== newStartVnode.sel) {
            api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm as Node);
          } else {
            // 否则调用 patchVnode 对旧 vnode 做更新
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
            // 在 oldCh 中将当前已经处理的 vnode 置空，等下次循环到这个下标的时候直接跳过
            oldCh[idxInOld] = undefined as any;
            // 插入到 oldStartVnode 的前面（对于当前循环来说，相当于最前面）
            api.insertBefore(parentElm, elmToMove.elm as Node, oldStartVnode.elm as Node);
          }
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    // 循环结束后，可能会存在两种情况
    // 1. oldCh 已经全部处理完成，而 newCh 还有新的节点，需要对剩下的每个项都创建新的 dom
    if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
      if (oldStartIdx > oldEndIdx) {
        before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
        addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
        // 2. newCh 已经全部处理完成，而 oldCh 还有旧的节点，需要将多余的节点移除
      } else {
        removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
      }
    }
  }


  function patchVnode(oldVnode: VNode, vnode: VNode, insertedVnodeQueue: VNodeQueue) {
    let i: any, hook: any;
    if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {  // 调用 prepatch hook
      i(oldVnode, vnode);
    }
    const elm = vnode.elm = (oldVnode.elm as Node);
    let oldCh = oldVnode.children;
    let ch = vnode.children;
    if (oldVnode === vnode) return;
    if (vnode.data !== undefined) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);// 调用 module 上的 update hook
      i = vnode.data.hook;
      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode);     // 调用用户设置的 update hook
    }//至此之上 执行钩子函数
    if (isUndef(vnode.text)) { //如过vnode.text未定义
      if (isDef(oldCh) && isDef(ch)) { // 使用diff算法对比子节点，更新子节点
        if (oldCh !== ch) updateChildren(elm, oldCh as Array<VNode>, ch as Array<VNode>, insertedVnodeQueue);
      } else if (isDef(ch)) { //假如新节点存在
        if (isDef(oldVnode.text)) api.setTextContent(elm, ''); //存在新节点 且有text 清空
        addVnodes(elm, null, ch as Array<VNode>, 0, (ch as Array<VNode>).length - 1, insertedVnodeQueue); //批量加子节点
      } else if (isDef(oldCh)) { //只有新节点存在，移除掉
        removeVnodes(elm, oldCh as Array<VNode>, 0, (oldCh as Array<VNode>).length - 1);
      } else if (isDef(oldVnode.text)) {   //老节点存在text 清空
        api.setTextContent(elm, '');
      }
    } else if (oldVnode.text !== vnode.text) {
      if (isDef(oldCh)) {
        removeVnodes(elm, oldCh as Array<VNode>, 0, (oldCh as Array<VNode>).length - 1);
      }
      api.setTextContent(elm, vnode.text as string);
    }
    if (isDef(hook) && isDef(i = hook.postpatch)) {
      i(oldVnode, vnode);
    }
  }

  return function patch(oldVnode: VNode | Element, vnode: VNode): VNode { // 1.init内部返回patch函数 2.vnode=>真实dom 3.返回vnode
    let i: number, elm: Node, parent: Node;
    const insertedVnodeQueue: VNodeQueue = []; //保存新插入节点数组，为了触发钩子函数
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i](); //触发模块的pre钩子函数

    if (!isVnode(oldVnode)) {  //如果oldNode不是VNode 创建Vnode
      oldVnode = emptyNodeAt(oldVnode); //把DOM元素转换成空的VNode
    }

    if (sameVnode(oldVnode, vnode)) { // 如果是相同节点（key和sel相同）
      patchVnode(oldVnode, vnode, insertedVnodeQueue); //找节点差异 并更新dom
    } else {         //不同，vnode创建对应的DOM
      elm = oldVnode.elm as Node;  // 当前DOM
      parent = api.parentNode(elm); // 当前DOM parent

      createElm(vnode, insertedVnodeQueue); // 创建vnode对应的DOM元素，并触发init/create钩子

      if (parent !== null) {
        api.insertBefore(parent, vnode.elm as Node, api.nextSibling(elm));//插入真实DOM
        removeVnodes(parent, [oldVnode], 0, 0); //移除老DOM
      }
    }

    for (i = 0; i < insertedVnodeQueue.length; ++i) {  //触发用户设置的insert钩子函数
      (((insertedVnodeQueue[i].data as VNodeData).hook as Hooks).insert as any)(insertedVnodeQueue[i]);
    }
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i](); //触发模块post钩子函数
    return vnode;
  };
}
