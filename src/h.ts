import { vnode, VNode, VNodeData } from './vnode';
export type VNodes = Array<VNode>;
export type VNodeChildElement = VNode | string | number | undefined | null;
export type ArrayOrElement<T> = T | T[];
export type VNodeChildren = ArrayOrElement<VNodeChildElement>
import * as is from './is';

//一个辅助函数 增加命名空间
function addNS(data: any, children: VNodes | undefined, sel: string | undefined): void {
  data.ns = 'http://www.w3.org/2000/svg';
  if (sel !== 'foreignObject' && children !== undefined) {
    for (let i = 0; i < children.length; ++i) {
      let childData = children[i].data;
      if (childData !== undefined) {
        addNS(childData, (children[i] as VNode).children as VNodes, children[i].sel);
      }
    }
  }
}

// h函数的重载
export function h(sel: string): VNode;
export function h(sel: string, data: VNodeData): VNode;
export function h(sel: string, children: VNodeChildren): VNode;
export function h(sel: string, data: VNodeData, children: VNodeChildren): VNode;
export function h(sel: any, b?: any, c?: any): VNode { //我才是真正的实现
  var data: VNodeData = {}, children: any, text: any, i: number;
  if (c !== undefined) { // 处理参数，实现重载机制 //三个参数的情况
    data = b;
    if (is.array(c)) { children = c; }  //如果c是数组 将c保存到children中
    else if (is.primitive(c)) { text = c; } //如果c不是数组 是原始值（字符串或者数字）将c保存到text
    else if (c && c.sel) { children = [c]; } //如果c是vnode
  } else if (b !== undefined) {    //两个参数的情况
    if (is.array(b)) { children = b; }
    else if (is.primitive(b)) { text = b; }
    else if (b && b.sel) { children = [b]; }
    else { data = b; }
  }
  if (children !== undefined) {  //处理children中的原始值
    for (i = 0; i < children.length; ++i) { //如果child是 string/number ，创建文本节点
      if (is.primitive(children[i])) children[i] = vnode(undefined, undefined, undefined, children[i], undefined);//vnode函数创建vnode节点（文本节点）
    }
  }
  if (    //如果是svg 会做一个特殊处理 增加命名空间
    sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g' &&
    (sel.length === 3 || sel[3] === '.' || sel[3] === '#')
  ) {
    addNS(data, children, sel);
  }
  return vnode(sel, data, children, text, undefined); //返回vnode
};
export default h;
